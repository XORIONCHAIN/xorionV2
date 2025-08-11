import { useState, useEffect, useContext, createContext, ReactNode, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FaWallet, FaCopy, FaSignOutAlt, FaGhost, FaSuitcase, FaKey, FaSpinner } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { usePolkadotStore } from '@/stores/polkadotStore';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

declare global {
  interface Window {
    injectedWeb3?: any; // Use 'any' if the exact type is unknown, or a more specific type if available.
  }
}

const WALLET_ICONS: Record<string, JSX.Element> = {
  'polkadot-js': <FaWallet className="w-5 h-5" />,
  'talisman': <FaGhost className="w-5 h-5" />,
  'subwallet-js': <FaSuitcase className="w-5 h-5" />,
  'default': <FaKey className="w-5 h-5" />,
};

const POPULAR_WALLETS = [
  { name: 'polkadot-js', title: 'Polkadot.js' },
  { name: 'talisman', title: 'Talisman' },
  { name: 'subwallet-js', title: 'SubWallet' },
];

// Optimized wallet cache with immediate initialization
class WalletCache {
  private cache = new Map<string, boolean>();
  private initialized = false;
  private observers: (() => void)[] = [];

  constructor() {
    // Initialize immediately when class is instantiated
    this.initialize();
  }

  private initialize() {
    if (this.initialized || typeof window === 'undefined') return;

    // Check synchronously for immediate results
    POPULAR_WALLETS.forEach(wallet => {
      const isInstalled = !!(window as any).injectedWeb3?.[wallet.name];
      this.cache.set(wallet.name, isInstalled);
    });

    this.initialized = true;
    this.notifyObservers();
  }

  isInstalled(walletName: string): boolean {
    if (!this.initialized) this.initialize();
    return this.cache.get(walletName) || false;
  }

  getInstalled(): string[] {
    if (!this.initialized) this.initialize();
    return POPULAR_WALLETS
      .filter(wallet => this.cache.get(wallet.name))
      .map(wallet => wallet.name);
  }

  refresh() {
    this.initialize();
  }

  subscribe(callback: () => void) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  private notifyObservers() {
    this.observers.forEach(callback => callback());
  }
}

// Global wallet cache instance
const walletCache = new WalletCache();

// Pre-enable web3 with debouncing
let web3EnablePromise: Promise<any> | null = null;
const enableWeb3 = () => {
  if (!web3EnablePromise) {
    web3EnablePromise = web3Enable('Xorion Blockchain Explorer')
      .catch(error => {
        console.warn('Web3 enable failed:', error);
        web3EnablePromise = null; // Reset on failure
        throw error;
      });
  }
  return web3EnablePromise;
};

// Wallet context types
export interface WalletContextType {
  selectedWallet: any | null;
  setSelectedWallet: (wallet: any | null) => void;
  selectedAccount: InjectedAccountWithMeta | null;
  setSelectedAccount: (account: InjectedAccountWithMeta | null) => void;
  balance: string | null;
  setBalance: (balance: string | null) => void;
  disconnectWallet: () => void;
}

export const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [selectedWallet, setSelectedWallet] = useState<any | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const disconnectWallet = useCallback(() => {
    setSelectedAccount(null);
    setSelectedWallet(null);
    setBalance(null);
  }, []);

  const contextValue = useMemo(() => ({
    selectedWallet,
    setSelectedWallet,
    selectedAccount,
    setSelectedAccount,
    balance,
    setBalance,
    disconnectWallet
  }), [selectedWallet, selectedAccount, balance, disconnectWallet]);

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

const STORAGE_KEY = 'walletConnection';
const saveWalletConnection = (wallet: any, account: InjectedAccountWithMeta) => {
  try {
    const data = {
      walletName: wallet.name,
      accountAddress: account.address,
      accountSource: account.meta.source,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save wallet connection:', e);
  }
};

const loadWalletConnection = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Failed to load wallet connection:', e);
    return null;
  }
};

const clearWalletConnection = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear wallet connection:', e);
  }
};

const WalletConnection = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<'wallets' | 'accounts' | 'summary'>('wallets');
  const [installedWallets, setInstalledWallets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { apiState, api } = usePolkadotStore();
  const { selectedWallet, setSelectedWallet, selectedAccount, setSelectedAccount, balance, setBalance, disconnectWallet } = useWallet();

  // Refs for optimization
  const balanceAbortControllerRef = useRef<AbortController | null>(null);
  const reconnectionAttemptedRef = useRef(false);
  const accountsFetchAbortRef = useRef<AbortController | null>(null);

  // Pre-enable web3 on component mount for faster subsequent operations
  useEffect(() => {
    enableWeb3().catch(() => {
      // Silently handle error, will retry when needed
    });
  }, []);

  // Optimized wallet detection with immediate cache response
  useEffect(() => {
    if (modalOpen && step === 'wallets') {
      // Immediately set installed wallets from cache
      const updateInstalledWallets = () => {
        const installedNames = walletCache.getInstalled();
        const installed = POPULAR_WALLETS
          .filter(wallet => installedNames.includes(wallet.name))
          .map(wallet => ({ ...wallet, installed: true }));

        setInstalledWallets(installed);
      };

      // Set initial state immediately
      updateInstalledWallets();

      // Subscribe to cache updates
      const unsubscribe = walletCache.subscribe(updateInstalledWallets);

      // Refresh cache in background (non-blocking)
      setTimeout(() => {
        walletCache.refresh();
      }, 0);

      return unsubscribe;
    }
  }, [modalOpen, step]);

  // Optimized reconnection logic
  useEffect(() => {
    console.log('API State:', apiState.status);
    console.log('Reconnection attempted:', reconnectionAttemptedRef.current);
    console.log('Saved connection:', loadWalletConnection());
    
    if (reconnectionAttemptedRef.current || apiState.status !== 'connected') return;

    const reconnectWallet = async () => {
      reconnectionAttemptedRef.current = true;
      console.log('Attempting reconnect...');
      const savedConnection = loadWalletConnection();
      console.log('Saved connection:', savedConnection);
      if (!savedConnection) return;

      const { walletName, accountAddress, accountSource } = savedConnection;

      // Fast check using cache
      if (!walletCache.isInstalled(walletName)) {
        clearWalletConnection();
        return;
      }

      try {
        // Use the pre-enabled web3 or enable it
        await enableWeb3();

        const wallet = POPULAR_WALLETS.find(w => w.name === walletName);
        if (!wallet) {
          clearWalletConnection();
          return;
        }

        setSelectedWallet({ ...wallet, installed: true });

        // Optimized account fetching with timeout
        const accountsPromise = web3Accounts({ extensions: [walletName] });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 2000)
        );

        const accounts = await Promise.race([accountsPromise, timeoutPromise]) as InjectedAccountWithMeta[];
        const matchingAccount = accounts.find(
          (acc: InjectedAccountWithMeta) =>
            acc.address === accountAddress && acc.meta.source === accountSource
        );

        if (matchingAccount) {
          setSelectedAccount(matchingAccount);
          setStep('summary');
        } else {
          clearWalletConnection();
          toast({
            title: 'Reconnection Failed',
            description: 'The previously connected account is not available.',
            variant: 'destructive',
          });
        }
      } catch (e) {
        console.warn('Reconnection failed:', e);
        clearWalletConnection();
        toast({
          title: 'Reconnection Failed',
          description: 'Could not reconnect to the wallet. Please connect manually.',
          variant: 'destructive',
        });
      }
    };

    reconnectWallet();
  }, [apiState.status, setSelectedWallet, setSelectedAccount, toast]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let attempts = 0;
    const maxAttempts = 20; // Stop after 10 seconds (20 * 500ms)

    const checkWalletReady = () => {
      attempts++;

      // Check if any wallet extensions are available
      const hasAnyWallet = POPULAR_WALLETS.some(wallet =>
        window.injectedWeb3?.[wallet.name]
      );

      if (hasAnyWallet) {
        // Refresh the wallet cache when wallets become available
        walletCache.refresh();
        console.log('Wallet extensions detected and cache refreshed');
        return; // Stop checking
      }

      // Continue checking if we haven't exceeded max attempts
      if (attempts < maxAttempts) {
        timeoutId = setTimeout(checkWalletReady, 500);
      } else {
        console.log('Stopped checking for wallets after', maxAttempts, 'attempts');
      }
    };

    // Only start checking if we're in the browser and no wallets are initially detected
    if (typeof window !== 'undefined') {
      const hasWallets = POPULAR_WALLETS.some(wallet =>
        window.injectedWeb3?.[wallet.name]
      );

      if (!hasWallets) {
        checkWalletReady();
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Ultra-optimized account fetching
  useEffect(() => {
    if (step === 'accounts' && selectedWallet) {
      setLoading(true);

      // Cancel previous request
      if (accountsFetchAbortRef.current) {
        accountsFetchAbortRef.current.abort();
      }

      accountsFetchAbortRef.current = new AbortController();
      const signal = accountsFetchAbortRef.current.signal;

      // Use the pre-enabled web3 and set shorter timeout
      Promise.race([
        web3Accounts({ extensions: [selectedWallet.name] }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
      ])
        .then((accs: any) => {
          if (!signal.aborted) {
            setAccounts(accs);
          }
        })
        .catch((error) => {
          if (!signal.aborted) {
            console.warn('Account fetch failed:', error);
            toast({
              title: 'Error',
              description: 'Failed to fetch accounts. Please unlock your wallet and try again.',
              variant: 'destructive',
            });
            setAccounts([]);
          }
        })
        .finally(() => {
          if (!signal.aborted) {
            setLoading(false);
          }
        });

      return () => {
        if (accountsFetchAbortRef.current) {
          accountsFetchAbortRef.current.abort();
        }
      };
    }
  }, [step, selectedWallet, toast]);

  // Optimized balance fetching with caching
  const balanceCache = useRef<Map<string, { balance: string; timestamp: number }>>(new Map());

  useEffect(() => {
    if (api && apiState.status === 'connected' && selectedAccount && modalOpen) {
      // Check cache first (5 second cache)
      const cached = balanceCache.current.get(selectedAccount.address);
      if (cached && Date.now() - cached.timestamp < 5000) {
        setBalance(cached.balance);
        return;
      }

      // Cancel previous balance request
      if (balanceAbortControllerRef.current) {
        balanceAbortControllerRef.current.abort();
      }

      balanceAbortControllerRef.current = new AbortController();
      const signal = balanceAbortControllerRef.current.signal;

      api.query.system.account(selectedAccount.address)
        .then((info: any) => {
          if (!signal.aborted) {
            const balance = info.data.free.toString();
            setBalance(balance);
            // Cache the result
            balanceCache.current.set(selectedAccount.address, {
              balance,
              timestamp: Date.now()
            });
          }
        })
        .catch((e: any) => {
          if (!signal.aborted) {
            console.warn('Balance fetch failed:', e.message);
          }
        });
    }

    return () => {
      if (balanceAbortControllerRef.current) {
        balanceAbortControllerRef.current.abort();
      }
    };
  }, [api, apiState.status, selectedAccount, modalOpen]);

  const handleWalletSelect = useCallback(async (wallet: any) => {
    setSelectedWallet(wallet);
    setStep('accounts');

    // Pre-fetch accounts immediately to reduce perceived delay
    setLoading(true);
    try {
      await enableWeb3(); // Ensure web3 is enabled
      const accounts = await Promise.race([
        web3Accounts({ extensions: [wallet.name] }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
      ]) as InjectedAccountWithMeta[];

      setAccounts(accounts);
    } catch (error) {
      console.warn('Pre-fetch accounts failed:', error);
      // Will be handled by the useEffect
    } finally {
      setLoading(false);
    }
  }, [setSelectedWallet]);

  const handleAccountSelect = useCallback((account: InjectedAccountWithMeta) => {
    setSelectedAccount(account);
    setStep('summary');
    saveWalletConnection(selectedWallet, account);
    toast({
      title: 'Connected',
      description: `Connected to ${account.meta.name || 'Account'}`,
    });
  }, [setSelectedAccount, selectedWallet, toast]);

  const handleDisconnect = useCallback(() => {
    disconnectWallet();
    setAccounts([]);
    setStep('wallets');
    setModalOpen(false);
    clearWalletConnection();
    // Clear balance cache
    balanceCache.current.clear();
    toast({
      title: 'Disconnected',
      description: 'Wallet disconnected',
    });
  }, [disconnectWallet, toast]);

  const handleSwitchAccount = useCallback(() => {
    setStep('accounts');
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Address copied to clipboard',
    });
  }, [toast]);

  const formatShort = useCallback((address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`, []);

  const getNetworkName = useCallback(() => {
    if (!api) return 'Unknown';
    try {
      const chain = api.genesisHash?.toHex();
      if (chain === '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3') return 'Polkadot';
      if (chain === '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e') return 'Westend';
      if (chain === '0x67dddf2673b69e5f875f6f252774958c98deac9b') return 'Kusama';
      return 'Xorion Network';
    } catch {
      return 'Unknown';
    }
  }, [api]);

  // Memoize expensive calculations
  const { notInstalled, installedNames } = useMemo(() => {
    const installedNames = installedWallets.map(wallet => wallet.name);
    const notInstalled = POPULAR_WALLETS.filter(wallet => !installedNames.includes(wallet.name));
    return { notInstalled, installedNames };
  }, [installedWallets]);

  const formattedBalance = useMemo(() => {
    if (!balance) return null;
    return (Number(balance) / 1e18).toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8
    });
  }, [balance]);

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        variant="outline"
        className="flex items-center space-x-2 bg-blue-300 hover:bg-blue-500 text-white"
        disabled={apiState.status !== 'connected'}
      >
        <FaWallet className="w-4 h-4" />
        <span>{selectedAccount ? formatShort(selectedAccount.address) : 'Connect Wallet'}</span>
      </Button>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {step === 'wallets' && 'Connect a Wallet'}
              {step === 'accounts' && 'Select Account'}
              {step === 'summary' && 'Wallet Connected'}
            </DialogTitle>
            <DialogDescription className="text-white">
              {step === 'wallets' && 'Choose a wallet extension to connect.'}
              {step === 'accounts' && selectedWallet && `Select an account from ${selectedWallet.title || selectedWallet.name}.`}
              {step === 'summary' && 'You are connected. You can switch account or disconnect.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Wallets */}
          {step === 'wallets' && (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold text-green-600 mb-1">Installed</div>
                {installedWallets.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No Polkadot wallet extensions found.
                    <br />
                    <span className="text-xs">Please install a wallet extension first.</span>
                  </div>
                )}
                {installedWallets.map((wallet) => (
                  <Button
                    key={wallet.name}
                    variant="outline"
                    className="w-full flex text-white items-center justify-start gap-3 mb-2"
                    onClick={() => handleWalletSelect(wallet)}
                  >
                    {WALLET_ICONS[wallet.name] || WALLET_ICONS['default']}
                    <span className="font-medium">{wallet.title}</span>
                    <Badge variant="outline" className="ml-auto text-green-600 border-green-200">
                      Installed
                    </Badge>
                  </Button>
                ))}
              </div>

              {notInstalled.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-blue-600 mb-1">Popular</div>
                  {notInstalled.map((wallet) => (
                    <Button
                      key={wallet.name}
                      variant="outline"
                      className="w-full text-white flex items-center justify-start gap-3 mb-2 opacity-60 cursor-not-allowed"
                      disabled
                    >
                      {WALLET_ICONS[wallet.name] || WALLET_ICONS['default']}
                      <span className="font-medium">{wallet.title}</span>
                      <Badge variant="outline" className="ml-auto text-gray-500">
                        Not Installed
                      </Badge>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Accounts */}
          {step === 'accounts' && (
            <div className="space-y-3">
              {loading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <FaSpinner className="animate-spin w-8 h-8 mb-2 text-blue-500" />
                  <div className="text-sm text-muted-foreground">Loading accounts...</div>
                </div>
              )}
              {!loading && accounts.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No accounts found in this wallet.
                  <br />
                  <span className="text-xs">Make sure your wallet is unlocked.</span>
                </div>
              )}
              {!loading && accounts.map((account, idx) => (
                <Button
                  key={account.address}
                  variant="outline"
                  className="w-full flex items-center justify-between"
                  onClick={() => handleAccountSelect(account)}
                >
                  <div className="flex items-center gap-2">
                    {WALLET_ICONS[selectedWallet?.name] || WALLET_ICONS['default']}
                    <span>{account.meta.name || `Account ${idx + 1}`}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{formatShort(account.address)}</span>
                </Button>
              ))}
              <Button variant="ghost" className="w-full mt-2" onClick={() => setStep('wallets')}>
                Back to Wallets
              </Button>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 'summary' && selectedAccount && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {WALLET_ICONS[selectedWallet?.name] || WALLET_ICONS['default']}
                <span className="font-medium">{selectedAccount.meta.name || selectedAccount.meta.source}</span>
                <Badge className="bg-primary text-white border-primary/30 ml-2">Connected</Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Wallet</div>
                <div className="text-white capitalize">{(selectedAccount.meta.source || '').replace('-', ' ')}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Network</div>
                <div className="text-white">{getNetworkName()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Address</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{formatShort(selectedAccount.address)}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(selectedAccount.address)} className="h-6 w-6 p-0">
                    <FaCopy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {formattedBalance && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Balance</div>
                  <div className="text-lg font-bold text-white">
                    {formattedBalance} tXOR
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={handleSwitchAccount} className="w-full">
                  Switch Account
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect} className="w-full">
                  <FaSignOutAlt className="w-3 h-3 mr-1" />
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletConnection;
