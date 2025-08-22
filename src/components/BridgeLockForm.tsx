import { useState, useEffect } from "react";
import { web3FromSource } from "@polkadot/extension-dapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useWallet } from "./WalletConnection";
import { usePolkadot } from "@/hooks/use-polkadot";

const TOKEN_DECIMALS = 18;

const BridgeLockForm = ({
  onSearchTransaction,
}: {
  onSearchTransaction: (blockHash: string) => void;
}) => {
  const { api, isConnected, isConnecting, forceReconnect, status, lastError } =
    usePolkadot();
  const { selectedAccount } = useWallet();
  const [amount, setAmount] = useState<string>("");
  const [relayerFee, setRelayerFee] = useState<string>("");
  const [ethRecipient, setEthRecipient] = useState<string>("");
  const [releaseAmount, setReleaseAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"lock" | "release">("lock");

  const toChainUnits = (value: string): string => {
    try {
      const num = Number(value);
      if (isNaN(num) || num < 0) throw new Error("Invalid amount");
      const units = BigInt(
        Math.floor(num * Math.pow(10, TOKEN_DECIMALS))
      ).toString();
      return units;
    } catch {
      throw new Error("Invalid amount format");
    }
  };
  useEffect(() => {
    if (["error", "disconnected"].includes(status)) {
      const timer = setTimeout(() => forceReconnect(), 30000);
      return () => clearTimeout(timer);
    }
  }, [status, forceReconnect]);
  // Validate and convert hex string to [u8; 32]
  const toMessageId = (hex: string): Uint8Array => {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (cleanHex.length !== 64)
      throw new Error("Message ID must be 32 bytes (64 hex chars)");
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  };

  // Validate and convert signatures (comma-separated hex strings, each 65 bytes)
  const toSignatures = (sigInput: string): Uint8Array[] => {
    const sigs = sigInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);
    return sigs.map((sig) => {
      const cleanSig = sig.startsWith("0x") ? sig.slice(2) : sig;
      if (cleanSig.length !== 130)
        throw new Error("Each signature must be 65 bytes (130 hex chars)");
      const bytes = new Uint8Array(65);
      for (let i = 0; i < 65; i++) {
        bytes[i] = parseInt(cleanSig.slice(i * 2, i * 2 + 2), 16);
      }
      return bytes;
    });
  };

  // Generate unique nonce based on timestamp and random component
  const generateNonce = (): number => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return Number(`${timestamp}${random}`.slice(0, 10));
  };

  // Lock tokens function
  const lockTokens = async () => {
    if (!api || !selectedAccount || !amount || !relayerFee || !ethRecipient) {
      setError("Please fill in all fields and connect a wallet.");
      return;
    }

    // Validate Ethereum address
    if (!ethRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid Ethereum recipient address.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.isReady;

      if (!api.tx.ethereumBridge) {
        throw new Error("ethereumBridge pallet not found in api.tx");
      }

      const {
        address,
        meta: { source },
      } = selectedAccount;
      const injector = await web3FromSource(source);
      const nonce = generateNonce();

      // Convert amounts to chain units
      const amountUnits = toChainUnits(amount);
      const relayerFeeUnits = toChainUnits(relayerFee);

      const extrinsic = api.tx.ethereumBridge.lock(
        amountUnits,
        relayerFeeUnits,
        ethRecipient,
        nonce
      );

      await extrinsic.signAndSend(
        address,
        { signer: injector.signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            setSuccess(`Transaction included in block: ${status.asInBlock}`);
            onSearchTransaction(status.asInBlock.toString());
          } else if (status.isFinalized) {
            let messageId = "";
            events.forEach(({ event: { data, method, section } }) => {
              if (section === "ethereumBridge" && method === "Locked") {
                messageId = data[5].toHex();
              }
            });
            setSuccess(`Transaction finalized! Message ID: ${messageId}`);
          }
        }
      );
    } catch (err) {
      setError(`Transaction failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Release tokens function
  const releaseTokens = async () => {
    if (!api || !selectedAccount || !releaseAmount) {
      setError("Please fill in release amount, message ID, and signatures.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.isReady;

      if (!api.tx.ethereumBridge) {
        throw new Error("ethereumBridge pallet not found in api.tx");
      }

      const {
        address,
        meta: { source },
      } = selectedAccount;
      const injector = await web3FromSource(source);

      // Convert inputs
      const amountUnits = toChainUnits(releaseAmount);

      const extrinsic = api.tx.ethereumBridge.release(address, amountUnits);

      await extrinsic.signAndSend(
        address,
        { signer: injector.signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            setSuccess(
              `Release transaction included in block: ${status.asInBlock}`
            );
            onSearchTransaction(status.asInBlock.toString());
          } else if (status.isFinalized) {
            let releaseEvent = "";
            events.forEach(({ event: { data, method, section } }) => {
              if (section === "ethereumBridge" && method === "Released") {
                releaseEvent = data[0].toHex();
              }
            });
            setSuccess(
              `Release transaction finalized! Recipient: ${releaseEvent}`
            );
          }
        }
      );
    } catch (err) {
      setError(`Release transaction failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Bridge Tokens to Ethereum</CardTitle>
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
            <AlertDescription>
              Blockchain node not connected. Please try again later.
            </AlertDescription>
          </Alert>
        )}
        {isConnected && !selectedAccount && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Please connect a wallet to proceed.
            </AlertDescription>
          </Alert>
        )}
        {isConnected && selectedAccount && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Selected Account:</h3>
              <p>
                {selectedAccount.meta.name} (
                {selectedAccount.address.slice(0, 6)}...)
              </p>
            </div>
            <div className="flex border-b">
              <button
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === "lock"
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("lock")}
              >
                Lock Tokens
              </button>
              <button
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === "release"
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-500"
                }`}
                onClick={() => setActiveTab("release")}
              >
                Release Tokens
              </button>
            </div>
            {activeTab === "lock" && (
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder="Amount to lock (e.g., 1.5)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.000000000000000001"
                />
                <Input
                  type="number"
                  placeholder="Relayer fee (e.g., 0.01)"
                  value={relayerFee}
                  onChange={(e) => setRelayerFee(e.target.value)}
                  step="0.000000000000000001"
                />
                <Input
                  placeholder="Ethereum recipient (0x...)"
                  value={ethRecipient}
                  onChange={(e) => setEthRecipient(e.target.value)}
                />
                <Button
                  onClick={lockTokens}
                  disabled={
                    isLoading || !api || !selectedAccount || !isConnected
                  }
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Lock Tokens
                </Button>
              </div>
            )}
            {activeTab === "release" && (
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder="Amount to release (e.g., 1.5)"
                  value={releaseAmount}
                  onChange={(e) => setReleaseAmount(e.target.value)}
                  step="0.000000000000000001"
                />
                <Button
                  onClick={releaseTokens}
                  disabled={
                    isLoading || !api || !selectedAccount || !isConnected
                  }
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Release Tokens
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BridgeLockForm;
