import React from 'react';
import MetricCard from './MetricCard';
import { FaUsers, FaChartLine, FaClock, FaDollarSign } from 'react-icons/fa';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KeyMetricsGridProps {
  validatorsOnline: number;
  totalValidators: number;
  validatorPercentage: string;
  stakingAPR: number;
  avgBlockTime: number;
  totalValueLocked: string;
  getStatusColor: (value: number, type: 'validators' | 'health' | 'apr') => string;
  formatNumber: (num: number) => string;
  cardClassName?: string;
}

const KeyMetricsGrid: React.FC<KeyMetricsGridProps> = ({
  validatorsOnline,
  totalValidators,
  validatorPercentage,
  stakingAPR,
  avgBlockTime,
  totalValueLocked,
  getStatusColor,
  formatNumber,
  cardClassName = '',
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard
      title="Validators Online"
      icon={<FaUsers className="h-4 w-4 text-blue-400" />}
      value={<span className="text-2xl font-bold text-white">{`${validatorsOnline}/${totalValidators}`}</span>}
      badge={
        <Badge className={
          Number(validatorPercentage) >= 90
            ? 'bg-green-500/10 border border-green-500 text-green-500 font-semibold px-4 py-1 rounded-full'
            : getStatusColor(validatorsOnline, 'validators')
        }>
          {validatorPercentage}% Active
        </Badge>
      }
      iconBgClass="bg-white/10"
      cardClassName="text-white"
    />
    <MetricCard
      title="Staking APR"
      icon={<FaChartLine className="h-4 w-4 text-pink-500" />}
      value={<span className="text-2xl font-bold text-white">{`${stakingAPR}%`}</span>}
      badge={
        <Badge className={cn('', getStatusColor(stakingAPR, 'apr'))}>
          Current Rate
        </Badge>
      }
      iconBgClass="bg-white/10"
      cardClassName="text-white"
    />
    <MetricCard
      title="Block Time"
      icon={<FaClock className="h-4 w-4 text-yellow-400" />}
      value={<span className="text-2xl font-bold text-white">{`${avgBlockTime.toFixed(1)}s`}</span>}
      description={<span className="text-xs text-white/70">Average Block Time</span>}
      iconBgClass="bg-white/10"
      cardClassName="text-white"
    />
    <MetricCard
      title="Total Value Locked"
      icon={<FaDollarSign className="h-4 w-4 text-purple-400" />}
      value={<span className="text-2xl font-bold text-white">{formatNumber(parseFloat(totalValueLocked) || 0)}</span>}
      description={<span className="text-xs text-white/70">TVL in XOR</span>}
      iconBgClass="bg-white/10"
      cardClassName="text-white"
    />
  </div>
);

export default KeyMetricsGrid; 