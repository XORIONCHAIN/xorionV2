import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ApiPromise } from '@polkadot/api';
import { formatBalance } from '@polkadot/util';
import BN from 'bn.js';
import { useApiStore } from './apiStore';

export interface NetworkMetrics {
  validatorsOnline: number;
  totalValidators: number;
  stakingAPR: number;
  avgBlockTime: number;
  totalTransactions: number;
  totalValueLocked: string;
  networkHealth: number;
  activeAddresses: number;
  lastUpdated: number;
}

export interface ValidatorInfo {
  address: string;
  commission: number;
  selfBonded: string;
  nominators: number;
  totalStake: string;
  status: string;
}

interface NetworkStore {
  // Network Data
  networkMetrics: NetworkMetrics;
  chartData: any[];
  stakingData: any[];
  validators: ValidatorInfo[];
  
  // Loading States
  isLoading: boolean;
  isFetching: boolean;
  
  // Cache
  lastFetchTime: number;
  cacheTTL: number;
  networkData: any | null;
  
  // Actions
  setNetworkMetrics: (metrics: Partial<NetworkMetrics>) => void;
  setChartData: (data: any[]) => void;
  setStakingData: (data: any[]) => void;
  setValidators: (validators: ValidatorInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  setNetworkData: (data: any) => void;
  clearNetworkData: () => void;
  
  // Data Fetching
  fetchNetworkData: () => Promise<void>;
  fetchValidators: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const CACHE_TTL = 30000;

export const useNetworkStore = create<NetworkStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    networkMetrics: {
      validatorsOnline: 0,
      totalValidators: 0,
      stakingAPR: 0,
      avgBlockTime: 0,
      totalTransactions: 0,
      totalValueLocked: '0',
      networkHealth: 0,
      activeAddresses: 0,
      lastUpdated: 0
    },
    chartData: [],
    stakingData: [],
    validators: [],
    isLoading: false,
    isFetching: false,
    lastFetchTime: 0,
    cacheTTL: CACHE_TTL,
    networkData: null,

    // Actions
    setNetworkMetrics: (metrics: Partial<NetworkMetrics>) => {
      set((prev) => ({
        networkMetrics: { ...prev.networkMetrics, ...metrics }
      }));
    },

    setChartData: (data: any[]) => set({ chartData: data }),
    setStakingData: (data: any[]) => set({ stakingData: data }),
    setValidators: (validators: ValidatorInfo[]) => set({ validators }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setFetching: (fetching: boolean) => set({ isFetching: fetching }),
    setNetworkData: (data: any) => set({ networkData: data }),
    clearNetworkData: () => set({ networkData: null }),

    // Data Fetching
    fetchNetworkData: async () => {
      const { api, apiState } = useApiStore.getState();
      const { setNetworkMetrics, setChartData, setStakingData, setFetching, setNetworkData } = get();
      
      if (!api || apiState.status !== 'connected') {
        setFetching(false);
        return;
      }
      
      setFetching(true);
      
      try {
        // Check cache first
        const cachedData = get().networkData;
        if (cachedData && Date.now() - get().lastFetchTime < CACHE_TTL) {
          setNetworkMetrics(cachedData.metrics);
          setChartData(cachedData.chartData);
          setStakingData(cachedData.stakingData);
          setFetching(false);
          return;
        }

        // Fetch with timeout
        const dataPromise = fetchNetworkDataWithTimeout(api);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network data fetch timeout')), 30000)
        );
        
        const result = await Promise.race([dataPromise, timeoutPromise]);
        
        if (result) {
          const { metrics, chartData, stakingData } = result as any;
          setNetworkMetrics(metrics);
          setChartData(chartData);
          setStakingData(stakingData);
          setNetworkData({ metrics, chartData, stakingData });
          set({ lastFetchTime: Date.now() });
        }
        
        setFetching(false);
        
      } catch (error: any) {
        console.error('❌ Network data fetch failed:', error);
        setFetching(false);
      }
    },

    fetchValidators: async () => {
      const { api, apiState } = useApiStore.getState();
      const { setValidators } = get();
      
      if (!api || apiState.status !== 'connected') return;
      
      try {
        const validatorAddresses = await api.query.session.validators();
        const validatorInfos: ValidatorInfo[] = await Promise.all(
          (validatorAddresses as unknown as any[]).slice(0, 10).map(async (addressCodec: any) => {
            const address = addressCodec.toString();
            
            try {
              const [prefs, ledger] = await Promise.all([
                api.query.staking.validators(address),
                api.query.staking.ledger(address)
              ]);
              
              const commission = (prefs as any).commission.toNumber() / 1e7;
              const selfBonded = (ledger as any).isSome ? (ledger as any).unwrap().active.toString() : '0';
              
              return {
                address,
                commission,
                selfBonded,
                nominators: 0, // Simplified
                totalStake: '0', // Simplified
                status: 'active'
              };
            } catch {
              return {
                address,
                commission: 0,
                selfBonded: '0',
                nominators: 0,
                totalStake: '0',
                status: 'unknown'
              };
            }
          })
        );
        
        setValidators(validatorInfos);
      } catch (error) {
        console.error('❌ Error fetching validators:', error);
        setValidators([]);
      }
    },

    refreshData: async () => {
      const { clearNetworkData, setNetworkMetrics, fetchNetworkData } = get();
      clearNetworkData();
      setNetworkMetrics({ lastUpdated: 0 });
      await fetchNetworkData();
    },
  }))
);

// Helper function to fetch network data with timeout
async function fetchNetworkDataWithTimeout(api: ApiPromise) {
  try {
    // Fetch basic network information
    const [chain, properties, validators, totalIssuance] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.properties(),
      api.query.session.validators(),
      api.query.balances.totalIssuance()
    ]);

    // Calculate metrics
    const totalValidators = validators.length;
    const validatorsOnline = totalValidators; // Simplified
    const stakingAPR = 12.5; // Placeholder
    const avgBlockTime = 6; // Placeholder
    const totalTransactions = 0; // Would need to calculate from blocks
    const totalValueLocked = formatBalance(totalIssuance, { decimals: 18, withUnit: 'XOR' });
    const networkHealth = 95; // Placeholder
    const activeAddresses = 1000; // Placeholder

    const metrics: NetworkMetrics = {
      validatorsOnline,
      totalValidators,
      stakingAPR,
      avgBlockTime,
      totalTransactions,
      totalValueLocked,
      networkHealth,
      activeAddresses,
      lastUpdated: Date.now()
    };

    // Generate sample chart data
    const chartData = [
      { name: 'Validators', value: totalValidators },
      { name: 'Online', value: validatorsOnline },
      { name: 'APR', value: stakingAPR }
    ];

    // Generate sample staking data
    const stakingData = [
      { name: 'Total Staked', value: totalValueLocked },
      { name: 'Network Health', value: networkHealth },
      { name: 'Active Addresses', value: activeAddresses }
    ];

    return {
      metrics,
      chartData,
      stakingData
    };
  } catch (error) {
    console.error('Error fetching network data:', error);
    return {
      metrics: {
        validatorsOnline: 0,
        totalValidators: 0,
        stakingAPR: 0,
        avgBlockTime: 0,
        totalTransactions: 0,
        totalValueLocked: '0',
        networkHealth: 0,
        activeAddresses: 0,
        lastUpdated: Date.now()
      },
      chartData: [],
      stakingData: []
    };
  }
}

// Auto-refresh network data
if (typeof window !== 'undefined') {
  setInterval(() => {
    const { apiState } = useApiStore.getState();
    const { fetchNetworkData } = useNetworkStore.getState();
    if (apiState.status === 'connected') {
      fetchNetworkData().catch(console.warn);
    }
  }, 30000);
} 