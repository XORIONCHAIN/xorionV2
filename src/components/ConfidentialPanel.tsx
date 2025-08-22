import React, { useState, useEffect } from "react";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { useWallet } from "./WalletConnection"; // Adjust path as needed
import { stringToHex, bnToU8a } from "@polkadot/util";
import { BN } from "bn.js";
import * as snarkjs from "snarkjs"; // Adjusted import for snarkjs
import { usePolkadot } from "@/hooks/use-polkadot";

const ConfidentialPanel: React.FC = () => {
  const { selectedAccount } = useWallet();
  const { api: polkadotApi, forceReconnect, status } = usePolkadot();
  useEffect(() => {
    if (["error", "disconnected"].includes(status)) {
      const timer = setTimeout(() => forceReconnect(), 30000);
      return () => clearTimeout(timer);
    }
  }, [status, forceReconnect]);
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [state, setState] = useState({
    deposit: {
      amount: "",
      ethereumRecipient: "",
      nonce: "",
      proofBytes: "",
    },
    withdraw: {
      amount: "",
      recipient: "",
      nullifierHash: "",
      recipientHash: "",
      proofBytes: "",
    },
    transact: {
      nullifier1: "",
      nullifier2: "",
      commitment1: "",
      commitment2: "",
      proofBytes: "",
    },
    merkleRoot: null,
    loading: false,
    error: null,
    events: [] as string[],
  });

  useEffect(() => {
    const connect = async () => {
      if (!polkadotApi) return;
      try {
        const wsProvider = new WsProvider("wss://xorion-chain-rpc.example.com"); // Replace with actual endpoint
        const apiInstance = await ApiPromise.create({ provider: wsProvider });
        setApi(apiInstance);
        const merkleRoot =
          await apiInstance.query.confidentialTransactions.merkleRoot();
        setState((prev) => ({ ...prev, merkleRoot: merkleRoot.toHex() }));
        apiInstance.query.system.events((events: any) => {
          events.forEach((record: any) => {
            const { event } = record;
            if (apiInstance.events.confidentialTransactions.Deposit.is(event)) {
              const [who, amount, leafIndex] = event.data;
              setState((prev) => ({
                ...prev,
                events: [
                  ...prev.events,
                  `Deposited ${amount} by ${who} at leaf ${leafIndex}`,
                ],
              }));
            } else if (
              apiInstance.events.confidentialTransactions.Withdraw.is(event)
            ) {
              const [who, amount] = event.data;
              setState((prev) => ({
                ...prev,
                events: [...prev.events, `Withdrawn ${amount} by ${who}`],
              }));
            } else if (
              apiInstance.events.confidentialTransactions.TransactionSuccess.is(
                event
              )
            ) {
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

  const generateDepositProof = async () => {
    if (!state.deposit.amount || !state.deposit.ethereumRecipient) return "";
    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
          amount: state.deposit.amount,
          recipient: state.deposit.ethereumRecipient,
          nonce: state.deposit.nonce || "0",
        },
        "/public/circuits/deposit.wasm", // Use actual path
        "/public/keys/deposit_0001.zkey" // Use actual path
      );
      const proofData = await snarkjs.groth16.exportSolidityCallData(
        proof,
        publicSignals
      );
      const [proofBytes] = proofData.split(","); // Extract first part as proof bytes
      return proofBytes.trim();
    } catch (err) {
      setState((prev) => ({ ...prev, error: `Deposit proof failed: ${err}` }));
      return "";
    }
  };

  const generateTransferProof = async (inputs: any) => {
    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        "/public/circuits/transfer.wasm", // Use actual path
        "/public/keys/transfer_0001.zkey" // Use actual path
      );
      const proofData = await snarkjs.groth16.exportSolidityCallData(
        proof,
        publicSignals
      );
      const [proofBytes] = proofData.split(","); // Extract first part as proof bytes
      return proofBytes.trim();
    } catch (err) {
      setState((prev) => ({ ...prev, error: `Transfer proof failed: ${err}` }));
      return "";
    }
  };

  const handleLockTokens = async () => {
    if (!api || !selectedAccount || !state.merkleRoot) {
      setState((prev) => ({
        ...prev,
        error: "Not connected or account not selected",
      }));
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const proofBytes = await generateDepositProof();
      if (!proofBytes) throw new Error("Proof generation failed");
      const amountBN = new BN(state.deposit.amount);
      const amountBytes = bnToU8a(amountBN, { bitLength: 128, isLe: false });
      const commitmentHash = stringToHex(
        `0x${state.deposit.ethereumRecipient.slice(2)}${state.deposit.nonce}`
      );
      const publicInputs = [amountBytes, commitmentHash];

      const tx = api.tx.confidentialTransactions.deposit(
        proofBytes,
        publicInputs,
        amountBN
      );
      await tx.signAndSend(selectedAccount.address, (result: any) => {
        if (result.status.isInBlock) {
          setState((prev) => ({
            ...prev,
            events: [
              ...prev.events,
              `Locked in block ${result.status.asInBlock}`,
            ],
            loading: false,
          }));
        }
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Lock failed: ${err}`,
        loading: false,
      }));
    }
  };

  const handleWithdraw = async () => {
    if (!api || !selectedAccount || !state.merkleRoot) {
      setState((prev) => ({
        ...prev,
        error: "Not connected or account not selected",
      }));
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const proofBytes = await generateTransferProof({
        merkleRoot: state.merkleRoot,
        nullifierHash: state.withdraw.nullifierHash,
        recipient: state.withdraw.recipient,
        amount: state.withdraw.amount,
      });
      if (!proofBytes) throw new Error("Proof generation failed");
      const amountBN = new BN(state.withdraw.amount);
      const amountBytes = bnToU8a(amountBN, { bitLength: 128, isLe: false });
      const publicInputs = [
        stringToHex(state.merkleRoot),
        stringToHex(state.withdraw.nullifierHash),
        stringToHex(state.withdraw.recipientHash || state.withdraw.recipient), // Simplified, adjust if needed
        amountBytes,
      ];

      const tx = api.tx.confidentialTransactions.withdraw(
        proofBytes,
        publicInputs,
        state.withdraw.recipient,
        amountBN
      );
      await tx.signAndSend(selectedAccount.address, (result: any) => {
        if (result.status.isInBlock) {
          setState((prev) => ({
            ...prev,
            events: [
              ...prev.events,
              `Withdrawn in block ${result.status.asInBlock}`,
            ],
            loading: false,
          }));
        }
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Withdraw failed: ${err}`,
        loading: false,
      }));
    }
  };

  const handleTransact = async () => {
    if (!api || !selectedAccount || !state.merkleRoot) {
      setState((prev) => ({
        ...prev,
        error: "Not connected or account not selected",
      }));
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const proofBytes = await generateTransferProof({
        merkleRoot: state.merkleRoot,
        nullifier1: state.transact.nullifier1,
        nullifier2: state.transact.nullifier2,
        commitment1: state.transact.commitment1,
        commitment2: state.transact.commitment2,
      });
      if (!proofBytes) throw new Error("Proof generation failed");
      const publicInputs = [
        stringToHex(state.merkleRoot),
        stringToHex(state.transact.nullifier1),
        stringToHex(state.transact.nullifier2),
        stringToHex(state.transact.commitment1),
        stringToHex(state.transact.commitment2),
      ];

      const tx = api.tx.confidentialTransactions.transact(
        proofBytes,
        publicInputs
      );
      await tx.signAndSend(selectedAccount.address, (result: any) => {
        if (result.status.isInBlock) {
          setState((prev) => ({
            ...prev,
            events: [
              ...prev.events,
              `Transacted in block ${result.status.asInBlock}`,
            ],
            loading: false,
          }));
        }
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Transact failed: ${err}`,
        loading: false,
      }));
    }
  };

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Confidential Transactions
        </h1>

        {/* Deposit (Lock Tokens) Section */}
        <div className="space-y-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold">Lock Tokens</h2>
          <div>
            <label className="block text-sm text-gray-300">
              Selected Account:
            </label>
            <input
              type="text"
              value={selectedAccount?.meta.name || "Not Connected"}
              readOnly
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">
              Amount to Lock:
            </label>
            <input
              type="number"
              value={state.deposit.amount}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  deposit: { ...prev.deposit, amount: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">
              Ethereum Recipient (0x...):
            </label>
            <input
              type="text"
              value={state.deposit.ethereumRecipient}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  deposit: {
                    ...prev.deposit,
                    ethereumRecipient: e.target.value,
                  },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xRecipientAddress"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">Nonce:</label>
            <input
              type="text"
              value={state.deposit.nonce}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  deposit: { ...prev.deposit, nonce: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Enter nonce"
            />
          </div>
          <button
            onClick={handleLockTokens}
            disabled={state.loading || !selectedAccount}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {state.loading ? "Locking..." : "Lock Tokens"}
          </button>
        </div>

        {/* Withdraw Section */}
        <div className="space-y-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold">Withdraw Tokens</h2>
          <div>
            <label className="block text-sm text-gray-300">Amount:</label>
            <input
              type="number"
              value={state.withdraw.amount}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  withdraw: { ...prev.withdraw, amount: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">Recipient:</label>
            <input
              type="text"
              value={state.withdraw.recipient}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  withdraw: { ...prev.withdraw, recipient: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Enter recipient address"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">
              Nullifier Hash (0x...):
            </label>
            <input
              type="text"
              value={state.withdraw.nullifierHash}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  withdraw: { ...prev.withdraw, nullifierHash: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xNullifierHash"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">
              Recipient Hash (0x...):
            </label>
            <input
              type="text"
              value={state.withdraw.recipientHash}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  withdraw: { ...prev.withdraw, recipientHash: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xRecipientHash"
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={state.loading || !selectedAccount}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {state.loading ? "Withdrawing..." : "Withdraw"}
          </button>
        </div>

        {/* Transact Section */}
        <div className="space-y-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold">Private Transfer</h2>
          <div>
            <label className="block text-sm text-gray-300">
              Nullifier 1 (0x...):
            </label>
            <input
              type="text"
              value={state.transact.nullifier1}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  transact: { ...prev.transact, nullifier1: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xNullifier1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">
              Nullifier 2 (0x...):
            </label>
            <input
              type="text"
              value={state.transact.nullifier2}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  transact: { ...prev.transact, nullifier2: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xNullifier2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">
              Commitment 1 (0x...):
            </label>
            <input
              type="text"
              value={state.transact.commitment1}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  transact: { ...prev.transact, commitment1: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xCommitment1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">
              Commitment 2 (0x...):
            </label>
            <input
              type="text"
              value={state.transact.commitment2}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  transact: { ...prev.transact, commitment2: e.target.value },
                }))
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="0xCommitment2"
            />
          </div>
          <button
            onClick={handleTransact}
            disabled={state.loading || !selectedAccount}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {state.loading ? "Transacting..." : "Transact"}
          </button>
        </div>

        <div className="mt-4 text-sm">
          <ul>
            {state.events.map((event, idx) => (
              <li key={idx}>{event}</li>
            ))}
          </ul>
        </div>
        <div className="flex justify-center mt-4">
          <span className="text-gray-400">© Xorion</span>
        </div>
        {state.error && (
          <p className="text-red-400 text-sm mt-4">{state.error}</p>
        )}
      </div>
    </div>
  );
};

export default ConfidentialPanel;
