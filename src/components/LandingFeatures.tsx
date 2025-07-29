import React, { useEffect } from 'react';
import { useNetworkStore } from '@/stores/networkStore';
import { useApiStore } from '@/stores/apiStore';
import { Badge } from '@/components/ui/badge';

const LandingFeatures = () => {
  const { apiState } = useApiStore();
  const { networkMetrics, fetchNetworkData, isLoading } = useNetworkStore();

  useEffect(() => {
    if (apiState.status === 'connected') {
      fetchNetworkData();
    }
  }, [apiState.status, fetchNetworkData]);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) / 1e12;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const cardBase = `glass-card rounded-xl p-6 flex flex-col items-center text-center shadow`;
  const largeCardBase = `glass-card rounded-xl shadow p-8 flex flex-col justify-between transition-all`;

  return (
    <section id="features" className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-foreground mb-6">
          Powerful Features
        </h2>

        {/* Connection Status */}
        <div className="flex justify-center mb-6">
          <Badge
            className={`px-4 py-2 text-sm font-medium ${
              apiState.status === 'connected'
                ? 'bg-emerald-500 text-white'
                : apiState.status === 'connecting'
                ? 'bg-yellow-400 text-black'
                : 'bg-red-500 text-white'
            }`}
            variant="secondary"
          >
            <div
              className={`w-2 h-2 rounded-full mr-2 inline-block ${
                apiState.status === 'connected'
                  ? 'bg-emerald-200'
                  : apiState.status === 'connecting'
                  ? 'bg-yellow-200'
                  : 'bg-red-200'
              }`}
            ></div>
            {apiState.status === 'connected'
              ? 'Live Data'
              : apiState.status === 'connecting'
              ? 'Connecting...'
              : 'Offline'}
          </Badge>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className={cardBase}>
            <div className="text-3xl font-bold text-primary mb-1">
              {isLoading ? (
                <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
              ) : (
                formatNumber(networkMetrics.validatorsOnline)
              )}
            </div>
            <div className="text-sm text-muted-foreground">Validators Online</div>
          </div>
          <div className={cardBase}>
            <div className="text-3xl font-bold text-primary mb-1">
              {isLoading ? (
                <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
              ) : (
                `${networkMetrics.stakingAPR.toFixed(1)}%`
              )}
            </div>
            <div className="text-sm text-muted-foreground">Staking APR</div>
          </div>
          <div className={cardBase}>
            <div className="text-3xl font-bold text-primary mb-1">
              {isLoading ? (
                <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
              ) : (
                formatCurrency(networkMetrics.totalValueLocked)
              )}
            </div>
            <div className="text-sm text-muted-foreground">Total Value Locked</div>
          </div>
          <div className={cardBase}>
            <div className="text-3xl font-bold text-primary mb-1">
              {isLoading ? (
                <div className="animate-pulse bg-white/20 h-8 w-16 rounded"></div>
              ) : (
                formatNumber(networkMetrics.totalTransactions)
              )}
            </div>
            <div className="text-sm text-muted-foreground">Transactions</div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(180px,1fr)]">
          <div className={largeCardBase + " col-span-1 lg:col-span-2"}>
            <div>
              <div className="flex items-center mb-4">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mr-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 3v18h18" />
                    <path d="M7 15l4-4 4 4" />
                  </svg>
                </span>
                <h3 className="text-2xl font-bold text-foreground">Real-time Network Analytics</h3>
              </div>
              <p className="text-muted-foreground text-lg">
                Live blockchain metrics, block times, and network health at a glance.
              </p>
            </div>
          </div>

          <div className={largeCardBase}>
            <div className="flex items-center mb-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mr-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
                </svg>
              </span>
              <h3 className="text-xl font-bold text-foreground">Advanced Staking</h3>
            </div>
            <p className="text-muted-foreground">Delegate, claim rewards, and compare validators with ease.</p>
          </div>

          <div className={largeCardBase}>
            <div className="flex items-center mb-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mr-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M8 9h8M8 13h6" />
                </svg>
              </span>
              <h3 className="text-xl font-bold text-foreground">Transaction Explorer</h3>
            </div>
            <p className="text-muted-foreground">Track every transaction and block with powerful search and filters.</p>
          </div>

          <div className={largeCardBase + " row-span-2"}>
            <div>
              <div className="flex items-center mb-4">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mr-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2v20M2 12h20" />
                  </svg>
                </span>
                <h3 className="text-xl font-bold text-foreground">Validator Insights</h3>
              </div>
              <p className="text-muted-foreground">Compare, analyze, and choose the best validators for your needs.</p>
            </div>
          </div>

          <div className={largeCardBase}>
            <div className="flex items-center mb-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mr-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <h3 className="text-xl font-bold text-foreground">Secure & Fast</h3>
            </div>
            <p className="text-muted-foreground">Built for performance, security, and reliability.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
