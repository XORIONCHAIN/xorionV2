import { useState, useEffect } from 'react';
import { web3FromSource } from '@polkadot/extension-dapp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useWallet } from './WalletConnection';
import { usePolkadot } from '@/hooks/use-polkadot';

const BridgeLockForm = ({ onSearchTransaction }) => {
  const { api, isConnected, isConnecting } = usePolkadot();
  const { selectedAccount } = useWallet();
  const [amount, setAmount] = useState('');
  const [relayerFee, setRelayerFee] = useState('');
  const [ethRecipient, setEthRecipient] = useState('');
  const [nonce, setNonce] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch relayer fee automatically
  useEffect(() => {
    const fetchRelayerFee = async () => {
      if (!api || !isConnected) return;
      try {
        // Assuming the bridge pallet has a storage item called `minimumRelayerFee`
        const minFee = await api.query.bridge.minimumRelayerFee();
        const feeValue = minFee.toString();
        setRelayerFee(feeValue);
      } catch (err) {
        setError('Failed to fetch relayer fee: ' + err.message);
      }
    };
    fetchRelayerFee();
  }, [api, isConnected]);

  // Lock tokens function
  const lockTokens = async () => {
    if (!api || !selectedAccount || !amount || !relayerFee || !ethRecipient || !nonce) {
      setError('Please fill in all fields and connect a wallet.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { address, meta: { source } } = selectedAccount;
      const injector = await web3FromSource(source);
      const extrinsic = api.tx.bridge.lock(amount, relayerFee, ethRecipient, nonce);

      await extrinsic.signAndSend(address, { signer: injector.signer }, ({ status, events }) => {
        if (status.isInBlock) {
          setSuccess(`Transaction included in block: ${status.asInBlock}`);
          onSearchTransaction(status.asInBlock.toString());
        } else if (status.isFinalized) {
          let messageId = '';
          events.forEach(({ event: { data, method, section } }) => {
            if (section === 'bridge' && method === 'Locked') {
              messageId = data[5].toHex();
            }
          });
          setSuccess(`Transaction finalized! Message ID: ${messageId}`);
        }
      });
    } catch (err) {
      setError('Transaction failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Lock Tokens to Ethereum</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="default" className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {isConnecting && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {!isConnected && !isConnecting && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>Blockchain node not connected. Please try again later.</AlertDescription>
          </Alert>
        )}
        {isConnected && !selectedAccount && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>Please connect a wallet to proceed.</AlertDescription>
          </Alert>
        )}
        {isConnected && selectedAccount && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Selected Account:</h3>
              <p>
                {selectedAccount.meta.name} ({selectedAccount.address.slice(0, 6)}...)
              </p>
            </div>
            <Input
              type="number"
              placeholder="Amount to lock"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Relayer fee"
              value={relayerFee}
              onChange={(e) => setRelayerFee(e.target.value)} // Allow override
            />
            <Input
              placeholder="Ethereum recipient (0x...)"
              value={ethRecipient}
              onChange={(e) => setEthRecipient(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Nonce"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
            />
            <Button
              onClick={lockTokens}
              disabled={isLoading || !api || !selectedAccount || !isConnected}
              className="w-full"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lock Tokens
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BridgeLockForm;