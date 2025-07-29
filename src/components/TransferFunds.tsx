import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FaArrowRight, FaWallet, FaCoins, FaExchangeAlt, FaCheckCircle, FaTimesCircle, FaUsers, FaInfoCircle } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { formatBalance } from '@polkadot/util';
import { cn } from '@/lib/utils';
import BN from 'bn.js';
import { usePolkadotStore } from '@/stores/polkadotStore';
const XORION_CHAIN_CONFIG = {
  name: 'XOR',            // Changed from 'Xorion Chain'
  symbol: 'tXOR',         // Changed from 'XOR'
  decimals: 18,           // Remains 18
  endpoint: import.meta.env.VITE_XORION_WS || "ws://3.219.48.230:9944", // Use env variable
  ss58Format: 42,         // Unchanged
  existentialDeposit: new BN('0'), // No minimum required to keep account alive
  unit: new BN('1000000000000000000'), // 1 tXOR == 1e18 ions (planck)
  runtimeVersion: 100,    // Unchanged
};

interface TransferHistoryItem {
  id: number;
  from: string;
  to: string;
  amount: string;
  token: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
  hash: string;
  blockHash?: string;
  blockNumber?: number;
}

// Helper to format tXOR balances
const formatToken = (amount: string | BN | number, decimals = 18, unit = 'tXOR', decimalsToShow = 6) => {
  if (amount == null) return `0 ${unit}`;
  const divisor = Math.pow(10, decimals);
  const display = Number(amount) / divisor;
  return `${display.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimalsToShow })} ${unit}`;
};

const TransferFunds = () => {
  const { toast } = useToast();
  
  // Use your existing Polkadot store instead of creating new connections
  const { 
    api, 
    apiState, 
    connect, 
    disconnect 
  } = usePolkadotStore();
  
  // Local component state - only UI specific
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [transferableBalance, setTransferableBalance] = useState<string>('0');
  const [lockedBalance, setLockedBalance] = useState<string>('0');
  
  // Transfer state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferHistoryItem[]>([]);
  const [transferType, setTransferType] = useState<'transferKeepAlive' | 'transferAllowDeath'>('transferKeepAlive');

  // Memoized connection status
  const isConnected = useMemo(() => apiState.status === 'connected', [apiState.status]);
  const connectionStatus = useMemo(() => apiState.status, [apiState.status]);

  // Load wallet accounts ONLY once when component mounts
  useEffect(() => {
    let mounted = true;
    
    const loadAccounts = async () => {
      try {
        // Check if accounts are already loaded
        if (accounts.length > 0) return;
        
        const extensions = await web3Enable('xorion-transfer-app');
        if (extensions.length === 0) {
          throw new Error('No Polkadot.js extension found');
        }
        
        const allAccounts = await web3Accounts();
        
        if (mounted) {
          setAccounts(allAccounts);
          if (allAccounts.length > 0 && !selectedAccount) {
            setSelectedAccount(allAccounts[0]);
          }
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
        if (mounted) {
          toast({
            title: 'Wallet Error',
            description: 'Failed to load wallet accounts. Please install Polkadot.js extension.',
            variant: 'destructive'
          });
        }
      }
    };

    loadAccounts();
    
    return () => {
      mounted = false;
    };
  }, []); // Only run once

  // Connect to chain ONLY if not already connected
  useEffect(() => {
    if (apiState.status === 'disconnected') {
      connect();
    }
  }, [apiState.status, connect]);

  // Fetch account balance - optimized with useCallback
  const fetchAccountInfo = useCallback(async () => {
    if (!api || !selectedAccount || !isConnected) return;

    try {
      const { data: { free, reserved, frozen } } = await api.query.system.account(selectedAccount.address);
      
      let stakingLocked = new BN(0);
      try {
        const stakingLedger = await api.query.staking.ledger(selectedAccount.address);
        if (stakingLedger.isSome) {
          const ledger = stakingLedger.unwrap();
          stakingLocked = ledger.total;
        }
      } catch (e) {
        // Account not staking
      }
      
      setBalance(free.toString());
      const totalLocked = BN.max(frozen, reserved, stakingLocked);
      setLockedBalance(totalLocked.toString());
      
      const transferableKeepAlive = free.sub(totalLocked).sub(XORION_CHAIN_CONFIG.existentialDeposit);
      setTransferableBalance(transferableKeepAlive.isNeg() ? '0' : transferableKeepAlive.toString());
      
    } catch (error) {
      console.error('Error fetching account info:', error);
      setBalance('0');
      setTransferableBalance('0');
      setLockedBalance('0');
    }
  }, [api, selectedAccount, isConnected]);

  // Fetch balance with optimized interval
  useEffect(() => {
    if (!isConnected || !selectedAccount) return;
    
    fetchAccountInfo();
    
    // Only set interval if we have a connected API and selected account
    const interval = setInterval(fetchAccountInfo, 15000); // Increased to 15s
    
    return () => clearInterval(interval);
  }, [fetchAccountInfo, isConnected, selectedAccount]);

  // Validate address - memoized
  const validateAddress = useCallback((address: string): boolean => {
    try {
      if (!api) return false;
      api.createType('AccountId', address);
      return address.length >= 47 && address.length <= 48;
    } catch {
      return false;
    }
  }, [api]);

  // Convert tXOR amount to ions - memoized
  const tXORToIons = useCallback((amount: string): BN => {
    if (!amount || amount === '0' || amount === '') return new BN(0);
    
    try {
      const cleanAmount = amount.replace(/,/g, '');
      const numAmount = parseFloat(cleanAmount);
      
      if (!isFinite(numAmount) || numAmount < 0) return new BN(0);
      
      const strAmount = numAmount.toFixed(18);
      const [whole, decimal = ''] = strAmount.split('.');
      
      const wholeBN = new BN(whole).mul(XORION_CHAIN_CONFIG.unit);
      
      let decimalBN = new BN(0);
      if (decimal && decimal !== '000000000000000000') {
        const decimalPadded = decimal.padEnd(18, '0');
        decimalBN = new BN(decimalPadded);
      }
      
      return wholeBN.add(decimalBN);
    } catch (error) {
      console.error('Error converting tXOR to ions:', error);
      return new BN(0);
    }
  }, []);

  // Convert ions back to tXOR - memoized
  const ionsToTXOR = useCallback((ions: BN): string => {
    if (ions.isZero()) return '0';
    
    const wholePart = ions.div(XORION_CHAIN_CONFIG.unit);
    const decimalPart = ions.mod(XORION_CHAIN_CONFIG.unit);
    
    if (decimalPart.isZero()) {
      return wholePart.toString();
    }
    
    const decimalStr = decimalPart.toString().padStart(18, '0');
    const trimmedDecimal = decimalStr.replace(/0+$/, '');
    
    if (trimmedDecimal === '') {
      return wholePart.toString();
    }
    
    return `${wholePart.toString()}.${trimmedDecimal}`;
  }, []);

  // Calculate maximum transferable amount - memoized
  const getMaxTransferableAmount = useCallback((): BN => {
    if (!selectedAccount || !balance) return new BN(0);
    
    const freeBN = new BN(balance);
    const lockedBN = new BN(lockedBalance);
    
    if (transferType === 'transferKeepAlive') {
      const maxAmount = freeBN.sub(lockedBN).sub(XORION_CHAIN_CONFIG.existentialDeposit);
      return maxAmount.isNeg() ? new BN(0) : maxAmount;
    } else {
      const maxAmount = freeBN.sub(lockedBN);
      return maxAmount.isNeg() ? new BN(0) : maxAmount;
    }
  }, [selectedAccount, balance, lockedBalance, transferType]);

  // Set maximum amount
  const setMaxAmount = useCallback(() => {
    const maxBN = getMaxTransferableAmount();
    const maxInTXOR = ionsToTXOR(maxBN);
    setAmount(maxInTXOR);
  }, [getMaxTransferableAmount, ionsToTXOR]);

  // Validate transfer amount - memoized
  const validateTransferAmount = useCallback((amountStr: string): { isValid: boolean; error?: string } => {
    if (!amountStr || amountStr === '') {
      return { isValid: true };
    }
    
    try {
      const numAmount = parseFloat(amountStr.replace(/,/g, ''));
      
      if (!isFinite(numAmount) || numAmount <= 0) {
        return { isValid: false, error: 'Amount must be a positive number' };
      }
      
      const amountInIons = tXORToIons(amountStr);
      const availableInIons = new BN(transferableBalance);
      
      if (amountInIons.gt(availableInIons)) {
        const availableInTXOR = ionsToTXOR(availableInIons);
        return { isValid: false, error: `Insufficient balance. Available: ${availableInTXOR} tXOR` };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid number format' };
    }
  }, [tXORToIons, transferableBalance, ionsToTXOR]);

  // Handle transfer - optimized
  const handleTransfer = useCallback(async () => {
    if (!api || !selectedAccount || !isConnected) {
      toast({ title: 'Not Connected', description: 'Please ensure wallet and chain are connected', variant: 'destructive' });
      return;
    }

    if (!recipient || !amount) {
      toast({ title: 'Missing Information', description: 'Please enter recipient address and amount', variant: 'destructive' });
      return;
    }

    if (!validateAddress(recipient)) {
      toast({ title: 'Invalid Address', description: 'Please enter a valid Substrate address', variant: 'destructive' });
      return;
    }

    const validation = validateTransferAmount(amount);
    if (!validation.isValid) {
      toast({ title: 'Invalid Amount', description: validation.error, variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const amountInIons = tXORToIons(amount);
      
      const transfer = transferType === 'transferKeepAlive' 
        ? api.tx.balances.transferKeepAlive(recipient, amountInIons)
        : api.tx.balances.transferAllowDeath(recipient, amountInIons);
      
      const { partialFee } = await transfer.paymentInfo(selectedAccount.address);
      
      const totalRequired = amountInIons.add(partialFee);
      const availableForFees = new BN(balance).sub(new BN(lockedBalance));
      
      if (transferType === 'transferKeepAlive') {
        const afterTransferBalance = availableForFees.sub(totalRequired);
        if (afterTransferBalance.lt(XORION_CHAIN_CONFIG.existentialDeposit)) {
          const requiredTXOR = ionsToTXOR(totalRequired.add(XORION_CHAIN_CONFIG.existentialDeposit));
          toast({ 
            title: 'Insufficient Balance', 
            description: `Need ${requiredTXOR} tXOR including fees and minimum balance`,
            variant: 'destructive' 
          });
          setLoading(false);
          return;
        }
      }

      const injector = await web3FromSource(selectedAccount.meta.source);

      const pendingTransfer: TransferHistoryItem = {
        id: Date.now(),
        from: selectedAccount.address,
        to: recipient,
        amount: amount,
        token: XORION_CHAIN_CONFIG.symbol,
        status: 'pending',
        timestamp: new Date(),
        hash: ''
      };
      setTransferHistory(prev => [pendingTransfer, ...prev]);

      const unsub = await transfer.signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        ({ status, dispatchError, txHash }) => {
          if (status.isInBlock) {
            toast({ 
              title: 'Transaction In Block', 
              description: `Transaction included in block ${status.asInBlock.toString().slice(0, 10)}...` 
            });

            setTransferHistory(prev => 
              prev.map(tx => 
                tx.id === pendingTransfer.id 
                  ? { 
                      ...tx, 
                      hash: txHash.toHex(), 
                      blockHash: status.asInBlock.toString()
                    }
                  : tx
              )
            );
          }

          if (status.isFinalized) {
            if (dispatchError) {
              let errorMessage = 'Transaction failed';
              
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              }

              setTransferHistory(prev => 
                prev.map(tx => 
                  tx.id === pendingTransfer.id 
                    ? { ...tx, status: 'failed' as const }
                    : tx
                )
              );

              toast({ 
                title: 'Transfer Failed', 
                description: errorMessage, 
                variant: 'destructive' 
              });
            } else {
              setTransferHistory(prev => 
                prev.map(tx => 
                  tx.id === pendingTransfer.id 
                    ? { ...tx, status: 'success' as const, hash: txHash.toHex() }
                    : tx
                )
              );

              toast({ 
                title: 'Transfer Successful', 
                description: `Successfully sent ${amount} tXOR` 
              });

              setAmount('');
              setRecipient('');
            }

            setLoading(false);
            unsub();
          }
        }
      );

    } catch (error: any) {
      console.error('Transfer error:', error);
      
      setTransferHistory(prev => 
        prev.map(tx => 
          tx.timestamp.getTime() === Date.now() 
            ? { ...tx, status: 'failed' as const }
            : tx
        )
      );

      toast({ 
        title: 'Transfer Error', 
        description: error.message || 'An unexpected error occurred', 
        variant: 'destructive' 
      });
      setLoading(false);
    }
  }, [api, selectedAccount, isConnected, recipient, amount, validateAddress, validateTransferAmount, transferType, tXORToIons, balance, lockedBalance, ionsToTXOR, toast]);

  // Utility functions - memoized
  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <FaTimesCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />;
    }
  }, []);

  // Get amount validation state - memoized
  const getAmountValidation = useCallback(() => {
    if (!amount || amount === '' || !selectedAccount) return null;
    return validateTransferAmount(amount);
  }, [amount, selectedAccount, validateTransferAmount]);

  // Optimized loading state
  if (connectionStatus === 'connecting' || connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-card p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">
              {connectionStatus === 'connecting' ? 'Connecting to Xorion' : 'Initializing...'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {connectionStatus === 'connecting' ? 'Establishing connection to Xorion chain...' : 'Please wait...'}
            </p>
            <div className="text-xs text-muted-foreground">
              Endpoint: {XORION_CHAIN_CONFIG.endpoint}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen bg-card p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2 text-red-500">Connection Failed</h3>
            <p className="text-muted-foreground mb-4">Failed to connect to the Xorion blockchain</p>
            <Button onClick={() => connect()} variant="outline">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountValidation = getAmountValidation();

  return (
    <div className="min-h-screen glass-card p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Xorion Transfer</h1>
            <p className="text-white">Send XOR tokens across the Xorion network</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge className="bg-blue-500 text-white">
              v{XORION_CHAIN_CONFIG.runtimeVersion}
            </Badge>
            {selectedAccount && (
              <Badge className="bg-primary text-white">
                {selectedAccount.meta.name || 'Wallet'}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transfer Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <FaExchangeAlt className="w-5 h-5 text-white" />
                  <span>Send XOR</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Account Selection */}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">From Account</label>
                  <Select 
                    value={selectedAccount?.address || ''} 
                    onValueChange={(address) => {
                      const account = accounts.find(acc => acc.address === address);
                      setSelectedAccount(account || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.address} value={account.address}>
                          <div className="flex flex-col">
                            <div className="font-medium">
                              {account.meta.name || formatAddress(account.address)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatAddress(account.address)}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedAccount && (
                    <div className="mt-3 p-4 bg-muted/20 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between text-white">
                        <span>Total Balance:</span>
                        <span className="font-mono">{formatBalance(balance, { decimals: 18, withUnit: 'tXOR' })}</span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>Available:</span>
                        <span className="font-mono text-green-400">
                          {formatBalance(getMaxTransferableAmount(), { decimals: 18, withUnit: 'tXOR' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>Locked:</span>
                        <span className="font-mono text-orange-400">{formatBalance(lockedBalance, { decimals: 18, withUnit: 'tXOR' })}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transfer Type */}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">Transfer Type</label>
                  <Select value={transferType} onValueChange={(value: 'transferKeepAlive' | 'transferAllowDeath') => setTransferType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferKeepAlive">
                        <div>
                          <div>Keep Account Alive (Recommended)</div>
                          <div className="text-xs text-muted-foreground">Maintains minimum balance</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="transferAllowDeath">
                        <div>
                          <div>Allow Account Death</div>
                          <div className="text-xs text-muted-foreground">Can close account</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipient Address */}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">To Address</label>
                  <Input
                    placeholder="Enter recipient address (5... or 1...)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className={cn(
                      "font-mono text-sm",
                      recipient && !validateAddress(recipient) && "border-red-500"
                    )}
                  />
                  {recipient && !validateAddress(recipient) && (
                    <p className="text-sm text-red-500 mt-1">Invalid Substrate address format</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-sm font-medium text-white mb-2 block">Amount (XOR)</label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="0.000000000000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      step="0.000000000001"
                      min="0"
                      className={cn(
                        "font-mono",
                        amountValidation && !amountValidation.isValid && "border-red-500"
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={setMaxAmount}
                      className="px-3 whitespace-nowrap"
                    >
                      Max
                    </Button>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Available: {formatBalance(getMaxTransferableAmount(), { decimals: 18, withUnit: 'tXOR' })}
                    </div>
                    
                    {amountValidation && !amountValidation.isValid && (
                      <div className="text-sm text-red-500 flex items-center">
                        <FaTimesCircle className="w-3 h-3 mr-1" />
                        {amountValidation.error}
                      </div>
                    )}
                    
                    {amountValidation && amountValidation.isValid && amount && (
                      <div className="text-sm text-green-500 flex items-center">
                        <FaCheckCircle className="w-3 h-3 mr-1" />
                        Valid transfer amount
                      </div>
                    )}
                  </div>
                </div>

                {/* Transfer Button */}
                <Button 
                  onClick={handleTransfer} 
                  disabled={loading || !amount || !recipient || !validateAddress(recipient) || !selectedAccount || (amountValidation && !amountValidation.isValid)}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Transfer...
                    </>
                  ) : (
                    <>
                      <FaArrowRight className="w-4 h-4 mr-2" />
                      Send {amount || '0'} XOR
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Transfer History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <FaCoins className="w-5 h-5 text-white" />
                  <span>Recent Transfers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {transferHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FaCoins className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No transfers yet</p>
                    </div>
                  ) : (
                    transferHistory.slice(0, 10).map((transfer) => (
                      <div key={transfer.id} className="border border-border rounded-lg p-3 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(transfer.status)}
                            <span className="text-sm font-medium text-white">
                              {transfer.amount} {transfer.token}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {transfer.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>To: {formatAddress(transfer.to)}</div>
                          <div>Time: {transfer.timestamp.toLocaleString()}</div>
                          {transfer.hash && (
                            <div>Hash: {transfer.hash.slice(0, 10)}...</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chain Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <FaWallet className="w-5 h-5 text-white" />
                  <span>Chain Info</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white">Chain:</span>
                  <span className="font-medium text-white">{XORION_CHAIN_CONFIG.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white">Runtime:</span>
                  <span className="font-medium text-white">v{XORION_CHAIN_CONFIG.runtimeVersion}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white">Token:</span>
                  <span className="font-medium text-white">{XORION_CHAIN_CONFIG.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white">Status:</span>
                  <Badge className={isConnected ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-red-500/20 text-red-500 border-red-500/30"}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white">Decimals:</span>
                  <span className="font-medium text-white">{XORION_CHAIN_CONFIG.decimals}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white">Min. Balance:</span>
                  <span className="font-medium text-white">
                    {formatBalance(XORION_CHAIN_CONFIG.existentialDeposit, { decimals: 18, withUnit: 'tXOR' })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Staking Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <FaUsers className="w-5 h-5 text-white" />
                  <span>Staking Available</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This chain supports staking. You can stake your XOR tokens to earn rewards and help secure the network.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferFunds;