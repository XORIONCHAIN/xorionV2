import { useState, useEffect, Suspense, useRef } from 'react';
import { usePolkadotStore } from '@/stores/polkadotStore';
import { useWallet } from '@/components/WalletConnection'; // Adjust path
import { web3FromSource } from '@polkadot/extension-dapp';
import { ApiPromise } from '@polkadot/api';
import { BN, u8aToHex, hexToU8a } from '@polkadot/util';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FaSpinner, FaShieldAlt } from 'react-icons/fa';
import * as snarkjs from 'snarkjs'; // npm install snarkjs
import CryptoJS from 'crypto-js'; // npm install crypto-js

// Placeholder paths; replace with your actual artifacts
import depositWasm from '@/assets/zk/deposit.wasm';
import depositZkey from '@/assets/zk/deposit.zkey';
import transferWasm from '@/assets/zk/transfer.wasm';
import transferZkey from '@/assets/zk/transfer.zkey';

const NOTE_STORAGE_KEY = 'confidential_notes';
const ENCRYPTION_SALT = 'xorion-zk-salt'; // Fixed salt; in prod, make dynamic per user

const ConfidentialPanel = () => {
  const { api } = usePolkadotStore();
  const { selectedAccount } = useWallet();
  const { toast } = useToast();
  const [mode, setMode] = useState<'deposit' | 'withdraw' | 'transact'>('deposit');
  const [merkleRoot, setMerkleRoot] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [fee, setFee] = useState('0');
  const [nullifier, setNullifier] = useState('');
  const [commitment, setCommitment] = useState('');
  const [nullifier2, setNullifier2] = useState('');
  const [commitment2, setCommitment2] = useState('');
  const [proof, setProof] = useState<string>('');
  const [publicInputs, setPublicInputs] = useState<Uint8Array[]>([]);
  const [loadingProof, setLoadingProof] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);
  const [notes, setNotes] = useState<any[]>([]); // Encrypted notes
  const [selectedNoteIndex, setSelectedNoteIndex] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // Derive encryption key from wallet address (prod: use signed message)
  const getEncryptionKey = () => {
    if (!selectedAccount) return null;
    return CryptoJS.SHA256(selectedAccount.address + ENCRYPTION_SALT).toString();
  };

  // Load/decrypt notes
  useEffect(() => {
    const key = getEncryptionKey();
    if (key) {
      const stored = localStorage.getItem(NOTE_STORAGE_KEY);
      if (stored) {
        try {
          const decrypted = CryptoJS.AES.decrypt(stored, key).toString(CryptoJS.enc.Utf8);
          setNotes(JSON.parse(decrypted));
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to decrypt notes. Wrong wallet?', variant: 'destructive' });
          setNotes([]);
        }
      }
    }
  }, [selectedAccount, toast]);

  // Save/encrypt notes
  const saveNotes = (newNotes: any[]) => {
    const key = getEncryptionKey();
    if (key) {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(newNotes), key).toString();
      localStorage.setItem(NOTE_STORAGE_KEY, encrypted);
      setNotes(newNotes);
    }
  };

  // Query Merkle root
  useEffect(() => {
    const fetchRoot = async () => {
      if (api) {
        try {
          const root = await api.query.confidentialTransactions.merkleRoot();
          setMerkleRoot(root.toHex());
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to fetch Merkle root', variant: 'destructive' });
        }
      }
    };
    fetchRoot();
  }, [api, toast]);

  // Event subscription
  useEffect(() => {
    if (!api) return;
    const unsub = api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;
        if (api.events.confidentialTransactions.Deposit.is(event)) {
          // Example: Add new note after deposit (compute off-chain)
          const newNote = { /* from event or prover: nullifier, commitment, amount */ };
          saveNotes([...notes, newNote]);
          toast({ title: 'Deposit Success', description: `Deposited ${event.data[1]} by ${event.data[0]}` });
        } else if (api.events.confidentialTransactions.Withdraw.is(event)) {
          toast({ title: 'Withdraw Success', description: `Withdrew ${event.data[1]} to ${event.data[0]}` });
        } else if (api.events.confidentialTransactions.TransactionSuccess.is(event)) {
          toast({ title: 'Transact Success', description: 'Private transfer completed' });
        }
      });
    });
    return () => { unsub.then(u => u()).catch(() => {}); };
  }, [api, toast, notes]);

  // Setup Web Worker for proof gen
  useEffect(() => {
    workerRef.current = new Worker(URL.createObjectURL(new Blob([`
      self.onmessage = async (e) => {
        const { mode, inputs, wasmPath, zkeyPath } = e.data;
        importScripts('https://unpkg.com/snarkjs@latest'); // Load snarkjs in worker
        try {
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
          self.postMessage({ proof, publicSignals });
        } catch (error) {
          self.postMessage({ error: error.message });
        }
      };
    `], { type: 'application/javascript' })));
    return () => workerRef.current?.terminate();
  }, []);

  const validateInputs = () => {
    if (!amount || new BN(amount).lte(new BN(0))) return 'Invalid amount';
    if (mode === 'withdraw' && !recipient) return 'Recipient required';
    if (mode !== 'deposit' && !nullifier?.startsWith('0x')) return 'Invalid nullifier';
    // Add more validations (e.g., hex length 32 bytes)
    return null;
  };

  const generateProof = async () => {
    const error = validateInputs();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }
    if (!merkleRoot || !selectedAccount) {
      toast({ title: 'Error', description: 'Connect wallet and fetch Merkle root', variant: 'destructive' });
      return;
    }
    setLoadingProof(true);
    toast({ title: 'Proof Generation Started', description: 'This may take 10-60 seconds. Do not refresh.' });

    const inputs = { /* Circuit-specific private inputs; e.g., randomness, note secrets, Merkle path */ };
    // Placeholder: Compute based on mode (use your circuit's expected inputs)

    try {
      if (workerRef.current) {
        const wasmPath = mode === 'deposit' ? depositWasm : transferWasm;
        const zkeyPath = mode === 'deposit' ? depositZkey : transferZkey;
        const { proof: grothProof, publicSignals, error: workerError } = await new Promise((resolve) => {
          workerRef.current.onmessage = (e) => resolve(e.data);
          workerRef.current.postMessage({ mode, inputs, wasmPath, zkeyPath });
        });
        if (workerError) throw new Error(workerError);

        // Serialize proof (Groth16: pi_a, pi_b, pi_c)
        const proofBytes = u8aToHex(Uint8Array.from([...grothProof.pi_a, ...grothProof.pi_b.flat(), ...grothProof.pi_c].flat()));
        setProof(proofBytes);

        // Construct publicInputs (convert to Uint8Array)
        let pubInputs: Uint8Array[] = [];
        const amountBN = new BN(amount);
        const amountBytes = new Uint8Array(amountBN.toArray('be', 16));
        if (mode === 'deposit') {
          const commitmentBytes = hexToU8a(commitment); // Assume user provides or compute
          pubInputs = [amountBytes, commitmentBytes];
        } else if (mode === 'withdraw') {
          const feeBytes = new Uint8Array(new BN(fee).toArray('be', 16));
          const rootBytes = hexToU8a(merkleRoot);
          const nullifierBytes = hexToU8a(nullifier);
          const recipientHash = hexToU8a(/* hash recipient address */); // Use polkadot util-crypto
          pubInputs = [rootBytes, nullifierBytes, recipientHash, amountBytes, feeBytes];
        } else if (mode === 'transact') {
          const rootBytes = hexToU8a(merkleRoot);
          const null1 = hexToU8a(nullifier);
          const null2 = hexToU8a(nullifier2);
          const comm1 = hexToU8a(commitment);
          const comm2 = hexToU8a(commitment2);
          pubInputs = [rootBytes, null1, null2, comm1, comm2];
        }
        setPublicInputs(pubInputs);

        toast({ title: 'Proof Generated', description: 'Ready to submit' });
      } else {
        throw new Error('Web Worker not available');
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Proof Failed', description: error.message || 'Unknown error', variant: 'destructive' });
    }
    setLoadingProof(false);
  };

  const submitTransaction = async () => {
    setConfirmOpen(false);
    setLoadingTx(true);
    try {
      const injector = await web3FromSource(selectedAccount.meta.source);
      let tx;
      switch (mode) {
        case 'deposit':
          tx = api.tx.confidentialTransactions.deposit(proof, publicInputs, amount);
          break;
        case 'withdraw':
          tx = api.tx.confidentialTransactions.withdraw(proof, publicInputs, recipient, amount);
          break;
        case 'transact':
          tx = api.tx.confidentialTransactions.transact(proof, publicInputs);
          break;
      }
      await tx.signAndSend(selectedAccount.address, { signer: injector.signer }, ({ status, dispatchError }) => {
        if (dispatchError) {
          throw new Error(dispatchError.toString());
        }
        if (status.isInBlock) {
          toast({ title: 'Success', description: 'Transaction in block' });
          // Update notes: e.g., remove spent notes
          if (mode !== 'deposit') {
            const updatedNotes = notes.filter((_, i) => i !== parseInt(selectedNoteIndex));
            saveNotes(updatedNotes);
          }
          // Reset form
          setAmount('');
          setRecipient('');
          setNullifier('');
          setCommitment('');
          setNullifier2('');
          setCommitment2('');
          setProof('');
          setPublicInputs([]);
        }
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
    }
    setLoadingTx(false);
  };

  const handleNoteSelect = (index: string) => {
    setSelectedNoteIndex(index);
    const note = notes[parseInt(index)];
    setNullifier(note.nullifier);
    setCommitment(note.commitment);
    setAmount(note.amount);
    // For transact, handle second note if needed
  };

  return (
    <div className="glass-card p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center"><FaShieldAlt className="mr-2" /> Confidential Transactions</h2>
      <div className="flex space-x-4 mb-6">
        <Button onClick={() => setMode('deposit')} variant={mode === 'deposit' ? 'default' : 'outline'}>Deposit</Button>
        <Button onClick={() => setMode('withdraw')} variant={mode === 'withdraw' ? 'default' : 'outline'}>Withdraw</Button>
        <Button onClick={() => setMode('transact')} variant={mode === 'transact' ? 'default' : 'outline'}>Transact</Button>
      </div>
      <form className="space-y-4">
        <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {mode === 'withdraw' && <Input placeholder="Recipient Address" value={recipient} onChange={(e) => setRecipient(e.target.value)} />}
        {mode === 'withdraw' && <Input type="number" placeholder="Fee" value={fee} onChange={(e) => setFee(e.target.value)} />}
        {mode !== 'deposit' && <Input placeholder="Nullifier (0x...)" value={nullifier} onChange={(e) => setNullifier(e.target.value)} />}
        {mode === 'transact' && <Input placeholder="Nullifier 2 (0x...)" value={nullifier2} onChange={(e) => setNullifier2(e.target.value)} />}
        {mode !== 'withdraw' && <Input placeholder="Commitment (0x...)" value={commitment} onChange={(e) => setCommitment(e.target.value)} />}
        {mode === 'transact' && <Input placeholder="Commitment 2 (0x...)" value={commitment2} onChange={(e) => setCommitment2(e.target.value)} />}
        {mode !== 'deposit' && notes.length > 0 && (
          <Select value={selectedNoteIndex} onValueChange={handleNoteSelect}>
            <SelectTrigger><SelectValue placeholder="Select Note to Spend" /></SelectTrigger>
            <SelectContent>
              {notes.map((note, i) => <SelectItem key={i} value={i.toString()}>{`Note ${i+1} - ${note.amount} tXOR`}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </form>
      <div className="mt-6 flex space-x-4">
        <Button onClick={generateProof} disabled={loadingProof || loadingTx || !api || !selectedAccount}>
          {loadingProof ? <FaSpinner className="animate-spin mr-2" /> : null} Generate Proof
        </Button>
        <Button onClick={() => setConfirmOpen(true)} disabled={!proof || loadingProof || loadingTx}>
          {loadingTx ? <FaSpinner className="animate-spin mr-2" /> : null} Submit
        </Button>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Your Notes ({notes.length})</h3>
        {notes.length === 0 ? (
          <p className="text-muted-foreground">No notes yet. Deposit to create one.</p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {notes.map((note, i) => (
              <li key={i} className="bg-muted p-2 rounded text-sm">{`Amount: ${note.amount} tXOR | Commitment: ${note.commitment.slice(0, 10)}...`}</li>
            ))}
          </ul>
        )}
        <Button variant="outline" className="mt-4" onClick={() => {
          const json = JSON.stringify(notes);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'notes.json';
          a.click();
        }}>Export Notes</Button>
        {/* Import button: Handle file upload, decrypt, merge */}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Transaction</DialogTitle>
            <DialogDescription>Are you sure? This will submit the {mode} transaction to the chain.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={submitTransaction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfidentialPanel;