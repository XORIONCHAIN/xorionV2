import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { usePolkadot } from "@/hooks/use-polkadot";

const TOKEN_DECIMALS = 18;

const formatBalance = (balance: string | number, decimals: number): string => {
  const num = Number(balance) / Math.pow(10, decimals);
  return num.toFixed(2); // Display with 2 decimal places
};

const BridgeRelayerMonitor = () => {
  const { api, isConnected, isConnecting } = usePolkadot();
  const [relayers, setRelayers] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [totalLocked, setTotalLocked] = useState<string>("0");
  const [totalReleased, setTotalReleased] = useState<string>("0");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!api || !isConnected) {
        setError("API is not initialized or not connected. Check the node endpoint.");
        setIsLoading(false);
        return;
      }

      try {
        await api.isReady;

        // Fetch relayers
        const relayersData = await api.query.ethereumBridge.relayers();
        const relayersHuman = relayersData.toHuman();
        // Validate and cast relayers to string[]
        const validatedRelayers = Array.isArray(relayersHuman)
          ? relayersHuman.filter((item): item is string => typeof item === "string")
          : [];
        setRelayers(validatedRelayers);

        // Fetch paused status
        const isPausedValue = await api.query.ethereumBridge.paused();
        const isPausedPrimitive = isPausedValue.toPrimitive();
        // Validate and cast to boolean
        setIsPaused(typeof isPausedPrimitive === "boolean" ? isPausedPrimitive : false);

                // Fetch relayerFund
                const relayerFund = await query.ethereumBridge.relayers();
                console.log('relay fund: ', relayerFund)
                console.log("relayerFund:", relayerFund.toHuman());
                const allRelayers = relayerFund.toHuman() as string[]
                setRelayers(allRelayers);

        // Fetch total released
        const totalReleasedData = await api.query.ethereumBridge.totalReleased();
        setTotalReleased(totalReleasedData.toString());

        setError("");
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          `Failed to fetch bridge data: ${err.message}. Check if ethereumBridge pallet and storage items are available.`
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (api && isConnected) {
      fetchData();
    } else {
      setError("Waiting for API connection...");
      setIsLoading(false);
    }
  }, [api, isConnected]);

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Bridge Status</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
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
        {isConnected && isLoading && (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {isConnected && !isLoading && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Bridge Paused:</h3>
              <p>{isPaused !== null ? (isPaused ? "Yes" : "No") : "N/A"}</p>
            </div>
            <div>
              <h3 className="font-semibold">Relayers:</h3>
              {relayers.length > 0 ? (
                <ul className="list-disc pl-5">
                  {relayers.map((relayer, index) => (
                    <li key={index}>{relayer}</li>
                  ))}
                </ul>
              ) : (
                <p>No relayers found.</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold">Total Locked:</h3>
              <p>{formatBalance(totalLocked, TOKEN_DECIMALS)} Tokens</p>
            </div>
            <div>
              <h3 className="font-semibold">Total Released:</h3>
              <p>{formatBalance(totalReleased, TOKEN_DECIMALS)} Tokens</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BridgeRelayerMonitor;