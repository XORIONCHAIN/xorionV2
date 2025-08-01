import { useState, useEffect, useContext, createContext, ReactNode, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FaWallet, FaCopy, FaSignOutAlt, FaGhost, FaSuitcase, FaKey, FaSpinner } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { usePolkadotStore } from '@/stores/polkadotStore';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

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

// Cache for wallet installation status
const walletCache = new Map<string, boolean>();
let cacheInitialized = false;

// Initialize wallet cache immediately
const initializeWalletCache = () => {
  if (cacheInitialized || typeof window === 'undefined') return;

  POPULAR_WALLETS.forEach(wallet => {
    walletCache.set(wallet.name, !!(window as any).injectedWeb3?.[wallet.name]);
  });
  cacheInitialized = true;
};

// Fast wallet check using cache
const checkWalletInstalled = (walletName: string): boolean => {
  if (!cacheInitialized) initializeWalletCache();
  return walletCache.get(walletName) || false;
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
  const web3EnabledRef = useRef(false);
  const balanceAbortControllerRef = useRef<AbortController | null>(null);
  const reconnectionAttemptedRef = useRef(false);

  // Pre-initialize wallet cache on component mount
  useEffect(() => {
    initializeWalletCache();
  }, []);

  useEffect(() => {
    if (reconnectionAttemptedRef.current || apiState.status !== 'connected') return;

    const reconnectWallet = async () => {
      reconnectionAttemptedRef.current = true;
      const savedConnection = loadWalletConnection();
      if (!savedConnection) return;

      const { walletName, accountAddress, accountSource } = savedConnection;

      // Check if the wallet is still installed
      if (!checkWalletInstalled(walletName)) {
        clearWalletConnection();
        return;
      }

      try {
        // Re-enable web3
        await web3Enable('Xorion Blockchain Explorer');
        web3EnabledRef.current = true;

        // Find the wallet in POPULAR_WALLETS
        const wallet = POPULAR_WALLETS.find(w => w.name === walletName);
        if (!wallet) {
          clearWalletConnection();
          return;
        }

        // Set the selected wallet
        setSelectedWallet({ ...wallet, installed: true });

        // Fetch accounts
        const accounts = await web3Accounts({ extensions: [walletName] });
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

  // Optimized wallet checking - no delays, immediate response
  useEffect(() => {
    if (modalOpen && step === 'wallets') {
      // Immediately check installed wallets from cache
      const installed = POPULAR_WALLETS.filter(wallet =>
        checkWalletInstalled(wallet.name)
      ).map(wallet => ({
        ...wallet,
        installed: true
      }));

      setInstalledWallets(installed);

      // Enable web3 in background if not already done
      if (!web3EnabledRef.current) {
        web3Enable('Xorion Blockchain Explorer').then(() => {
          web3EnabledRef.current = true;
          // Re-check after enabling (in case some wallets weren't detected initially)
          setTimeout(() => {
            const recheckInstalled = POPULAR_WALLETS.filter(wallet =>
              checkWalletInstalled(wallet.name)
            ).map(wallet => ({
              ...wallet,
              installed: true
            }));
            setInstalledWallets(recheckInstalled);
          }, 50);
        }).catch(() => {
          // Silently handle error, wallets already shown from cache
        });
      }
    }
  }, [modalOpen, step]);

  // Optimized account fetching
  useEffect(() => {
    if (step === 'accounts' && selectedWallet) {
      setLoading(true);

      // Use Promise.race to timeout after 3 seconds
      const fetchPromise = web3Accounts({ extensions: [selectedWallet.name] });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );

      Promise.race([fetchPromise, timeoutPromise])
        .then((accs: any) => {
          setAccounts(accs);
        })
        .catch(() => {
          toast({
            title: 'Error',
            description: 'Failed to fetch accounts. Please unlock your wallet.',
            variant: 'destructive',
          });
          setAccounts([]);
        })
        .finally(() => setLoading(false));
    }
  }, [step, selectedWallet, toast]);

  // Optimized balance fetching with abort controller
  useEffect(() => {
    if (api && apiState.status === 'connected' && selectedAccount && modalOpen) {
      // Cancel previous balance request
      if (balanceAbortControllerRef.current) {
        balanceAbortControllerRef.current.abort();
      }

      balanceAbortControllerRef.current = new AbortController();
      const signal = balanceAbortControllerRef.current.signal;

      api.query.system.account(selectedAccount.address)
        .then((info: any) => {
          if (!signal.aborted) {
            setBalance(info.data.free.toString());
          }
        })
        .catch((e: any) => {
          if (!signal.aborted) {
            console.warn('Balance fetch failed:', e.message);
            // Don't show toast for balance errors to avoid spam
          }
        });
    }

    return () => {
      if (balanceAbortControllerRef.current) {
        balanceAbortControllerRef.current.abort();
      }
    };
  }, [api, apiState.status, selectedAccount, modalOpen]);

  const handleWalletSelect = useCallback((wallet: any) => {
    setSelectedWallet(wallet);
    setStep('accounts');
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