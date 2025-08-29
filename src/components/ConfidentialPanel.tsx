import React, { useState, useEffect } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { useWallet } from "./WalletConnection"; // Adjust path as needed
import { stringToHex, bnToU8a, hexToBn } from "@polkadot/util";
import { BN } from "bn.js";
import * as snarkjs from "snarkjs"; // Adjusted import for snarkjs
import { usePolkadot } from "@/hooks/use-polkadot";
import localforage from 'localforage'; // For storing notes securely
import { buildPoseidon } from 'circomlibjs'; // Build Poseidon hash for browser

const ConfidentialPanel: React.FC = () => {
  const { selectedAccount } = useWallet();
  const { api: polkadotApi, forceReconnect, status } = usePolkadot();

  const [poseidon, setPoseidon] = useState<((inputs: bigint[]) => bigint) | null>(null);

  useEffect(() => {
    // Initialize Poseidon once for hashing in the browser
    buildPoseidon().then(setPoseidon).catch((err) => {
      console.error('Failed to initialize Poseidon:', err);
    });
  }, []);

  useEffect(() => {
    if (["error", "disconnected"].includes(status)) {
      const timer = setTimeout(() => forceReconnect(), 30000);
      return () => clearTimeout(timer);
    }
  }, [status, forceReconnect]);

  const [api, setApi] = useState<ApiPromise | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState<{ amount: string; nonce: string; commitment: string; leafIndex: number }[]>([]);
  const [state, setState] = useState({
    activeTab: 'deposit',
    deposit: { amount: "" },
    withdraw: { noteIndex: null as number | null, amount: "", recipient: "" },
    transact: {
      fromNote1: null as number | null,
      fromNote2: null as number | null,
      toAmount1: "",
      toRecipient1: "",
      toAmount2: "",
    },
    loading: false,
    error: null as string | null,
    events: [] as string[],
  });

  useEffect(() => {
    const connect = async () => {
      if (!polkadotApi) return;
      try {
        const wsProvider = new WsProvider("wss://xorion-chain-rpc.example.com"); // Replace with actual endpoint
        const apiInstance = await ApiPromise.create({ provider: wsProvider });
        setApi(apiInstance);
        const merkleRootValue = await apiInstance.query.confidentialTransactions.merkleRoot();
        setMerkleRoot(merkleRootValue.toHex());

        // Load notes from local storage
        const storedNotes = await localforage.getItem<{ amount: string; nonce: string; commitment: string; leafIndex: number }[]>('privateNotes');
        if (storedNotes) setUserNotes(storedNotes);

        // Event subscription
        apiInstance.query.system.events((events: any) => {
          events.forEach((record: any) => {
            const { event } = record;
            if (apiInstance.events.confidentialTransactions.Deposit.is(event)) {
              const [who, amount, leafIndex] = event.data;
              setState((prev) => ({
                ...prev,
                events: [...prev.events, `Deposited ${amount} by ${who} at leaf ${leafIndex}`],
              }));
            } else if (apiInstance.events.confidentialTransactions.Withdraw.is(event)) {
              const [who, amount] = event.data;
              setState((prev) => ({
                ...prev,
                events: [...prev.events, `Withdrawn ${amount} by ${who}`],
              }));
            } else if (apiInstance.events.confidentialTransactions.TransactionSuccess.is(event)) {
              setState((prev) => ({
                ...prev,
                events: [...prev.events, "Private transfer successful"],
              }));
            }
          });
        });
      } catch (err) {
        setState((prev) => ({ ...prev, error: `Connection failed: ${err}` }));
      }
    };
    connect();
  }, [polkadotApi]);

  const saveNote = async (note: { amount: string; nonce: string; commitment: string; leafIndex: number }) => {
    const notes = [...userNotes, note];
    setUserNotes(notes);
    await localforage.setItem('privateNotes', notes);
  };

  const generateNonce = () => {
    const nonceBuffer = new Uint8Array(32);
    window.crypto.getRandomValues(nonceBuffer); // Browser-compatible
    return Array.from(nonceBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const generateDepositProof = async () => {
    const { amount } = state.deposit;
    if (!amount || !selectedAccount) throw new Error("Amount and selected account required");

    const nonce = generateNonce();

    const amountBn = hexToBn(amount);
    const recipientBn = hexToBn(selectedAccount.address.startsWith('0x') ? selectedAccount.address : `0x${selectedAccount.address}`);
    const nonceBn = hexToBn(nonce);
    if (!poseidon) throw new Error("Poseidon not initialized");
    const commitmentBigInt = poseidon([
      BigInt(amountBn.toString()),
      BigInt(recipientBn.toString()),
      BigInt(nonceBn.toString()),
    ]);
    const commitment = `0x${commitmentBigInt.toString(16).padStart(64, '0')}`;

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      { amount: amountBn.toString(), recipient: recipientBn.toString(), nonce: nonceBn.toString() },
      "/public/circuits/deposit.wasm",
      "/public/keys/deposit_0001.zkey"
    );
    const proofData = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const proofBytes = proofData.split(",")[0].trim();

    return { proofBytes, commitment, nonce };
  };

  const handleDeposit = async () => {
    if (!api || !selectedAccount || !merkleRoot) {
      setState((prev) => ({ ...prev, error: "Not connected or account not selected" }));
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { proofBytes, commitment, nonce } = await generateDepositProof();
      const amountBN = new BN(state.deposit.amount);
      const amountBytes = bnToU8a(amountBN, { bitLength: 128, isLe: false });
      const publicInputs = [amountBytes, stringToHex(commitment)];

      const tx = api.tx.confidentialTransactions.deposit(proofBytes, publicInputs, amountBN);
      await tx.signAndSend(selectedAccount.address, (result: any) => {
        if (result.status.isInBlock) {
          // Extract leafIndex from events
          const depositEvent = result.events.find((e: any) => e.event.method === 'Deposit');
          const leafIndex = depositEvent ? depositEvent.event.data[2].toNumber() : null;
          if (leafIndex !== null) {
            saveNote({ amount: state.deposit.amount, nonce, commitment, leafIndex });
          }
          setState((prev) => ({
            ...prev,
            events: [...prev.events, `Deposited in block ${result.status.asInBlock}`],
            loading: false,
          }));
        }
      });
    } catch (err) {
      setState((prev) => ({ ...prev, error: `Deposit failed: ${err}`, loading: false }));
    }
  };

  const fetchMerklePath = async (leafIndex: number) => {
    if (!api) return [];
    const path = [];
    let index = leafIndex;
    const depth = 32; // Assume TreeDepth::get() is 32; query if possible
    for (let d = depth; d > 0; d--) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      const sibling = await api.query.confidentialTransactions.treeNodes([d, siblingIndex]);
      path.push(sibling.toHex());
      index = Math.floor(index / 2);
    }
    return path;
  };

  const generateWithdrawProof = async () => {
    const { noteIndex, amount, recipient } = state.withdraw;
    if (noteIndex === null) throw new Error("Select a note");
    const note = userNotes[noteIndex];
    if (!note) throw new Error("Invalid note");

    const nonceBn = hexToBn(note.nonce);
    if (!poseidon) throw new Error("Poseidon not initialized");
    const nullifierBigInt = poseidon([BigInt(nonceBn.toString())]);
    const nullifier = `0x${nullifierBigInt.toString(16).padStart(64, '0')}`;
    const path = await fetchMerklePath(note.leafIndex);

    const amountBn = hexToBn(amount);
    const recipientBn = hexToBn(recipient.startsWith('0x') ? recipient : `0x${recipient}`);
    const fee = 0; // Assuming no fee for now

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      {
        merkleRoot,
        nullifier: nullifierBn.toString(),
        recipient: recipientBn.toString(),
        amount: amountBn.toString(),
        fee: fee.toString(),
        path,
        nonce: nonceBn.toString(),
        commitment: hexToBn(note.commitment).toString(),
      },
      "/public/circuits/transfer.wasm",
      "/public/keys/transfer_0001.zkey"
    );
    const proofData = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const proofBytes = proofData.split(",")[0].trim();

    return { proofBytes, nullifier };
  };

  const handleWithdraw = async () => {
    if (!api || !selectedAccount || !merkleRoot) {
      setState((prev) => ({ ...prev, error: "Not connected or account not selected" }));
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { proofBytes, nullifier } = await generateWithdrawProof();
      const amountBN = new BN(state.withdraw.amount);
      const amountBytes = bnToU8a(amountBN, { bitLength: 128, isLe: false });
      const feeBytes = bnToU8a(new BN(0), { bitLength: 128, isLe: false });
      const recipientHash = stringToHex(state.withdraw.recipient); // Assume hash is recipient itself for simplicity; adjust
      const publicInputs = [
        stringToHex(merkleRoot),
        stringToHex(nullifier),
        recipientHash,
        amountBytes,
        feeBytes,
      ];

      const tx = api.tx.confidentialTransactions.withdraw(
        proofBytes,
        publicInputs,
        state.withdraw.recipient,
        amountBN
      );
      await tx.signAndSend(selectedAccount.address, (result: any) => {
        if (result.status.isInBlock) {
          // Remove spent note
          const newNotes = userNotes.filter((_, i) => i !== state.withdraw.noteIndex);
          setUserNotes(newNotes);
          localforage.setItem('privateNotes', newNotes);
          setState((prev) => ({
            ...prev,
            events: [...prev.events, `Withdrawn in block ${result.status.asInBlock}`],
            loading: false,
          }));
        }
      });
    } catch (err) {
      setState((prev) => ({ ...prev, error: `Withdraw failed: ${err}`, loading: false }));
    }
  };

  const generateTransactProof = async () => {
    const { fromNote1, fromNote2, toAmount1, toRecipient1, toAmount2 } = state.transact;
    if (fromNote1 === null || fromNote2 === null) throw new Error("Select two notes");

    const note1 = userNotes[fromNote1];
    const note2 = userNotes[fromNote2];

    if (!poseidon) throw new Error("Poseidon not initialized");
    const nullifier1BigInt = poseidon([BigInt(hexToBn(note1.nonce).toString())]);
    const nullifier2BigInt = poseidon([BigInt(hexToBn(note2.nonce).toString())]);
    const nullifier1 = `0x${nullifier1BigInt.toString(16).padStart(64, '0')}`;
    const nullifier2 = `0x${nullifier2BigInt.toString(16).padStart(64, '0')}`;

    // Generate new nonces and commitments for outputs
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();

    const toAmount1Bn = hexToBn(toAmount1);
    const toRecipient1Bn = hexToBn(toRecipient1.startsWith('0x') ? toRecipient1 : `0x${toRecipient1}`);
    const commitment1BigInt = poseidon([
      BigInt(toAmount1Bn.toString()),
      BigInt(toRecipient1Bn.toString()),
      BigInt(hexToBn(nonce1).toString())
    ]);
    const commitment1 = `0x${commitment1BigInt.toString(16).padStart(64, '0')}`;

    const toAmount2Bn = hexToBn(toAmount2);
    const toRecipient2Bn = hexToBn(selectedAccount.address.startsWith('0x') ? selectedAccount.address : `0x${selectedAccount.address}`);
    const commitment2BigInt = poseidon([
      BigInt(toAmount2Bn.toString()),
      BigInt(toRecipient2Bn.toString()),
      BigInt(hexToBn(nonce2).toString())
    ]);
    const commitment2 = `0x${commitment2BigInt.toString(16).padStart(64, '0')}`;

    const path1 = await fetchMerklePath(note1.leafIndex);
    const path2 = await fetchMerklePath(note2.leafIndex);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      {
        merkleRoot,
        nullifier1: nullifier1Bn.toString(),
        nullifier2: nullifier2Bn.toString(),
        commitment1: commitment1Bn.toString(),
        commitment2: commitment2Bn.toString(),
        path1,
        path2,
        nonce1: hexToBn(note1.nonce).toString(),
        nonce2: hexToBn(note2.nonce).toString(),
        // Add other inputs as per circuit (e.g., balances conservation private)
      },
      "/public/circuits/transfer.wasm",
      "/public/keys/transfer_0001.zkey"
    );
    const proofData = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const proofBytes = proofData.split(",")[0].trim();

    return { proofBytes, nullifier1, nullifier2, commitment1, commitment2, newNonce1: nonce1, newNonce2: nonce2, newAmount1: toAmount1, newRecipient1: toRecipient1, newAmount2: toAmount2 };
  };

  const handleTransact = async () => {
    if (!api || !selectedAccount || !merkleRoot) {
      setState((prev) => ({ ...prev, error: "Not connected or account not selected" }));
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { proofBytes, nullifier1, nullifier2, commitment1, commitment2, newNonce1, newNonce2, newAmount1, newAmount2 } = await generateTransactProof();
      const publicInputs = [
        stringToHex(merkleRoot),
        stringToHex(nullifier1),
        stringToHex(nullifier2),
        stringToHex(commitment1),
        stringToHex(commitment2),
      ];

      const tx = api.tx.confidentialTransactions.transact(proofBytes, publicInputs);
      await tx.signAndSend(selectedAccount.address, (result: any) => {
        if (result.status.isInBlock) {
          // Remove spent notes, add new ones (leaf indices from events or query next_leaf_index)
          // For simplicity, assume we query or estimate new leaf indices
          const newNotes = userNotes.filter((_, i) => i !== state.transact.fromNote1 && i !== state.transact.fromNote2);
          // Placeholder for new leaf indices - in real, subscribe to events or query
          const newLeaf1 = userNotes.length + 1; // Fake; replace with real
          const newLeaf2 = newLeaf1 + 1;
          newNotes.push({ amount: newAmount1, nonce: newNonce1, commitment: commitment1, leafIndex: newLeaf1 });
          newNotes.push({ amount: newAmount2, nonce: newNonce2, commitment: commitment2, leafIndex: newLeaf2 });
          setUserNotes(newNotes);
          localforage.setItem('privateNotes', newNotes);
          setState((prev) => ({
            ...prev,
            events: [...prev.events, `Transacted in block ${result.status.asInBlock}`],
            loading: false,
          }));
        }
      });
    } catch (err) {
      setState((prev) => ({ ...prev, error: `Transact failed: ${err}`, loading: false }));
    }
  };

  const setActiveTab = (tab: string) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="flex space-x-4 mb-4">
        <button onClick={() => setActiveTab('deposit')} className={`py-2 px-4 ${state.activeTab === 'deposit' ? 'bg-blue-600' : 'bg-gray-700'}`}>Deposit</button>
        <button onClick={() => setActiveTab('withdraw')} className={`py-2 px-4 ${state.activeTab === 'withdraw' ? 'bg-blue-600' : 'bg-gray-700'}`}>Withdraw</button>
        <button onClick={() => setActiveTab('transact')} className={`py-2 px-4 ${state.activeTab === 'transact' ? 'bg-blue-600' : 'bg-gray-700'}`}>Transfer</button>
        <button onClick={() => setActiveTab('notes')} className={`py-2 px-4 ${state.activeTab === 'notes' ? 'bg-blue-600' : 'bg-gray-700'}`}>My Notes</button>
      </div>

      {state.activeTab === 'deposit' && (
        <div className="space-y-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold">Deposit Tokens Privately</h2>
          <p className="text-sm text-gray-400">Convert public tokens to private ones. You'll get a note to store securely.</p>
          <div>
            <label className="block text-sm text-gray-300">Amount to Deposit:</label>
            <input
              type="number"
              value={state.deposit.amount}
              onChange={(e) => setState((prev) => ({ ...prev, deposit: { ...prev.deposit, amount: e.target.value } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Enter amount"
            />
          </div>
          <button
            onClick={handleDeposit}
            disabled={state.loading || !selectedAccount}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {state.loading ? "Depositing..." : "Deposit"}
          </button>
        </div>
      )}

      {state.activeTab === 'withdraw' && (
        <div className="space-y-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold">Withdraw Tokens</h2>
          <p className="text-sm text-gray-400">Spend a private note to withdraw to a public address.</p>
          <div>
            <label className="block text-sm text-gray-300">Select Note to Spend:</label>
            <select
              value={state.withdraw.noteIndex ?? ''}
              onChange={(e) => setState((prev) => ({ ...prev, withdraw: { ...prev.withdraw, noteIndex: parseInt(e.target.value) || null } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
            >
              <option value="">Select Note</option>
              {userNotes.map((note, i) => (
                <option key={i} value={i}>Note {i + 1}: {note.amount} tokens</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300">Amount to Withdraw:</label>
            <input
              type="number"
              value={state.withdraw.amount}
              onChange={(e) => setState((prev) => ({ ...prev, withdraw: { ...prev.withdraw, amount: e.target.value } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">Public Recipient Address:</label>
            <input
              type="text"
              value={state.withdraw.recipient}
              onChange={(e) => setState((prev) => ({ ...prev, withdraw: { ...prev.withdraw, recipient: e.target.value } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xRecipientAddress"
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={state.loading || !selectedAccount || state.withdraw.noteIndex === null}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {state.loading ? "Withdrawing..." : "Withdraw"}
          </button>
        </div>
      )}

      {state.activeTab === 'transact' && (
        <div className="space-y-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold">Private Transfer</h2>
          <p className="text-sm text-gray-300">Transfer privately between notes.</p>
          <div>
            <label className="block text-sm text-gray-300">From Note 1:</label>
            <select
              value={state.transact.fromNote1 ?? ''}
              onChange={(e) => setState((prev) => ({ ...prev, transact: { ...prev.transact, fromNote1: parseInt(e.target.value) || null } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
            >
              <option value="">Select Note</option>
              {userNotes.map((note, i) => (
                <option key={i} value={i}>Note {i + 1}: {note.amount} tokens</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300">From Note 2:</label>
            <select
              value={state.transact.fromNote2 ?? ''}
              onChange={(e) => setState((prev) => ({ ...prev, transact: { ...prev.transact, fromNote2: parseInt(e.target.value) || null } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
            >
              <option value="">Select Note</option>
              {userNotes.map((note, i) => (
                <option key={i} value={i}>Note {i + 1}: {note.amount} tokens</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300">To Amount 1:</label>
            <input
              type="number"
              value={state.transact.toAmount1}
              onChange={(e) => setState((prev) => ({ ...prev, transact: { ...prev.transact, toAmount1: e.target.value } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">To Recipient 1 (private address):</label>
            <input
              type="text"
              value={state.transact.toRecipient1}
              onChange={(e) => setState((prev) => ({ ...prev, transact: { ...prev.transact, toRecipient1: e.target.value } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xRecipient1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">To Amount 2 (change):</label>
            <input
              type="number"
              value={state.transact.toAmount2}
              onChange={(e) => setState((prev) => ({ ...prev, transact: { ...prev.transact, toAmount2: e.target.value } }))}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Enter amount"
            />
          </div>
          <button
            onClick={handleTransact}
            disabled={state.loading || !selectedAccount || state.transact.fromNote1 === null || state.transact.fromNote2 === null}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {state.loading ? "Transacting..." : "Transfer"}
          </button>
        </div>
      )}

      {state.activeTab === 'notes' && (
        <div className="space-y-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold">My Private Notes</h2>
          <p className="text-sm text-gray-400">These are your shielded funds. Backup regularly!</p>
          <ul className="space-y-2">
            {userNotes.map((note, i) => (
              <li key={i} className="p-2 bg-gray-700 rounded">
                <div>Amount: {note.amount} tokens</div>
                <div>Commitment: {note.commitment.slice(0, 10)}...</div>
                <div>Leaf Index: {note.leafIndex}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(note))}
                  className="text-blue-400 hover:underline"
                >
                  Copy Note
                </button>
              </li>
            ))}
          </ul>
          {userNotes.length === 0 && <p>No notes yet. Make a deposit to create one.</p>}
          <p className="text-red-400 text-sm">Warning: Losing these notes means losing access to your funds. Export and store securely.</p>
        </div>
      )}

      <div className="mt-4 text-sm">
        <h3 className="text-lg font-semibold">Recent Events</h3>
        <ul className="space-y-1">
          {state.events.map((event, idx) => (
            <li key={idx} className="text-gray-300">{event}</li>
          ))}
        </ul>
      </div>

      {state.error && <p className="text-red-400 text-sm mt-4">{state.error}</p>}

      <div className="flex justify-center mt-4">
        <span className="text-gray-400">© Xorion</span>
      </div>
    </div>
  );
};

export default ConfidentialPanel;