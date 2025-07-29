import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FaArrowUp, FaArrowDown, FaCoins, FaUsers, FaWallet } from 'react-icons/fa';

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

interface StakingActionsProps {
  validators: Validator[];
  selectedValidator: string;
  setSelectedValidator: (v: string) => void;
  stakeAmount: string;
  setStakeAmount: (v: string) => void;
  unstakeAmount: string;
  setUnstakeAmount: (v: string) => void;
  poolId: string;
  setPoolId: (v: string) => void;
  poolStakeAmount: string;
  setPoolStakeAmount: (v: string) => void;
  delegateAgent: string;
  setDelegateAgent: (v: string) => void;
  delegateAmount: string;
  setDelegateAmount: (v: string) => void;
  userStaking: UserStakingInfo;
  apiConnected: boolean;
  loading: boolean;
  handleDirectStaking: () => void;
  handleUnstaking: () => void;
  handleWithdrawUnbonded: () => void;
  handleClaimRewards: () => void;
  handlePoolJoin: () => void;
  handlePoolLeave: () => void;
  handleDelegate: () => void;
}

const StakingActions = ({
  validators,
  selectedValidator,
  setSelectedValidator,
  stakeAmount,
  setStakeAmount,
  unstakeAmount,
  setUnstakeAmount,
  poolId,
  setPoolId,
  poolStakeAmount,
  setPoolStakeAmount,
  delegateAgent,
  setDelegateAgent,
  delegateAmount,
  setDelegateAmount,
  userStaking,
  apiConnected,
  loading,
  handleDirectStaking,
  handleUnstaking,
  handleWithdrawUnbonded,
  handleClaimRewards,
  handlePoolJoin,
  handlePoolLeave,
  handleDelegate
}: StakingActionsProps) => {

  const formatPendingRewards = (rewards: string): string => {
    if (!rewards || rewards === "0") return "0.0000";
    try {
      const num = parseFloat(rewards);
      return num.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    } catch {
      return "0.0000";
    }
  };

  return (
    <Tabs defaultValue="stake" className="space-y-4">
      {/* Tabs List */}
      <TabsList className="grid w-full grid-cols-5 mb-1 bg-gradient-to-r from-pink-500 to-blue-600 rounded-lg p-1 shadow-lg">
        <TabsTrigger
          value="stake"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-700 data-[state=active]:text-white text-white/80 font-medium rounded-md transition-all duration-200 shadow-md border-2 border-transparent data-[state=active]:border-white/20"
        >
          Stake
        </TabsTrigger>
        <TabsTrigger
          value="unstake"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-700 data-[state=active]:text-white text-white/80 font-medium rounded-md transition-all duration-200 shadow-md border-2 border-transparent data-[state=active]:border-white/20"
        >
          Unstake
        </TabsTrigger>
        <TabsTrigger
          value="pools"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-700 data-[state=active]:text-white text-white/80 font-medium rounded-md transition-all duration-200 shadow-md border-2 border-transparent data-[state=active]:border-white/20"
        >
          Pools
        </TabsTrigger>
        <TabsTrigger
          value="delegate"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-700 data-[state=active]:text-white text-white/80 font-medium rounded-md transition-all duration-200 shadow-md border-2 border-transparent data-[state=active]:border-white/20"
        >
          Delegate
        </TabsTrigger>
        <TabsTrigger
          value="rewards"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-700 data-[state=active]:text-white text-white/80 font-medium rounded-md transition-all duration-200 shadow-md border-2 border-transparent data-[state=active]:border-white/20"
        >
          Rewards
        </TabsTrigger>
      </TabsList>

      {/* Stake Tab */}
      <TabsContent value="stake" className="space-y-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white space-x-2">
              <FaArrowUp className="w-5 h-5 text-green-400" />
              <span>Stake XOR</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Select Validator</label>
              <Select value={selectedValidator} onValueChange={setSelectedValidator}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Choose a validator" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {validators.length > 0 ? (
                    validators.map((validator) => (
                      <SelectItem 
                        key={validator.accountId} 
                        value={validator.accountId} 
                        className="text-white hover:bg-slate-700"
                      >
                        <div className="truncate">
                          {`${validator.accountId.slice(0, 8)}...${validator.accountId.slice(-6)} (${validator.commission}% commission)`}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-validators" disabled className="text-slate-400">
                      No validators available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Amount (XOR)</label>
              <Input
                type="text"
                placeholder="Enter amount to stake"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Button
              onClick={handleDirectStaking}
              disabled={loading || !stakeAmount || !selectedValidator || !apiConnected}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-pink-600 to-blue-600 shadow-lg transition-all duration-200 hover:from-pink-700 hover:to-blue-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Staking...' : 'Stake XOR'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Unstake Tab */}
      <TabsContent value="unstake" className="space-y-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white space-x-2">
              <FaArrowDown className="w-5 h-5 text-red-400" />
              <span>Unstake XOR</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Amount (XOR)</label>
              <Input
                type="text"
                placeholder="Enter amount to unstake"
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handleUnstaking}
                disabled={loading || !unstakeAmount || !apiConnected}
                className="py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-red-600 to-pink-600 shadow-lg transition-all duration-200 hover:from-red-700 hover:to-pink-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Unstaking...' : 'Unstake XOR'}
              </Button>
              <Button
                onClick={handleWithdrawUnbonded}
                disabled={loading || !apiConnected}
                className="py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-blue-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Withdrawing...' : 'Withdraw Unbonded'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Pools Tab */}
      <TabsContent value="pools" className="space-y-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white space-x-2">
              <FaUsers className="w-5 h-5 text-blue-400" />
              <span>Pool Staking</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Pool ID</label>
              <Input
                type="text"
                placeholder="Enter pool ID"
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Amount (XOR)</label>
              <Input
                type="text"
                placeholder="Enter amount to stake in pool"
                value={poolStakeAmount}
                onChange={(e) => setPoolStakeAmount(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={handlePoolJoin}
                disabled={loading || !poolId || !poolStakeAmount || !apiConnected}
                className="py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-cyan-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining...' : 'Join Pool'}
              </Button>
              <Button
                onClick={handlePoolLeave}
                disabled={loading || !apiConnected}
                className="py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-orange-600 to-red-600 shadow-lg transition-all duration-200 hover:from-orange-700 hover:to-red-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Leaving...' : 'Leave Pool'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Delegate Tab */}
      <TabsContent value="delegate" className="space-y-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white space-x-2">
              <FaWallet className="w-5 h-5 text-purple-400" />
              <span>Delegated Staking</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Delegate Agent</label>
              <Input
                type="text"
                placeholder="Enter delegate agent address"
                value={delegateAgent}
                onChange={(e) => setDelegateAgent(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Amount (XOR)</label>
              <Input
                type="text"
                placeholder="Enter amount to delegate"
                value={delegateAmount}
                onChange={(e) => setDelegateAmount(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Button
              onClick={handleDelegate}
              disabled={loading || !delegateAgent || !delegateAmount || !apiConnected}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Delegating...' : 'Delegate XOR'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Rewards Tab */}
      <TabsContent value="rewards" className="space-y-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white space-x-2">
              <FaCoins className="w-5 h-5 text-yellow-400" />
              <span>Claim Rewards</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {formatPendingRewards(userStaking.pendingRewards)} XOR
              </div>
              <div className="text-sm text-slate-400">Available Rewards</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Staked:</span>
                <span className="text-white">{userStaking.totalStaked} XOR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Active Delegations:</span>
                <span className="text-white">{userStaking.delegations.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Rewards Earned:</span>
                <span className="text-white">{userStaking.totalRewards} XOR</span>
              </div>
            </div>
            <Button
              onClick={handleClaimRewards}
              disabled={loading || parseFloat(userStaking.pendingRewards) === 0 || !apiConnected}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-yellow-600 to-orange-600 shadow-lg transition-all duration-200 hover:from-yellow-700 hover:to-orange-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Claiming...' : 'Claim Rewards'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default StakingActions;
