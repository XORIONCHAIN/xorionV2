import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FaShieldAlt } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { usePolkadotStore } from '@/stores/polkadotStore';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import BN from 'bn.js';
import { TooltipProps } from 'recharts';

import AccountSelector from './AccountSelector';
import StakingOverview from './StakingOverview';
import StakingActions from './StakingActions';
import DelegationDistributionChart from './DelegationDistributionChart';

// Types
interface Validator {
  accountId: string;
  commission: number;
  totalStake: string;
  ownStake: string;
  nominatorCount: number;
  isActive: boolean;
}

interface UserStakingInfo {
  totalStaked: string;
  totalRewards: string;
  pendingRewards: string;
  delegations: Array<{
    validator: string;
    amount: string;
    rewards: string;
  }>;
}

// Fixed balance utilities - Using 18 decimals for XOR
const formatBalance = (balance: string, decimals: number = 18): string => {
  try {
    if (!balance || balance === "0") return "0";
    const balanceBN = new BN(balance);
    const divisor = new BN(10).pow(new BN(decimals));
    const result = balanceBN.div(divisor);
    return result.toString();
  } catch (error) {
    console.error('Error formatting balance:', error);
    return "0";
  }
};

const parseBalance = (amount: string, decimals: number = 18): string => {
  try {
    if (!amount || amount === "0") return "0";
    // Remove commas and handle decimal points properly
    const cleanAmount = amount.replace(/,/g, '');
    const parts = cleanAmount.split('.');
    let wholeNumber = parts[0] || '0';
    let decimalPart = parts[1] || '';
    
    // If decimal part is provided, adjust accordingly
    if (decimalPart.length > 0) {
      // Pad or truncate decimal part to match expected decimals
      decimalPart = decimalPart.padEnd(decimals, '0').substring(0, decimals);
      const wholeBN = new BN(wholeNumber);
      const decimalBN = new BN(decimalPart);
      const multiplier = new BN(10).pow(new BN(decimals));
      const wholePart = wholeBN.mul(multiplier);
      const decimalMultiplier = new BN(10).pow(new BN(decimals - decimalPart.length));
      const adjustedDecimal = decimalBN.mul(decimalMultiplier);
      return wholePart.add(adjustedDecimal).toString();
    } else {
      const amountBN = new BN(wholeNumber);
      const multiplier = new BN(10).pow(new BN(decimals));
      return amountBN.mul(multiplier).toString();
    }
  } catch (error) {
    console.error('Error parsing balance:', error);
    return "0";
  }
};

// Enhanced balance formatting for display
const formatBalanceForDisplay = (balance: string, decimals: number = 18): string => {
  try {
    if (!balance || balance === "0") return "0";
    const formatted = formatBalance(balance, decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return "0";
    if (num < 0.001) return "< 0.001";
    if (num < 1) return num.toFixed(6).replace(/\.?0+$/, '');
    if (num < 1000) return num.toFixed(3).replace(/\.?0+$/, '');
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  } catch (error) {
    console.error('Error formatting balance for display:', error);
    return "0";
  }
};

const StakingInterface = () => {
  const { toast } = useToast();
  const { apiState, api } = usePolkadotStore();
  
  // Account State
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [balance, setBalance] = useState("0");
  
  // Staking Data
  const [validators, setValidators] = useState<Validator[]>([]);
  const [userStaking, setUserStaking] = useState<UserStakingInfo>({
    totalStaked: "0",
    totalRewards: "0",
    pendingRewards: "0",
    delegations: [],
  });
  
  // UI State - Direct Staking
  const [selectedValidator, setSelectedValidator] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  
  // UI State - Pool Staking
  const [poolId, setPoolId] = useState("");
  const [poolStakeAmount, setPoolStakeAmount] = useState("");
  
  // UI State - Delegated Staking
  const [delegateAgent, setDelegateAgent] = useState("");
  const [delegateAmount, setDelegateAmount] = useState("");
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [isBonded, setIsBonded] = useState(false);
  const [stakingError, setStakingError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const apiConnected = !!api && apiState.status === 'connected';

  // Initialize wallet extension
  useEffect(() => {
    const initWallet = async () => {
      try {
        await web3Enable("Xorion Staking App");
        const allAccounts = await web3Accounts();
        setAccounts(allAccounts);
        if (allAccounts.length > 0) {
          setSelectedAccount(allAccounts[0]);
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
        toast({
          title: "Wallet Error",
          description: "Failed to connect to wallet extension",
          variant: "destructive"
        });
      }
    };
    
    initWallet();
  }, [toast]);

  // Separate balance fetching function
  const fetchBalance = useCallback(async () => {
    if (!apiConnected || !selectedAccount) return;
    
    try {
      const accountInfo = await api.query.system.account(selectedAccount.address);
      
      console.log('=== BALANCE DEBUG ===');
      console.log('Account info raw:', accountInfo.toString());
      console.log('Account info human:', accountInfo.toHuman?.());
      console.log('Account info JSON:', accountInfo.toJSON?.());
      
      let freeBalance = "0";
      
      // Multiple ways to extract balance
      if (accountInfo && accountInfo.data && accountInfo.data.free) {
        freeBalance = accountInfo.data.free.toString();
        console.log('Method 1 - Raw balance:', freeBalance);
      } else if (accountInfo.toJSON) {
        const json = accountInfo.toJSON() as any;
        if (json?.data?.free) {
          freeBalance = json.data.free.toString();
          console.log('Method 2 - JSON balance:', freeBalance);
        }
      } else if (accountInfo.toHuman) {
        const human = accountInfo.toHuman() as any;
        if (human?.data?.free) {
          // Convert human readable back to raw
          const humanBalance = human.data.free.toString().replace(/,/g, '');
          if (humanBalance.includes(' ')) {
            // Handle formatted balance like "1.234 kXOR"
            const numPart = humanBalance.split(' ')[0];
            freeBalance = parseBalance(numPart, 18);
          } else {
            freeBalance = parseBalance(humanBalance, 18);
          }
          console.log('Method 3 - Human balance:', humanBalance, '-> Raw:', freeBalance);
        }
      }
      
      const formattedBalance = formatBalanceForDisplay(freeBalance, 18);
      console.log('Final formatted balance:', formattedBalance);
      console.log('=== END BALANCE DEBUG ===');
      
      setBalance(freeBalance);
      
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance("0");
    }
  }, [api, apiConnected, selectedAccount]);

  // Fetch validators
  const fetchValidators = useCallback(async () => {
    if (!apiConnected) return;
    
    try {
      console.log('Fetching validators...');
      const activeValidators = await api.query.session.validators();
      let validatorList: any[] = [];
      
      if (Array.isArray(activeValidators)) {
        validatorList = activeValidators;
      } else if (activeValidators.toJSON) {
        const json = activeValidators.toJSON();
        if (Array.isArray(json)) {
          validatorList = json;
        } else {
          console.warn('Unexpected validators format:', json);
          validatorList = [];
        }
      }
      
      console.log('Found validators:', validatorList.length);
      
      const validatorsWithDetails = await Promise.all(
        validatorList.slice(0, 50).map(async (validatorId: any) => { // Limit to first 50 for performance
          try {
            const prefs = await api.query.staking.validators(validatorId);
            let commission = 0;
            
            if (prefs && prefs.toHuman) {
              const prefsHuman = prefs.toHuman() as { commission?: string };
              const commissionStr = String(prefsHuman?.commission || "0").replace("%", "");
              commission = parseFloat(commissionStr) || 0;
            }
            
            return {
              accountId: validatorId.toString(),
              commission,
              totalStake: "0",
              ownStake: "0",
              nominatorCount: 0,
              isActive: true,
            };
          } catch (error) {
            console.error(`Error fetching validator ${validatorId}:`, error);
            return {
              accountId: validatorId.toString(),
              commission: 0,
              totalStake: "0",
              ownStake: "0",
              nominatorCount: 0,
              isActive: true,
            };
          }
        })
      );
      
      setValidators(validatorsWithDetails);
      console.log('Validators loaded:', validatorsWithDetails.length);
      
    } catch (error) {
      console.error('Error fetching validators:', error);
      toast({
        title: "Fetch Error",
        description: "Failed to fetch validators",
        variant: "destructive"
      });
    }
  }, [api, apiConnected, toast]);

  // Enhanced user staking information fetching
  const fetchUserStaking = useCallback(async () => {
    if (!apiConnected || !selectedAccount) return;
    setStakingError(null);
    
    try {
      console.log('=== STAKING DEBUG ===');
      console.log('Fetching staking info for:', selectedAccount.address);
      
      // Check if account is bonded
      const bondedResult = await api.query.staking.bonded(selectedAccount.address);
      let totalStaked = "0";
      let isAccountBonded = false;
      let controller = null;
      
      console.log('Bonded result:', bondedResult.toHuman?.());
      
      // Handle bonded result
      if (bondedResult && !bondedResult.isEmpty) {
        const bondedJson = bondedResult.toJSON();
        console.log('Bonded JSON:', bondedJson);
        
        if (typeof bondedJson === 'string' && bondedJson) {
          isAccountBonded = true;
          controller = bondedJson;
        } else if (bondedJson && typeof bondedJson === 'object' && bondedJson !== null) {
          isAccountBonded = true;
          controller = bondedJson.toString();
        }
      }
      
      console.log('Is bonded:', isAccountBonded, 'Controller:', controller);
      
      // Get staking ledger if bonded
      if (controller) {
        try {
          const ledgerResult = await api.query.staking.ledger(controller);
          console.log('Ledger result:', ledgerResult.toHuman?.());
          
          if (ledgerResult && !ledgerResult.isEmpty) {
            const ledger = ledgerResult.unwrap();
            const rawActiveBalance = ledger.active.toString();
            
            console.log('Total staked from ledger (raw):', rawActiveBalance);
            console.log('Total staked from ledger (hex):', ledger.active.toHex?.());
            
            // **THIS IS THE FIX** - Use raw value for totalStaked
            totalStaked = rawActiveBalance;
            console.log('Total staked (raw):', totalStaked);
          }
        } catch (error) {
          console.error('Error fetching ledger:', error);
        }
      }
      
      // Get nominations
      const nominations = await api.query.staking.nominators(selectedAccount.address);
      let delegations: UserStakingInfo['delegations'] = [];
      
      console.log('Nominations result:', nominations.toHuman?.());
      
      if (nominations && !nominations.isEmpty) {
        const nominationsData = nominations.unwrap();
        const targets = nominationsData.targets;
        
        if (targets && targets.length > 0) {
          delegations = targets.map((validator: any) => ({
            validator: validator.toString(),
            amount: totalStaked, // Use the formatted amount
            rewards: "0",
          }));
          console.log('Found delegations:', delegations.length);
        }
      }
      
      // Update state
      setUserStaking({
        totalStaked,
        totalRewards: "0", 
        pendingRewards: "0",
        delegations,
      });
      setIsBonded(isAccountBonded);
      setIsInitialLoad(false);
      
      console.log('Final staking state:', {
        totalStaked,
        delegations: delegations.length,
        isBonded: isAccountBonded
      });
      console.log('=== END STAKING DEBUG ===');
      
    } catch (error: any) {
      console.error('Error fetching user staking:', error);
      setStakingError(error.message || 'Failed to fetch staking data');
      setUserStaking({
        totalStaked: "0",
        totalRewards: "0", 
        pendingRewards: "0",
        delegations: [],
      });
      setIsBonded(false);
      setIsInitialLoad(false);
    }
  }, [api, apiConnected, selectedAccount, isInitialLoad]);
  // Effects
  useEffect(() => {
    fetchValidators();
  }, [fetchValidators]);

  useEffect(() => {
    fetchUserStaking();
  }, [fetchUserStaking]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Helper function to execute transactions with proper error handling
  const executeTransaction = async (tx: any, successMessage: string, onSuccess?: () => void): Promise<boolean> => {
    if (!selectedAccount) return false;
    
    try {
      const injector = await web3FromSource(selectedAccount.meta.source);
      
      return new Promise((resolve, reject) => {
        let unsub: () => void;
        
        tx.signAndSend(
          selectedAccount.address,
          { signer: injector.signer },
          ({ status, dispatchError, events }: any) => {
            console.log('Transaction status:', status.type);
            
            if (status.isInBlock) {
              console.log('Transaction included in block:', status.asInBlock.toHex());
            }
            
            if (status.isFinalized) {
              console.log('Transaction finalized:', status.asFinalized.toHex());
              
              if (dispatchError) {
                let errorMessage = 'Transaction failed';
                
                if (dispatchError.isModule) {
                  try {
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    const { docs, name, section } = decoded;
                    errorMessage = `${section}.${name}: ${docs.join(' ')}`;
                  } catch (error) {
                    console.error('Error decoding dispatch error:', error);
                    errorMessage = dispatchError.toString();
                  }
                } else {
                  errorMessage = dispatchError.toString();
                }
                
                reject(new Error(errorMessage));
              } else {
                toast({
                  title: "Success!",
                  description: successMessage,
                });
                onSuccess?.();
                resolve(true);
              }
              
              if (unsub) unsub();
            }
          }
        ).then((unsubscribe: any) => {
          unsub = unsubscribe;
        }).catch((error: any) => {
          console.error('Transaction submission error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Transaction execution error:', error);
      throw error;
    }
  };

  // Enhanced direct staking handler
  const handleDirectStaking = async () => {
    if (!apiConnected || !selectedAccount || !stakeAmount || !selectedValidator) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const value = parseBalance(stakeAmount);
      const amountBN = new BN(value);
      
      // Get current balance for validation
      const accountInfo = await api.query.system.account(selectedAccount.address);
      const currentBalance = accountInfo.data.free.toString();
      const balanceBN = new BN(currentBalance);
      
      // Check for sufficient balance (leave some for fees)
      const feeBuffer = new BN(parseBalance("0.1")); // Reserve 0.1 XOR for fees
      if (amountBN.add(feeBuffer).gt(balanceBN)) {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough XOR to stake this amount (including fees)",
          variant: "destructive"
        });
        return;
      }

      // Check if account is already bonded
      const bondedResult = await api.query.staking.bonded(selectedAccount.address);
      const isAlreadyBonded = bondedResult && !bondedResult.isEmpty;

      if (isAlreadyBonded) {
        console.log('Account already bonded, using bondExtra');
        // Account is already bonded, use bondExtra
        const bondExtraTx = api.tx.staking.bondExtra(value);
        await executeTransaction(bondExtraTx, `Successfully added ${stakeAmount} XOR to existing stake`);
        
        // Update nominations
        const nominateTx = api.tx.staking.nominate([selectedValidator]);
        await executeTransaction(
          nominateTx,
          "Successfully updated validator nominations",
          () => {
            setStakeAmount("");
            setSelectedValidator("");
            fetchUserStaking();
            fetchBalance();
          }
        );
      } else {
        console.log('Account not bonded, using bond');
        // Account is not bonded, use bond
        const bondTx = api.tx.staking.bond(value, 'Staked');
        await executeTransaction(bondTx, "Account bonded successfully");
        
        // Then nominate
        const nominateTx = api.tx.staking.nominate([selectedValidator]);
        await executeTransaction(
          nominateTx,
          `Successfully staked ${stakeAmount} XOR and nominated validator`,
          () => {
            setStakeAmount("");
            setSelectedValidator("");
            fetchUserStaking();
            fetchBalance();
          }
        );
      }

    } catch (error: any) {
      console.error('Staking failed:', error);
      toast({
        title: "Staking Failed",
        description: error.message || "Transaction failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnstaking = async () => {
    if (!apiConnected || !selectedAccount || !unstakeAmount) {
      toast({
        title: "Missing Information", 
        description: "Please enter unstake amount",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const value = parseBalance(unstakeAmount);
      const unbondTx = api.tx.staking.unbond(value);
      
      await executeTransaction(
        unbondTx,
        `Successfully unbonded ${unstakeAmount} XOR. Funds will be available for withdrawal after the unbonding period.`,
        () => {
          setUnstakeAmount("");
          fetchUserStaking();
          fetchBalance();
        }
      );

    } catch (error: any) {
      console.error('Unstaking failed:', error);
      toast({
        title: "Unstaking Failed",
        description: error.message || "Transaction failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawUnbonded = async () => {
    if (!apiConnected || !selectedAccount) return;

    setLoading(true);
    try {
      const withdrawTx = api.tx.staking.withdrawUnbonded(0);
      
      await executeTransaction(
        withdrawTx,
        "Successfully withdrew unbonded funds",
        () => {
          fetchUserStaking();
          fetchBalance();
        }
      );

    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Transaction failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!apiConnected || !selectedAccount) return;
    
    setLoading(true);
    try {
      const currentEraCodec = await api.query.staking.currentEra();
      let era = 0;
      
      if (currentEraCodec && currentEraCodec.toJSON) {
        const eraNum = Number(currentEraCodec.toJSON());
        era = Math.max(0, eraNum - 1);
      }
      
      const validatorToUse = selectedValidator || validators[0]?.accountId;
      if (!validatorToUse) {
        toast({
          title: "No Validator",
          description: "No validator selected or available",
          variant: "destructive"
        });
        return;
      }
      
      const payoutTx = api.tx.staking.payoutStakers(validatorToUse, era);
      await executeTransaction(
        payoutTx,
        "Successfully claimed staking rewards",
        () => {
          fetchUserStaking();
          fetchBalance();
        }
      );
      
    } catch (error: any) {
      console.error('Claim rewards failed:', error);
      toast({
        title: "Claim Failed",
        description: error.message || "Transaction failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Placeholder handlers for pool and delegated staking
  const handlePoolJoin = async () => {
    toast({
      title: "Feature Coming Soon",
      description: "Pool staking functionality will be implemented soon",
    });
  };

  const handlePoolLeave = async () => {
    toast({
      title: "Feature Coming Soon", 
      description: "Pool leaving functionality will be implemented soon",
    });
  };

  const handleDelegate = async () => {
    toast({
      title: "Feature Coming Soon",
      description: "Delegated staking functionality will be implemented soon", 
    });
  };

  // Chart data
  const stakingDistribution = userStaking.delegations.map((delegation, index) => ({
    name: delegation.validator.slice(0, 8) + '...',
    value: parseFloat(delegation.amount) || 1,
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
  }));

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-3 rounded shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-blue-600">{`${payload[0].value?.toLocaleString()} XOR`}</p>
        </div>
      );
    }
    return null;
  };

  // Debug logging
  const debugStakingInfo = useCallback(async () => {
    if (!apiConnected || !selectedAccount) return;
    
    console.log('=== DEBUG STAKING INFO ===');
    console.log('Selected Account:', selectedAccount.address);
    
    try {
      const bonded = await api.query.staking.bonded(selectedAccount.address);
      console.log('Bonded query result:', bonded?.toHuman?.());
      
      const accountInfo = await api.query.system.account(selectedAccount.address);
      console.log('Account info:', accountInfo?.toHuman?.());
      
      const nominations = await api.query.staking.nominators(selectedAccount.address);
      console.log('Nominations:', nominations?.toHuman?.());
      
      const ledger = await api.query.staking.ledger(selectedAccount.address);
      console.log('Direct ledger query:', ledger?.toHuman?.());
    } catch (error) {
      console.error('Debug error:', error);
    }
    
    console.log('=== END DEBUG ===');
  }, [api, apiConnected, selectedAccount]);

  useEffect(() => {
    if (apiConnected && selectedAccount) {
      debugStakingInfo();
    }
  }, [debugStakingInfo]);

  // Loading state
  if (apiState.status !== 'connected') {
    return (
      <div className="min-h-screen bg-card p-2 sm:p-4 lg:p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Connecting to Xorion Network</h3>
            <p className="text-muted-foreground mb-4">
              {apiState.status === 'connecting' ? 'Establishing connection...' :
               apiState.status === 'error' ? 'Connection failed' :
               apiState.status === 'disconnected' ? 'Disconnected' :
               'Initializing...'}
            </p>
            {apiState.lastError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-4">
                Error: {apiState.lastError}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2">
              Status: {apiState.status} | 
              Endpoint: {apiState.endpoint || 'None'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen glass-card p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sky-400/20 text-sky-400">
                <FaShieldAlt className="w-6 h-6" />
              </span>
              Xorion Staking Interface
            </h1>
            <p className="text-muted-foreground">Manage your XOR staking and delegations</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs bg-green-500 text-black">
              {apiState.status === 'connected' ? 'Connected' : 'Disconnected'}
            </Badge>
            {selectedAccount && (
              <Badge className="bg-orange-300 text-primary-foreground">
                {selectedAccount.meta.name || 'Wallet'}
              </Badge>
            )}
          </div>
        </div>

        {/* Account Selection */}
        <AccountSelector
          accounts={accounts}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          balance={balance}
        />

        {/* Staking Overview */}
        <StakingOverview 
          userStaking={userStaking} 
          balance={balance}
          validators={validators}
          networkInfo={{
            avgApr: 12.5,
            erasPerDay: 1,
          }}
        />

        {/* Staking Actions */}
        <StakingActions
          validators={validators}
          selectedValidator={selectedValidator}
          setSelectedValidator={setSelectedValidator}
          stakeAmount={stakeAmount}
          setStakeAmount={setStakeAmount}
          unstakeAmount={unstakeAmount}
          setUnstakeAmount={setUnstakeAmount}
          poolId={poolId}
          setPoolId={setPoolId}
          poolStakeAmount={poolStakeAmount}
          setPoolStakeAmount={setPoolStakeAmount}
          delegateAgent={delegateAgent}
          setDelegateAgent={setDelegateAgent}
          delegateAmount={delegateAmount}
          setDelegateAmount={setDelegateAmount}
          userStaking={userStaking}
          apiConnected={apiConnected}
          loading={loading}
          handleDirectStaking={handleDirectStaking}
          handleUnstaking={handleUnstaking}
          handleWithdrawUnbonded={handleWithdrawUnbonded}
          handleClaimRewards={handleClaimRewards}
          handlePoolJoin={handlePoolJoin}
          handlePoolLeave={handlePoolLeave}
          handleDelegate={handleDelegate}
        />

        {/* Delegation Distribution Chart */}
        {userStaking.delegations.length > 0 && (
          <DelegationDistributionChart
            stakingDistribution={stakingDistribution}
            CustomTooltip={CustomTooltip}
          />
        )}
      </div>
    </div>
  );
};

export default StakingInterface;