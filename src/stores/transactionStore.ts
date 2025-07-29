import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { ApiPromise } from '@polkadot/api';
import { formatBalance } from '@polkadot/util';
import BN from 'bn.js';
import { useApiStore } from './apiStore';

export interface Transaction {
  hash: string;
  blockNumber: number;
  blockHash: string;
  index: number;
  method: string;
  section: string;
  signer: string;
  timestamp: Date | null;
  success: boolean;
  fee: string;
  args: string[];
  txType: string;
}

export interface Block {
  height: number;
  hash: string;
  timestamp: Date | null;
  txCount: number;
  proposer: string;
  size: string;
}

export interface TransactionData {
  transactions: Transaction[];
  blocks: Block[];
  lastUpdated: number;
}

export interface TransactionDetails {
  hash: string;
  blockNumber: number;
  blockHash: string;
  index: number;
  method: string;
  section: string;
  signer: string;
  timestamp: Date | null;
  success: boolean;
  fee: string;
  args: string[];
  events: any[];
  error: string | null;
  nonce: number;
  tip: string;
  era: number;
  signature: string;
  isDecoded: boolean;
  decodedArgs: any[];
  txType: string;
}

interface TransactionStore {
  // Transaction Data
  transactionData: TransactionData;
  isTransactionLoading: boolean;
  isTransactionFetching: boolean;
  
  // Transaction Details
  transactionDetails: TransactionDetails | null;
  isDetailsLoading: boolean;
  detailsError: string | null;
  
  // Cache
  cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  
  // Actions
  setTransactionData: (data: Partial<TransactionData>) => void;
  setTransactionLoading: (loading: boolean) => void;
  setTransactionFetching: (fetching: boolean) => void;
  setTransactionDetails: (details: TransactionDetails | null) => void;
  setDetailsLoading: (loading: boolean) => void;
  setDetailsError: (error: string | null) => void;
  
  // Data Fetching
  fetchTransactionData: () => Promise<void>;
  fetchTransactionDetails: (hash: string) => Promise<void>;
  refreshTransactionData: () => Promise<void>;
  
  // Caching
  getCached: (key: string) => any | null;
  setCached: (key: string, data: any, ttl?: number) => void;
  clearCache: () => void;
  clearTransactionCache: () => void;
  
  // Search Methods
  getTransactionByHash: (hash: string) => Transaction | undefined;
  searchTransactionByHash: (hash: string, maxBlocks?: number) => Promise<TransactionDetails | null>;
  searchTransactionInRecentBlocks: (hash: string) => TransactionDetails | null;
  searchTransactionExtensive: (hash: string) => Promise<TransactionDetails | null>;
  
  // Enhanced Actions
  forceRefreshTransactionData: () => Promise<void>;
}

const CACHE_TTL = 30000;

export const useTransactionStore = create<TransactionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    transactionData: {
      transactions: [],
      blocks: [],
      lastUpdated: 0
    },
    isTransactionLoading: false,
    isTransactionFetching: false,
    transactionDetails: null,
    isDetailsLoading: false,
    detailsError: null,
    cache: new Map(),

    // Actions
    setTransactionData: (data: Partial<TransactionData>) => {
      set((prev) => ({
        transactionData: { ...prev.transactionData, ...data }
      }));
    },

    setTransactionLoading: (loading: boolean) => set({ isTransactionLoading: loading }),
    setTransactionFetching: (fetching: boolean) => set({ isTransactionFetching: fetching }),
    setTransactionDetails: (details: TransactionDetails | null) => set({ transactionDetails: details }),
    setDetailsLoading: (loading: boolean) => set({ isDetailsLoading: loading }),
    setDetailsError: (error: string | null) => set({ detailsError: error }),

    // Data Fetching
    fetchTransactionData: async () => {
      const { api, apiState } = useApiStore.getState();
      const { setTransactionData, setTransactionLoading, setTransactionFetching, getCached, setCached } = get();
      
      if (!api || apiState.status !== 'connected') {
        setTransactionLoading(false);
        setTransactionFetching(false);
        return;
      }
      
      setTransactionLoading(true);
      setTransactionFetching(true);
      
      try {
        const cachedData = getCached('transactionData');
        if (cachedData) {
          setTransactionData(cachedData);
          setTransactionLoading(false);
          setTransactionFetching(false);
          return;
        }

        const transactionData = await fetchTransactionDataWithTimeout(api);
        
        setTransactionData(transactionData);
        setCached('transactionData', transactionData, 15000);
        
        // Set up real-time subscription for new blocks
        setupRealtimeSubscriptions(api);
        
      } catch (error: any) {
        console.error('❌ Transaction data fetch failed:', error);
        setTransactionData({ transactions: [], blocks: [], lastUpdated: Date.now() });
      } finally {
        setTransactionLoading(false);
        setTransactionFetching(false);
      }
    },

    fetchTransactionDetails: async (hash: string) => {
      const { setTransactionDetails, setDetailsLoading, setDetailsError, getCached, setCached } = get();
      
      setDetailsLoading(true);
      setDetailsError(null);
      
      try {
        const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
        const cacheKey = `txDetails_${cleanHash}`;
        
        // Check cache first
        const cachedData = getCached(cacheKey);
        if (cachedData) {
          setTransactionDetails(cachedData);
          setDetailsLoading(false);
          return;
        }

        console.log(`🔍 Searching for transaction: ${cleanHash}`);
        
        // Strategy 1: Search recent transactions (fastest)
        let found = get().searchTransactionInRecentBlocks(cleanHash);
        
        // Strategy 2: Search recent blocks if not found
        if (!found) {
          console.log('🔍 Not in recent data, searching blockchain...');
          found = await get().searchTransactionByHash(cleanHash, 500);
        }
        
        // Strategy 3: Extended search if still not found
        if (!found) {
          console.log('🔍 Extending search to 1000 blocks...');
          found = await get().searchTransactionByHash(cleanHash, 1000);
        }
        
        if (found) {
          setTransactionDetails(found);
          setCached(cacheKey, found, 300000); // Cache for 5 minutes
        } else {
          setDetailsError(`Transaction ${cleanHash} not found. It may be in a block older than 1000 blocks ago, or the hash may be incorrect.`);
        }
        
      } catch (error: any) {
        console.error('❌ Error fetching transaction details:', error);
        setDetailsError(`Error searching for transaction: ${error.message}`);
      } finally {
        setDetailsLoading(false);
      }
    },

    refreshTransactionData: async () => {
      const { clearCache, fetchTransactionData, setTransactionData } = get();
      clearCache();
      setTransactionData({ transactions: [], blocks: [], lastUpdated: 0 });
      await fetchTransactionData();
    },

    // Caching
    getCached: (key: string) => {
      const { cache } = get();
      const cached = cache.get(key);
      
      if (!cached) return null;
      
      const now = Date.now();
      if (now - cached.timestamp > cached.ttl) {
        cache.delete(key);
        return null;
      }
      
      return cached.data;
    },

    setCached: (key: string, data: any, ttl: number = CACHE_TTL) => {
      const { cache } = get();
      cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });
    },

    clearCache: () => {
      set({ cache: new Map() });
    },

    clearTransactionCache: () => {
      const { cache } = get();
      // Clear only transaction-related cache entries
      const keysToDelete = Array.from(cache.keys()).filter(key => 
        key.startsWith('transactionData') || key.startsWith('txDetails_')
      );
      keysToDelete.forEach(key => cache.delete(key));
    },

    // Search Methods
    getTransactionByHash: (hash: string) => {
      const { transactionData } = get();
      return transactionData.transactions.find(tx => tx.hash.toLowerCase() === hash.toLowerCase());
    },

    searchTransactionInRecentBlocks: (hash: string) => {
      const { transactionData } = get();
      const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
      
      console.log(`🔍 Searching recent transactions for hash: ${cleanHash}`);
      
      const found = transactionData.transactions.find(tx => 
        tx.hash.toLowerCase() === cleanHash.toLowerCase()
      );
      
      if (found) {
        console.log('✅ Found transaction in recent data:', found);
        return {
          ...found,
          events: [],
          error: null,
          nonce: 0,
          tip: '0',
          era: 0,
          signature: '',
          isDecoded: true,
          decodedArgs: [],
          txType: found.txType || `${found.section}.${found.method}`
        } as TransactionDetails;
      }
      
      console.log('❌ Transaction not found in recent data');
      return null;
    },

    searchTransactionByHash: async (hash: string, maxBlocks: number = 1000) => {
      const { api, apiState } = useApiStore.getState();
      
      if (!api || apiState.status !== 'connected') {
        throw new Error('Not connected to network');
      }

      const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
      console.log(`🔍 Extensive search for transaction: ${cleanHash}`);
      
      try {
        // Step 1: Check recent transactions first (fastest)
        const recentFound = get().searchTransactionInRecentBlocks(cleanHash);
        if (recentFound) {
          return recentFound;
        }

        // Step 2: Search recent blocks
        const finalizedHead = await api.rpc.chain.getFinalizedHead();
        const finalizedBlock = await api.rpc.chain.getBlock(finalizedHead);
        const latestBlockNumber = finalizedBlock.block.header.number.toNumber();
        
        console.log(`🔍 Searching last ${maxBlocks} blocks from ${latestBlockNumber}...`);
        
        const CONCURRENCY = 20;
        const blockNumbers = Array.from({ length: maxBlocks }, (_, i) => latestBlockNumber - i)
          .filter(n => n >= 0);
        
        for (let i = 0; i < blockNumbers.length; i += CONCURRENCY) {
          const batch = blockNumbers.slice(i, i + CONCURRENCY);
          console.log(`🔍 Searching blocks ${batch[0]} to ${batch[batch.length - 1]}...`);
          
          const results = await Promise.allSettled(
            batch.map(blockNumber => searchTransactionInBlock(api, blockNumber, cleanHash))
          );
          
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
              console.log('✅ Found transaction!', result.value);
              return result.value;
            }
          }
          
          if (i + CONCURRENCY < blockNumbers.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        console.log(`❌ Transaction ${cleanHash} not found in last ${maxBlocks} blocks`);
        return null;
        
      } catch (error: any) {
        console.error('❌ Error searching for transaction:', error);
        throw error;
      }
    },

    searchTransactionExtensive: async (hash: string) => {
      return get().searchTransactionByHash(hash, 2000);
    },

    // Enhanced Actions
    forceRefreshTransactionData: async () => {
      const { clearTransactionCache, setTransactionData, fetchTransactionData } = get();
      
      console.log('🔄 Force refreshing transaction data...');
      clearTransactionCache();
      setTransactionData({ transactions: [], blocks: [], lastUpdated: 0 });
      await fetchTransactionData();
    },
  }))
);

// Helper function to search for transaction in a specific block
async function searchTransactionInBlock(
  api: ApiPromise, 
  blockNumber: number, 
  targetHash: string
): Promise<TransactionDetails | null> {
  try {
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const block = await api.rpc.chain.getBlock(blockHash);
    const extrinsics = block.block.extrinsics;
    
    for (let index = 0; index < extrinsics.length; index++) {
      const ext = extrinsics[index];
      if (ext.hash.toHex().toLowerCase() === targetHash.toLowerCase()) {
        let timestamp: Date | null = null;
        const timestampExtrinsic = extrinsics.find(ext2 => 
          ext2.method.section === 'timestamp' && ext2.method.method === 'set'
        );
        if (timestampExtrinsic) {
          const timestampArg = timestampExtrinsic.method.args[0];
          timestamp = new Date(Number(timestampArg.toString()));
        }
        
        let events: any[] = [];
        try {
          const rawEvents = await api.query.system.events.at(blockHash);
          const humanEvents = rawEvents?.toHuman?.() ?? [];
          events = Array.isArray(humanEvents) ? humanEvents : [];
        } catch (e) {
          console.warn('Could not fetch events for transaction');
        }
        
        let fee = '0';
        try {
          const info = await api.rpc.payment.queryInfo(ext.toHex(), blockHash);
          fee = info.partialFee?.toString() || '0';
        } catch (e) {
          console.warn('Could not fetch fee info for transaction');
        }
        
        return {
          hash: targetHash,
          blockNumber,
          blockHash: blockHash.toHex(),
          index,
          method: ext.method.method,
          section: ext.method.section,
          signer: ext.signer?.toString() || 'System',
          timestamp,
          success: true,
          fee,
          args: ext.method.args.map(arg => arg.toString()),
          events,
          error: null,
          nonce: (ext.nonce as any)?.toNumber?.() ?? 0,
          tip: (ext.tip as any)?.toString?.() ?? '0',
          era: (ext.era as any)?.toNumber?.() ?? 0,
          signature: (ext.signature as any)?.toString?.() ?? '',
          isDecoded: true,
          decodedArgs: ext.method.args.map(arg => arg.toHuman?.() ?? arg.toString()),
          txType: getTxType(ext.method.section, ext.method.method)
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Error searching block ${blockNumber}:`, error);
    return null;
  }
}

// Helper function to get transaction type
function getTxType(section: string, method: string): string {
  if (section === 'balances') {
    if (method === 'transfer') return 'Transfer';
    if (method === 'transferKeepAlive') return 'Transfer (Keep Alive)';
    if (method === 'transferAllowDeath') return 'Transfer (Allow Death)';
    if (method === 'forceTransfer') return 'Force Transfer';
    if (method === 'transferAll') return 'Transfer All';
    if (method === 'forceUnreserve') return 'Force Unreserve';
    return 'Balance Operation';
  }
  
  if (section === 'staking') {
    if (method === 'bond') return 'Stake';
    if (method === 'unbond') return 'Unstake';
    if (method === 'withdrawUnbonded') return 'Withdraw Unbonded';
    if (method === 'nominate') return 'Nominate';
    if (method === 'chill') return 'Chill';
    if (method === 'setPayee') return 'Set Payee';
    if (method === 'setController') return 'Set Controller';
    return 'Staking Operation';
  }
  
  if (section === 'system') {
    if (method === 'remark') return 'Remark';
    if (method === 'setCode') return 'Set Code';
    if (method === 'setCodeWithoutChecks') return 'Set Code (No Checks)';
    if (method === 'setStorage') return 'Set Storage';
    if (method === 'killStorage') return 'Kill Storage';
    if (method === 'killPrefix') return 'Kill Prefix';
    return 'System Operation';
  }
  
  if (section === 'session') {
    if (method === 'setKeys') return 'Set Session Keys';
    if (method === 'purgeKeys') return 'Purge Session Keys';
    return 'Session Operation';
  }
  
  if (section === 'democracy') {
    if (method === 'propose') return 'Democracy Proposal';
    if (method === 'second') return 'Second Proposal';
    if (method === 'vote') return 'Vote';
    if (method === 'emergencyCancel') return 'Emergency Cancel';
    if (method === 'externalPropose') return 'External Proposal';
    return 'Democracy Operation';
  }
  
  if (section === 'treasury') {
    if (method === 'proposeSpend') return 'Treasury Proposal';
    if (method === 'rejectProposal') return 'Reject Proposal';
    if (method === 'approveProposal') return 'Approve Proposal';
    return 'Treasury Operation';
  }
  
  if (section === 'utility') {
    if (method === 'batch') return 'Batch Call';
    if (method === 'batchAll') return 'Batch All';
    if (method === 'asDerivative') return 'As Derivative';
    return 'Utility Operation';
  }
  
  if (section === 'airdrop') return 'Airdrop';
  
  return `${section}.${method}`;
}

// Helper function to fetch transaction data with timeout
async function fetchTransactionDataWithTimeout(api: ApiPromise) {
  try {
    const finalizedHead = await api.rpc.chain.getFinalizedHead();
    const finalizedBlock = await api.rpc.chain.getBlock(finalizedHead);
    const latestBlockNumber = finalizedBlock.block.header.number.toNumber();
    
    const blockNumbers = Array.from({ length: 20 }, (_, i) => latestBlockNumber - i);
    const blocks: Block[] = [];
    const transactions: Transaction[] = [];
    
    const blockPromises = blockNumbers.map(async (blockNumber) => {
      try {
        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const block = await api.rpc.chain.getBlock(blockHash);
        
        let timestamp: Date | null = null;
        const timestampExtrinsic = block.block.extrinsics.find(ext => 
          ext.method.section === 'timestamp' && ext.method.method === 'set'
        );
        if (timestampExtrinsic) {
          const timestampArg = timestampExtrinsic.method.args[0];
          timestamp = new Date(Number(timestampArg.toString()));
        }
        
        const blockInfo = {
          height: blockNumber,
          hash: blockHash.toHex(),
          timestamp,
          txCount: block.block.extrinsics.length,
          proposer: 'Unknown',
          size: JSON.stringify(block.block).length.toString()
        };
        
        const blockTransactions = block.block.extrinsics.map((extrinsic, index) => {
          let fee = '0';
          try {
            if (extrinsic.method.section === 'balances' || extrinsic.method.section === 'system') {
              fee = '0.001';
            }
          } catch (e) {
            // Fee calculation failed
          }
          
          return {
            hash: extrinsic.hash.toHex(),
            blockNumber,
            blockHash: blockHash.toHex(),
            index,
            method: extrinsic.method.method,
            section: extrinsic.method.section,
            signer: extrinsic.signer?.toString() || 'System',
            timestamp,
            success: true,
            fee,
            args: extrinsic.method.args.map(arg => {
              const argStr = arg.toString();
              return argStr.length > 50 ? argStr.slice(0, 50) + '...' : argStr;
            }),
            txType: getTxType(extrinsic.method.section, extrinsic.method.method)
          };
        });
        
        return { blockInfo, transactions: blockTransactions };
      } catch (error) {
        console.warn(`Failed to fetch block ${blockNumber}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(blockPromises);
    
    results.forEach(result => {
      if (result) {
        blocks.push(result.blockInfo);
        transactions.push(...result.transactions);
      }
    });
    
    transactions.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return b.blockNumber - a.blockNumber;
      }
      return b.index - a.index;
    });
    
    blocks.sort((a, b) => b.height - a.height);
    
    return {
      transactions: transactions.slice(0, 100),
      blocks: blocks.slice(0, 20),
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    return {
      transactions: [],
      blocks: [],
      lastUpdated: Date.now()
    };
  }
}

// Global variable for real-time subscription
let realtimeSubscription: any = null;

// Real-time subscription setup
function setupRealtimeSubscriptions(api: ApiPromise) {
  // Clean up existing subscription
  if (realtimeSubscription) {
    realtimeSubscription.unsubscribe();
  }

  // Subscribe to new finalized blocks
  realtimeSubscription = api.rpc.chain.subscribeFinalizedHeads(async (header) => {
    try {
      const blockNumber = header.number.toNumber();
      const blockHash = header.hash;
      
      const block = await api.rpc.chain.getBlock(blockHash);
      
      let timestamp: Date | null = null;
      const timestampExtrinsic = block.block.extrinsics.find(ext => 
        ext.method.section === 'timestamp' && ext.method.method === 'set'
      );
      if (timestampExtrinsic) {
        const timestampArg = timestampExtrinsic.method.args[0];
        timestamp = new Date(Number(timestampArg.toString()));
      }

      const newBlock: Block = {
        height: blockNumber,
        hash: blockHash.toHex(),
        timestamp,
        txCount: block.block.extrinsics.length,
        proposer: 'Unknown',
        size: JSON.stringify(block.block).length.toString()
      };

      const newTransactions: Transaction[] = block.block.extrinsics.map((extrinsic, index) => {
        let fee = '0';
        try {
          if (extrinsic.method.section === 'balances' || extrinsic.method.section === 'system') {
            fee = '0.001';
          }
        } catch (e) {
          // Fee calculation failed
        }

        return {
          hash: extrinsic.hash.toHex(),
          blockNumber,
          blockHash: blockHash.toHex(),
          index,
          method: extrinsic.method.method,
          section: extrinsic.method.section,
          signer: extrinsic.signer?.toString() || 'System',
          timestamp,
          success: true,
          fee,
          args: extrinsic.method.args.map(arg => {
            const argStr = arg.toString();
            return argStr.length > 50 ? argStr.slice(0, 50) + '...' : argStr;
          }),
          txType: getTxType(extrinsic.method.section, extrinsic.method.method)
        };
      });

      const { transactionData, setTransactionData } = useTransactionStore.getState();
      
      const updatedBlocks = [newBlock, ...transactionData.blocks.slice(0, 19)];
      const updatedTransactions = [...newTransactions, ...transactionData.transactions.slice(0, 99)];
      
      setTransactionData({
        transactions: updatedTransactions,
        blocks: updatedBlocks,
        lastUpdated: Date.now()
      });

      console.log(`🔄 New block ${blockNumber} with ${newTransactions.length} transactions`);
      
    } catch (error) {
      console.error('Error processing new block:', error);
    }
  });

  console.log('✅ Real-time subscription set up');
}

// Auto-refresh transaction data
if (typeof window !== 'undefined') {
  setInterval(() => {
    const { apiState } = useApiStore.getState();
    const { fetchTransactionData } = useTransactionStore.getState();
    if (apiState.status === 'connected') {
      fetchTransactionData().catch(console.warn);
    }
  }, 10000);
} 