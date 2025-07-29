import React from 'react';
import MetricCard from './MetricCard';
import { FaBolt, FaShieldAlt, FaWallet } from 'react-icons/fa';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdditionalMetricsGridProps {
  totalTransactions: number;
  networkHealth: number;
  activeAddresses: number;
  getStatusColor: (value: number, type: 'validators' | 'health' | 'apr') => string;
  formatNumber: (num: number) => string;
  cardClassName?: string;
}

const AdditionalMetricsGrid: React.FC<AdditionalMetricsGridProps> = ({
  totalTransactions,
  networkHealth,
  activeAddresses,
  getStatusColor,
  formatNumber,
  cardClassName = '',
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <MetricCard
      title="Total Transactions"
      icon={<FaBolt className="h-4 w-4 text-orange-400" />}
      value={<span className="text-2xl font-bold text-white">{formatNumber(totalTransactions)}</span>}
      description={<span className="text-xs text-white/70">Last 5 blocks</span>}
      iconBgClass="bg-white/10"
      cardClassName="text-white"
    />
    <MetricCard
      title="Network Health"
      icon={<FaShieldAlt className="h-4 w-4 text-green-400" />}
      value={<span className="text-2xl font-bold text-white">{`${networkHealth.toFixed(1)}%`}</span>}
      badge={
        <Badge className={cn('mt-2', getStatusColor(networkHealth, 'health'))}>
          {networkHealth >= 99 ? 'Excellent' : networkHealth >= 95 ? 'Good' : 'Poor'}
        </Badge>
      }
      iconBgClass="bg-white/10"
      cardClassName="text-white"
    />
    <MetricCard
      title="Active Addresses"
      icon={<FaWallet className="h-4 w-4 text-blue-400" />}
      value={<span className="text-2xl font-bold text-white">{formatNumber(activeAddresses)}</span>}
      description={<span className="text-xs text-white/70">Estimated</span>}
      iconBgClass="bg-white/10"
      cardClassName="text-white"
    />
  </div>
);

export default AdditionalMetricsGrid; 