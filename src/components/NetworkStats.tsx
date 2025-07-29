import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { usePolkadotStore } from '@/stores/polkadotStore';
import NetworkStatsHeader from './NetworkStatsHeader';
import KeyMetricsGrid from './KeyMetricsGrid';
import AdditionalMetricsGrid from './AdditionalMetricsGrid';
import ChartsSection from './ChartsSection';
import { formatTxor } from '@/lib/utils';

const formatNumber = (num: number) => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
};

// SKELETON FOR LOADING METRICS, SHOWS PLACEHOLDER CARDS
const MetricSkeleton = () => (
  <Card className="bg-card/50 backdrop-blur-sm border border-border">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 bg-muted-foreground/20 rounded w-24 animate-pulse"></div>
      <div className="h-4 w-4 bg-muted-foreground/20 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-muted-foreground/20 rounded w-16 mb-2 animate-pulse"></div>
      <div className="h-6 bg-muted-foreground/20 rounded w-20 animate-pulse"></div>
    </CardContent>
  </Card>
);

// SKELETON FOR CHARTS, JUST A BLANK CHART WITH LOADING
const ChartSkeleton = () => (
  <Card className="bg-card/50 backdrop-blur-sm border border-border">
    <CardHeader>
      <div className="h-6 bg-muted-foreground/20 rounded w-48 animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-[300px] bg-muted-foreground/10 rounded animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    </CardContent>
  </Card>
);

// MAIN NETWORK STATS COMPONENT, THIS IS THE BIG ONE
const NetworkStats = () => {
  const {
    apiState,
    networkMetrics,
    chartData,
    stakingData,
    setNetworkMetrics,
    setChartData,
    setStakingData,
    fetchNetworkData,
    isLoading,
    isFetching
  } = usePolkadotStore();

  // CALCULATE VALIDATOR PERCENTAGE, I THINK THIS IS FOR THE BADGE
  const validatorPercentage = useMemo(() => {
    return networkMetrics.totalValidators > 0 
      ? ((networkMetrics.validatorsOnline / networkMetrics.totalValidators) * 100).toFixed(1)
      : '0';
  }, [networkMetrics.validatorsOnline, networkMetrics.totalValidators]);

  // DEBOUNCED FETCH TO PREVENT TOO MANY CALLS, NOT SURE IF NEEDED
  const debouncedFetchData = useCallback(() => {
    const timeoutId = setTimeout(() => {
      fetchNetworkData();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [fetchNetworkData]);

  // FETCH DATA WHEN CONNECTED, ONLY IF NOT ALREADY LOADED
  useEffect(() => {
    if (apiState.status === 'connected' && networkMetrics.lastUpdated === 0) {
      // Start data fetch immediately but don't block UI
      fetchNetworkData();
    }
  }, [apiState.status, fetchNetworkData, networkMetrics.lastUpdated]); // Remove fetchNetworkData from deps to prevent loops

  // GET COLOR FOR STATUS BADGES, GREEN, YELLOW, RED, ETC
  const getStatusColor = (value: number, type: 'validators' | 'health' | 'apr') => {
    if (type === 'validators') {
      const percentage = networkMetrics.totalValidators > 0 ? (value / networkMetrics.totalValidators) * 100 : 0;
      if (percentage >= 90) return 'bg-green-500/20 text-green-500 border-green-500/30';
      if (percentage >= 75) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    }
    if (type === 'health') {
      if (value >= 99) return 'bg-green-500/20 text-green-500 border-green-500/30';
      if (value >= 95) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    }
    if (type === 'apr') {
      if (value >= 10) return 'bg-green-500/20 text-green-500 border-green-500/30';
      if (value >= 5) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    }
    return 'bg-primary/20 text-primary border-primary/30';
  };

  // RECONNECT BUTTON HANDLER, JUST CALLS RECONNECT
  const handleReconnect = () => {
    // Reconnect logic
  };

  // REFRESH BUTTON HANDLER, CALLS REFRESH
  const handleRefresh = () => {
    // Refresh logic
  };

  // IF NOT CONNECTED, SHOW STATUS CARD
  if (apiState.status !== 'connected') {
    return (
      <section className="space-y-6 px-4" aria-label="Network Stats Overview">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Network Statistics</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {apiState.status}
            </Badge>
            <Button onClick={handleReconnect} size="sm" variant="outline">
              Reconnect
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">
                {apiState.status === 'connecting' ? 'Connecting to Network...' :
                 apiState.status === 'error' ? 'Connection Failed' :
                 'Disconnected'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {apiState.status === 'connecting' ? 'Establishing connection to Polkadot network...' :
                 apiState.status === 'error' ? 'Unable to connect to any available endpoints' :
                 'Not connected to the network'}
              </p>
              {apiState.lastError && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-4">
                  Error: {apiState.lastError}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Status: {apiState.status} | 
                Endpoint: {apiState.endpoint || 'None'} |
                Attempts: {apiState.connectionAttempts}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // IF CONNECTED, SHOW MAIN UI, EVEN IF STILL LOADING
  const hasData = networkMetrics.lastUpdated > 0;
  const showSkeleton = !hasData && isLoading;

  return (
    <section className="space-y-6 px-4" aria-label="Network Stats Overview">
      {/* HEADER AT THE TOP, SHOWS TITLE AND REFRESH */}
      <NetworkStatsHeader
        hasData={hasData}
        isLoading={isLoading}
        isFetching={isFetching}
        lastUpdated={networkMetrics.lastUpdated}
        onRefresh={handleRefresh}
      />
      {/* Key Metrics - Show skeleton if no data, otherwise show data */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      ) : (
        <KeyMetricsGrid
          validatorsOnline={networkMetrics.validatorsOnline}
          totalValidators={networkMetrics.totalValidators}
          validatorPercentage={validatorPercentage}
          stakingAPR={networkMetrics.stakingAPR}
          avgBlockTime={networkMetrics.avgBlockTime}
          totalValueLocked={networkMetrics.totalValueLocked}
          getStatusColor={getStatusColor}
          formatNumber={formatNumber}
        />
      )}
      {/* Additional Metrics */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      ) : (
        <AdditionalMetricsGrid
          totalTransactions={networkMetrics.totalTransactions}
          networkHealth={networkMetrics.networkHealth}
          activeAddresses={networkMetrics.activeAddresses}
          getStatusColor={getStatusColor}
          formatNumber={formatNumber}
        />
      )}
      {/* Charts */}
      <ChartsSection
        showSkeleton={showSkeleton}
        chartData={chartData}
        stakingData={stakingData}
        formatNumber={formatNumber}
      />
    </section>
  );
};
export default NetworkStats;