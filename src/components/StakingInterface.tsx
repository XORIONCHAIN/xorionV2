import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { LockIcon, CircleDashedIcon, ListIcon, CircleIcon, CalendarIcon, LockOpenIcon } from 'lucide-react';

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
  unbonding: Array<{ value: string; era: number }>;
  totalUnbonding: string;
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
    const cleanAmount = amount.replace(/,/g, '');
    const parts = cleanAmount.split('.');
    let wholeNumber = parts[0] || '0';
    let decimalPart = parts[1] || '';
    if (decimalPart.length > 0) {
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

  // Staking Data
  const [validators, setValidators] = useState<Validator[]>([]);
  const [userStaking, setUserStaking] = useState<UserStakingInfo>({
    totalStaked: "0",
    totalRewards: "0",
    pendingRewards: "0",
    delegations: [],
    unbonding: [],
    totalUnbonding: "0",
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

  // Fetch balance using TanStack Query
  const { data: balance = "0" } = useQuery({
    queryKey: ['balance', selectedAccount?.address, apiConnected],
    queryFn: async () => {
      if (!apiConnected || !selectedAccount) return "0";
      try {
        const accountInfo = await api.query.system.account(selectedAccount.address);
        let freeBalance = "0";
        if (accountInfo && accountInfo.data && accountInfo.data.free) {
          freeBalance = accountInfo.data.free.toString();
        } else if (accountInfo.toJSON) {
          const json = accountInfo.toJSON() as any;
          if (json?.data?.free) freeBalance = json.data.free.toString();
        } else if (accountInfo.toHuman) {
          const human = accountInfo.toHuman() as any;
          if (human?.data?.free) {
            const humanBalance = human.data.free.toString().replace(/,/g, '');
            freeBalance = parseBalance(humanBalance.includes(' ') ? humanBalance.split(' ')[0] : humanBalance, 18);
          }
        }
        return freeBalance;
      } catch (error) {
        console.error('Error fetching balance:', error);
        return "0";
      }
    },
    enabled: apiConnected && !!selectedAccount,
  });

  // Fetch validators using TanStack Query
  const { data: fetchedValidators = [] } = useQuery({
    queryKey: ['validators', apiConnected],
    queryFn: async () => {
      if (!apiConnected) return [];
      try {
        const activeValidators = await api.query.session.validators();
        let validatorList: any[] = Array.isArray(activeValidators) ? activeValidators : activeValidators.toJSON() || [];
        const validatorsWithDetails = await Promise.all(
          validatorList.slice(0, 50).map(async (validatorId: any) => {
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
        return validatorsWithDetails;
      } catch (error) {
        console.error('Error fetching validators:', error);
        toast({
          title: "Fetch Error",
          description: "Failed to fetch validators",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: apiConnected,
  });

  // Fetch user staking info using TanStack Query
  const { data: userStakingData } = useQuery({
    queryKey: ['userStaking', selectedAccount?.address, apiConnected],
    queryFn: async () => {
      if (!apiConnected || !selectedAccount) return null;
      try {
        setStakingError(null);
        let totalStaked = "0";
        let isAccountBonded = false;
        let controller = null;
        let unbonding: Array<{ value: string; era: number }> = [];
        let totalUnbonding = new BN(0);
        let delegations: UserStakingInfo['delegations'] = [];

        const bondedResult = await api.query.staking.bonded(selectedAccount.address);
        if (bondedResult && !bondedResult.isEmpty) {
          isAccountBonded = true;
          controller = bondedResult.toJSON();
        }

        if (controller) {
          const ledgerResult = await api.query.staking.ledger(controller);
          if (ledgerResult && !ledgerResult.isEmpty) {
            const ledger = ledgerResult.unwrap();
            totalStaked = ledger.active.toString();
            unbonding = ledger.unlocking.map((chunk: any) => ({
              value: chunk.value.toString(),
              era: Number(chunk.era.toString()),
            }));
            totalUnbonding = unbonding.reduce(
              (sum, chunk) => sum.add(new BN(chunk.value)),
              new BN(0)
            );
          }
        }

        const nominations = await api.query.staking.nominators(selectedAccount.address);
        if (nominations && !nominations.isEmpty) {
          const nominationsData = nominations.unwrap();
          const targets = nominationsData.targets;
          if (targets && targets.length > 0) {
            delegations = targets.map((validator: any) => ({
              validator: validator.toString(),
              amount: totalStaked,
              rewards: "0",
            }));
          }
        }

        return {
          totalStaked,
          totalRewards: "0",
          pendingRewards: "0",
          delegations,
          unbonding,
          totalUnbonding: totalUnbonding.toString(),
          isBonded: isAccountBonded,
        };
      } catch (error: any) {
        console.error('Error fetching user staking:', error);
        setStakingError(error.message || 'Failed to fetch staking data');
        return {
          totalStaked: "0",
          totalRewards: "0",
          pendingRewards: "0",
          delegations: [],
          unbonding: [],
          totalUnbonding: "0",
          isBonded: false,
        };
      }
    },
    enabled: apiConnected && !!selectedAccount,
  });

  // Update state when query data changes
  useEffect(() => {
    if (fetchedValidators) {
      setValidators(fetchedValidators);
    }
  }, [fetchedValidators]);

  useEffect(() => {
    if (userStakingData) {
      setUserStaking({
        totalStaked: userStakingData.totalStaked,
        totalRewards: userStakingData.totalRewards,
        pendingRewards: userStakingData.pendingRewards,
        delegations: userStakingData.delegations,
        unbonding: userStakingData.unbonding,
        totalUnbonding: userStakingData.totalUnbonding,
      });
      setIsBonded(userStakingData.isBonded);
      setIsInitialLoad(false);
    }
  }, [userStakingData]);

  const UnbondingSection = () => {
    return (
      <Card className="mt-6 bg-card/50 backdrop-blur-sm text-white p-6 rounded-lg shadow-lg border border-white/10">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <LockIcon className="h-6 w-6 text-blue-400" />
            <CardTitle className="text-xl font-semibold">Unbonding Funds</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {userStaking.unbonding.length > 0 ? (
            <div className="space-y-6">
              <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                <div className="flex items-center space-x-2 text-blue-300">
                  <CircleDashedIcon className="h-5 w-5" />
                  <p className="text-lg font-medium">
                    Total Unbonding:{" "}
                    <span className="font-bold text-white">
                      {formatBalanceForDisplay(userStaking.totalUnbonding, 18)} XOR
                    </span>
                  </p>
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-3 text-muted-foreground">
                  <ListIcon className="h-5 w-5" />
                  <h3 className="text-md font-medium">Unbonding Chunks</h3>
                </div>
                <div className="space-y-3">
                  {userStaking.unbonding.map((chunk, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <CircleIcon className="h-4 w-4 text-blue-400" />
                        <span className="font-medium">
                          {formatBalanceForDisplay(chunk.value, 18)} XOR
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Unlocks at era {chunk.era}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <LockOpenIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No funds currently unbonding</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Funds will appear here when unbonding
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

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
            if (status.isFinalized) {
              if (dispatchError) {
                let errorMessage = 'Transaction failed';
                if (dispatchError.isModule) {
                  try {
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
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
      if (amountBN.lten(0)) {
        toast({
          title: "Invalid Amount",
          description: "Stake amount must be greater than 0",
          variant: "destructive"
        });
        return;
      }
      const accountInfo = await api.query.system.account(selectedAccount.address);
      const { free, reserved, miscFrozen, feeFrozen } = accountInfo.data;
      const frozenBalance = miscFrozen || feeFrozen || new BN(0);
      const availableBalance = free.sub(reserved).sub(frozenBalance);
      const bondedResult = await api.query.staking.bonded(selectedAccount.address);
      const isAlreadyBonded = bondedResult && !bondedResult.isEmpty;
      let stakingTx;
      let successMessage;
      if (isAlreadyBonded) {
        stakingTx = api.tx.staking.bondExtra(value);
        successMessage = `Added ${stakeAmount} XOR to existing stake`;
      } else {
        stakingTx = api.tx.staking.bond(value, 'Staked');
        successMessage = `Bonded ${stakeAmount} XOR`;
      }
      const paymentInfo = await stakingTx.paymentInfo(selectedAccount.address);
      const feeBN = paymentInfo.partialFee;
      const totalCostBN = amountBN.add(feeBN);
      if (totalCostBN.gt(availableBalance)) {
        const availableFormatted = formatBalanceForDisplay(availableBalance.toString());
        const neededFormatted = formatBalanceForDisplay(totalCostBN.toString());
        toast({
          title: "Insufficient Balance",
          description: `You need ${neededFormatted} XOR (${stakeAmount} stake + fees) but only have ${availableFormatted} available`,
          variant: "destructive"
        });
        console.log(`You need ${neededFormatted} XOR (${stakeAmount} stake + fees) but only have ${availableFormatted} available`)
        return;
      }
      await executeTransaction(
        stakingTx,
        successMessage,
        async () => {
          const nominateTx = api.tx.staking.nominate([selectedValidator]);
          await executeTransaction(
            nominateTx,
            "Validator nomination updated",
            () => {
              setStakeAmount("");
              setSelectedValidator("");
              // Refetch queries
              // Note: In TanStack Query v5, refetch is automatically available via useQuery
              // We don't need to call refetch manually as the query will be invalidated
            }
          );
        }
      );
    } catch (error: any) {
      console.error('Staking failed:', error);
      let errorMessage = error.message || "Transaction failed";
      if (error.message.includes('InsufficientBalance')) {
        errorMessage = "Your available balance is too low after accounting for fees and reserved amounts";
      } else if (error.message.includes('BelowMinimum')) {
        errorMessage = "The amount is below the minimum stake requirement";
      }
      toast({
        title: "Staking Failed",
        description: errorMessage,
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
          // Refetch queries
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
          // Refetch queries
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
          // Refetch queries
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
        <AccountSelector
          accounts={accounts}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          balance={balance}
        />
        <StakingOverview
          userStaking={userStaking}
          balance={balance}
          validators={validators}
          networkInfo={{
            avgApr: 12.5,
            erasPerDay: 1,
          }}
        />
        <UnbondingSection />
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