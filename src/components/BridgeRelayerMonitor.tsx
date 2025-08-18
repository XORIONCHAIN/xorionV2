import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { usePolkadot } from "@/hooks/use-polkadot";

const BridgeRelayerMonitor = () => {
  const { api, isConnected, isConnecting } = usePolkadot();
  const [relayers, setRelayers] = useState([]);
  const [isPaused, setIsPaused] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch relayers and paused status
  useEffect(() => {
    const fetchData = async () => {
      const isReady = await api.isReady;
      console.log("Isready", isReady);

      if (!api || !isConnected) return;
      setIsLoading(true);
      const query = await api.query;
      // Log available pallets for debugging
      console.log(
        "Bridge pallet",
        query.bridge,
        "Etherum bridge: ",
        query.ethereumBridge
      );
      try {
        // Fetch relayers
        const relayerAddresses = await api.query.bridge.relayers();
        const relayersAsHex = relayerAddresses.map((addr) => addr.toHex());
        setRelayers(relayersAsHex);

        // Fetch paused status
        const isPaused = await api.query.bridge.paused();
        setIsPaused(isPaused.toPrimitive());

        setError("");
      } catch (err) {
        setError("Failed to fetch bridge data: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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
              <p>{isPaused ? "Yes" : "No"}</p>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BridgeRelayerMonitor;
