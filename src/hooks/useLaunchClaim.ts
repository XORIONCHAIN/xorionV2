import { useEffect, useMemo, useState } from "react";
import { usePolkadot } from "@/hooks/use-polkadot";
import { useWallet } from "@/components/WalletConnection";

type ClaimInfo = {
  total: string;
  claimed: string;
  start: string;
};

export function useLaunchClaim() {
  const { api, isConnected } = usePolkadot();
  const { selectedAccount } = useWallet();
  const [data, setData] = useState<ClaimInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sanitizeNumericString = (value: unknown): string => {
    if (value == null) return "0";
    const s = value.toString();
    // Remove common thousands separators and spaces that break BigInt
    // Keep digits only; launch claim values are non-negative integers
    const cleaned = s.replace(/[,\s_]/g, "");
    // Fallback to 0 if nothing remains
    return cleaned.length > 0 ? cleaned : "0";
  };

  useEffect(() => {
    let unsub = false;
    const fetchClaim = async () => {
      if (!api || !isConnected || !selectedAccount) {
        setData(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const raw = await api.query.launchClaim?.claims(
          selectedAccount.address
        );
        // If pallet not present or returns undefined
        if (!raw) {
          setData({ total: "0", claimed: "0", start: "0" });
          return;
        }
        const human: any = raw.toHuman?.() ?? raw;
        const parsed: ClaimInfo = {
          total: sanitizeNumericString(human?.total ?? human?.Total ?? "0"),
          claimed: sanitizeNumericString(
            human?.claimed ?? human?.Claimed ?? "0"
          ),
          start: sanitizeNumericString(human?.start ?? human?.Start ?? "0"),
        };
        if (!unsub) setData(parsed);
      } catch (e: any) {
        if (!unsub) setError(e?.message || "Failed to fetch claim info");
      } finally {
        if (!unsub) setIsLoading(false);
      }
    };
    fetchClaim();

    // refresh on account or api change
    return () => {
      unsub = true;
    };
  }, [api, isConnected, selectedAccount?.address]);

  const progress = useMemo(() => {
    if (!data) return 0;
    const t = BigInt(data.total || "0");
    if (t === 0n) return 0;
    const c = BigInt(data.claimed || "0");
    // percent with two decimals as number
    const pct = Number((c * 10000n) / t) / 100;
    return isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  }, [data]);

  return { data, isLoading, error, progress };
}
