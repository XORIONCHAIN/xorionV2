import { useState, useEffect } from "react";
import { web3FromSource } from "@polkadot/extension-dapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useWallet } from "./WalletConnection";
import { usePolkadot } from "@/hooks/use-polkadot";
import { useToast } from "@/components/ui/use-toast";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
} from "wagmi";
import { parseUnits } from "viem";
import BRIDGE_ABI from "@/lib/bridge-abi.json";
import { decodeAddress } from "@polkadot/util-crypto";
import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";

const TOKEN_DECIMALS = 18;
const BRIDGE_CONTRACT_ADDRESS = "0x7cce42AbC9A7e3f835fCB9b04B2e352529dE172b";
const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_RPC =
  import.meta.env.VITE_SEPOLIA_RPC || "https://rpc.sepolia.org";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC),
  },
});

const BridgeLockForm = ({
  onSearchTransaction,
}: {
  onSearchTransaction: (blockHash: string) => void;
}) => {
  const { api, isConnected, isConnecting, forceReconnect, status } =
    usePolkadot();
  const { selectedAccount } = useWallet();
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [relayerFee, setRelayerFee] = useState<string>("");
  const [ethRecipient, setEthRecipient] = useState<string>("");
  const [releaseAmount, setReleaseAmount] = useState<string>("");
  const [xorionRecipient, setXorionRecipient] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"bridge" | "release">("bridge");

  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const {
    writeContract,
    data: txHash,
    isPending: isEthPending,
    error: ethError,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isEthSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  const toChainUnits = (value: string): bigint => {
    try {
      const num = Number(value);
      if (isNaN(num) || num < 0) throw new Error("Invalid amount");
      return parseUnits(value, TOKEN_DECIMALS);
    } catch {
      throw new Error("Invalid amount format");
    }
  };

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

  const generateNonce = (): number => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return Number(`${timestamp}${random}`.slice(0, 10));
  };

  const bridgeTokens = async () => {
    if (!api || !selectedAccount || !amount || !relayerFee || !ethRecipient) {
      setError("Please fill in all fields and connect a Polkadot wallet.");
      return;
    }

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

      const amountUnits = toChainUnits(amount);
      const relayerFeeUnits = toChainUnits(relayerFee);

      const extrinsic = api.tx.ethereumBridge.lock(
        amountUnits.toString(),
        relayerFeeUnits.toString(),
        ethRecipient,
        nonce
      );

      await extrinsic.signAndSend(
        address,
        { signer: injector.signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            setSuccess(`Transaction included in block: ${status.asInBlock}`);
          } else if (status.isFinalized) {
            let messageId = "";
            events.forEach(({ event: { data, method, section } }) => {
              if (section === "ethereumBridge" && method === "Locked") {
                messageId = data[5].toHex();
              }
            });
            setSuccess(`Transaction finalized! Message ID: ${messageId}`);
            toast({
              title: "Success",
              description: "Tokens successfully bridged!",
            });
            setTimeout(() => {
              onSearchTransaction(status.asInBlock.toString());
            }, 2000);
          }
        }
      );
    } catch (err) {
      setError(`Transaction failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const releaseTokens = async () => {
    if (!isEthConnected || !ethAddress || !releaseAmount || !xorionRecipient) {
      setError(
        "Please connect Ethereum wallet, fill in amount and Xorion recipient."
      );
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate SS58 address
      if (!xorionRecipient.match(/^[1-9A-HJ-NP-Za-km-z]{46,48}$/)) {
        throw new Error("Invalid Xorion (Polkadot) recipient address.");
      }

      const decodedRecipient = decodeAddress(xorionRecipient);
      const recipientBytes = `0x${Array.from(decodedRecipient)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}`;

      const amountUnits = toChainUnits(releaseAmount);

      writeContract({
        address: BRIDGE_CONTRACT_ADDRESS,
        abi: BRIDGE_ABI,
        functionName: "lock",
        args: [amountUnits, recipientBytes],
        chain: sepolia,
        account: ethAddress, // Fix: Add the connected Ethereum address
      });
    } catch (err) {
      setError(`Release failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectEthereum = () => {
    const metaMask = connectors.find((c) => c.id === "metaMask");
    if (metaMask) {
      connect({ connector: metaMask });
    } else {
      setError("MetaMask not detected. Please install it.");
    }
  };

  useEffect(() => {
    if (["error", "disconnected"].includes(status)) {
      const timer = setTimeout(() => forceReconnect(), 30000);
      return () => clearTimeout(timer);
    }
  }, [status, forceReconnect]);

  useEffect(() => {
    if (ethError) {
      setError(`Ethereum transaction failed: ${ethError.message}`);
    }
    if (isEthSuccess) {
      setSuccess(`Tokens released (burned) on Ethereum! Tx: ${txHash}`);
      toast({
        title: "Success",
        description: "Tokens successfully released!",
      });
    }
  }, [ethError, isEthSuccess, txHash, toast]);

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Bridge Tokens to Ethereum</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="break-words whitespace-normal">
              {error}
            </AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert variant="default" className="mb-4">
            <AlertDescription className="break-words whitespace-normal">
              {success}
            </AlertDescription>
          </Alert>
        )}
        {isConnecting && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {!isConnected && !isConnecting && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="break-words whitespace-normal">
              Blockchain node not connected. Please try again later.
            </AlertDescription>
          </Alert>
        )}
        {isConnected && !selectedAccount && activeTab === "bridge" && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="break-words whitespace-normal">
              Please connect a Polkadot wallet to proceed.
            </AlertDescription>
          </Alert>
        )}
        {activeTab === "release" && !isEthConnected && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription className="break-words whitespace-normal">
              Please connect an Ethereum wallet (e.g., MetaMask on Sepolia) to
              proceed.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          {isConnected && selectedAccount && (
            <>
              <div>
                <h3 className="font-semibold">Selected Polkadot Account:</h3>
                <p>
                  {selectedAccount.meta.name} (
                  {selectedAccount.address.slice(0, 6)}...)
                </p>
              </div>
              <div className="flex border-b">
                <button
                  className={`flex-1 py-2 px-4 text-center ${
                    activeTab === "bridge"
                      ? "border-b-2 border-blue-500 text-blue-500"
                      : "text-gray-500"
                  }`}
                  onClick={() => setActiveTab("bridge")}
                >
                  Bridge Tokens
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
            </>
          )}
          {activeTab === "bridge" && (
            <div className="space-y-4">
              <Input
                type="number"
                placeholder="Amount to bridge (e.g., 1.5)"
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
                onClick={bridgeTokens}
                disabled={isLoading || !api || !selectedAccount || !isConnected}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Bridge Tokens
              </Button>
            </div>
          )}
          {activeTab === "release" && (
            <div className="space-y-4">
              {!isEthConnected && (
                <Button onClick={handleConnectEthereum} className="w-full">
                  Connect Ethereum Wallet
                </Button>
              )}
              {isEthConnected && (
                <div>
                  <h3 className="font-semibold">Selected Ethereum Account:</h3>
                  <p>
                    {ethAddress.slice(0, 6)}...{ethAddress.slice(-4)}
                  </p>
                </div>
              )}
              <Input
                type="number"
                placeholder="Amount to release (e.g., 1.5)"
                value={releaseAmount}
                onChange={(e) => setReleaseAmount(e.target.value)}
                step="0.000000000000000001"
              />
              <Input
                placeholder="Xorion (Polkadot) recipient (SS58 address)"
                value={xorionRecipient}
                onChange={(e) => setXorionRecipient(e.target.value)}
              />
              <Button
                onClick={releaseTokens}
                disabled={
                  isLoading || isEthPending || isConfirming || !isEthConnected
                }
                className="w-full"
              >
                {isLoading || isEthPending || isConfirming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Release Tokens
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BridgeLockForm;
