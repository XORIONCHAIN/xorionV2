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

    useEffect(() => {
        const fetchData = async () => {
            if (!api || !isConnected) {
                setError("API is not initialized or not connected. Check the node endpoint.");
                setIsLoading(false);
                return;
            }

            try {
                const isReady = await api.isReady;
                console.log("Isready", isReady);

                const metadata = await api.rpc.state.getMetadata();
                const pallets = metadata.asLatest.pallets;
                console.log("Available Pallets with Details:");
                pallets.forEach((pallet) => {
                    console.log(`- Name: ${pallet.name.toString()}, Index: ${pallet.index.toNumber()}`);
                });

                setIsLoading(true);
                const query = api.query;
                console.log(
                    "All query pallets:",
                    Object.keys(query).filter((key) => typeof query[key] === "object" && query[key] !== null)
                );
                console.log("Checking specific pallets:", {
                    ethereumBridge: query.ethereumBridge,
                });

                // Verify the ethereumBridge pallet
                if (!query.ethereumBridge) {
                    throw new Error("ethereumBridge pallet not found in api.query");
                }

                // Fetch relayerFund
                const relayerFund = await query.ethereumBridge.relayerFund();
                console.log("relayerFund:", relayerFund.toHuman());
                setRelayers([relayerFund.toHuman()]);

                // Fetch paused status (optional)
                const isPausedValue = await query.ethereumBridge.paused?.();
                setIsPaused(isPausedValue ? isPausedValue.toPrimitive() : null);

                setError("");
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to fetch bridge data: " + err.message);
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
                            <h3 className="font-semibold">Relayer Fund:</h3>
                            {relayers.length > 0 ? (
                                <ul className="list-disc pl-5">
                                    {relayers.map((relayer, index) => (
                                        <li key={index}>{relayer}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No relayer fund data found.</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default BridgeRelayerMonitor;