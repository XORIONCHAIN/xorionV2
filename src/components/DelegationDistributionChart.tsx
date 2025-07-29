import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FaChartLine } from 'react-icons/fa';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

import { TooltipProps } from 'recharts';

interface DelegationDistributionChartProps {
  stakingDistribution: { name: string; value: number; color: string }[];
  CustomTooltip: React.FC<TooltipProps<number, string>>;
}

const DelegationDistributionChart = ({ stakingDistribution, CustomTooltip }: DelegationDistributionChartProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <FaChartLine className="w-5 h-5 text-white" />
        <span>Delegation Distribution</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={stakingDistribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {stakingDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

export default DelegationDistributionChart; 