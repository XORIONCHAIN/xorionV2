import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, AreaChart, Area } from 'recharts';
import { FaBolt, FaShieldAlt } from 'react-icons/fa';

interface ChartData {
  time: string;
  transactions: number;
  validators: number;
  networkHealth: number;
}

interface StakingData {
  period: string;
  staked: number;
  rewards: number;
}

interface ChartsSectionProps {
  showSkeleton: boolean;
  chartData: ChartData[];
  stakingData: StakingData[];
  formatNumber: (num: number) => string;
}

const ChartSkeleton = () => (
  <Card className="bg-card/50 backdrop-blur-sm border border-border">
    <CardHeader>
      <div className="h-6 bg-muted-foreground/20 rounded w-48 animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-[300px] bg-muted-foreground/10 rounded animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    </CardContent>
  </Card>
);

const ChartsSection: React.FC<ChartsSectionProps> = ({
  showSkeleton,
  chartData,
  stakingData,
  formatNumber,
}) => (
  <>
    {/* Network Activity and Staking Overview */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {showSkeleton ? (
        <>
          <ChartSkeleton />
          <ChartSkeleton />
        </>
      ) : (
        <>
          <Card className="bg-card/50 backdrop-blur-sm border border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center space-x-2">
                <FaBolt className="w-5 h-5 text-pink-600" />
                <span>Network Activity (Last 24 Hours)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      interval="preserveStartEnd"
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      stroke="hsl(var(--primary))"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={formatNumber}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      label={{ 
                        value: 'Transactions', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                      }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="hsl(var(--accent))"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${value}`}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      label={{ 
                        value: 'Validators', 
                        angle: 90, 
                        position: 'insideRight',
                        style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'transactions') return [
                          `${value.toLocaleString()} Transactions`,
                          'Transactions'
                        ];
                        if (name === 'validators') return [
                          `${value} Validators`,
                          'Validators Online'
                        ];
                        if (name === 'networkHealth') return [
                          `${value}%`,
                          'Network Health'
                        ];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="transactions"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ 
                        fill: 'hsl(var(--primary))', 
                        stroke: 'hsl(var(--background))', 
                        strokeWidth: 2, 
                        r: 3 
                      }}
                      activeDot={{ 
                        r: 5, 
                        stroke: 'hsl(var(--background))', 
                        strokeWidth: 2,
                        fill: 'hsl(var(--primary))'
                      }}
                      name="transactions"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="validators"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={{ 
                        fill: 'hsl(var(--accent))', 
                        stroke: 'hsl(var(--background))', 
                        strokeWidth: 2, 
                        r: 3 
                      }}
                      activeDot={{ 
                        r: 5, 
                        stroke: 'hsl(var(--background))', 
                        strokeWidth: 2,
                        fill: 'hsl(var(--accent))'
                      }}
                      name="validators"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center space-x-2">
                <FaShieldAlt className="w-5 h-5 text-orange-600" />
                <span>Staking Overview (12 Months)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stakingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                    <XAxis 
                      dataKey="period" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      tickFormatter={formatNumber}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      label={{ 
                        value: 'Amount (XOR)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number, name: string) => [
                        `${formatNumber(value)} XOR`,
                        name === 'staked' ? 'Staked Amount' : 'Rewards Earned'
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="staked"
                      stackId="1"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary)/20)"
                      name="staked"
                    />
                    <Area
                      type="monotone"
                      dataKey="rewards"
                      stackId="2"
                      stroke="hsl(var(--accent))"
                      fill="hsl(var(--accent)/20)"
                      name="rewards"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
    {/* Network Health Trend */}
    <div className="grid grid-cols-1 gap-4 mt-4">
      {showSkeleton ? (
        <ChartSkeleton />
      ) : (
        <Card className="bg-card/50 backdrop-blur-sm border border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center space-x-2">
              <FaShieldAlt className="w-5 h-5 text-green-500" />
              <span>Network Health Trend (Last 24 Hours)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    domain={[90, 100]}
                    tickFormatter={(value) => `${value}%`}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    label={{ 
                      value: 'Health Score (%)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Network Health']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="networkHealth"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ 
                      fill: 'hsl(var(--primary))', 
                      stroke: 'hsl(var(--background))', 
                      strokeWidth: 2, 
                      r: 4 
                    }}
                    activeDot={{ 
                      r: 6, 
                      stroke: 'hsl(var(--background))', 
                      strokeWidth: 2,
                      fill: 'hsl(var(--primary))'
                    }}
                    name="networkHealth"
                  />
                  {/* Add a reference line for 100% */}
                  <ReferenceLine 
                    y={100} 
                    stroke="#77D61F" // purple
                    strokeDasharray="0" // solid line
                    strokeWidth={3}
                    label={{ 
                      value: '100%', 
                      position: 'insideTopRight',
                      fill: '#a78bfa',
                      fontSize: 12
                    }}
                  />
                  {/* Existing 95% threshold line */}
                  <ReferenceLine 
                    y={95} 
                    stroke="hsl(var(--destructive))" 
                    strokeDasharray="3 3" 
                    strokeWidth={1}
                    label={{ 
                      value: '95% Threshold', 
                      position: 'insideBottomRight',
                      fill: 'hsl(var(--destructive))',
                      fontSize: 10
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  </>
);

export default ChartsSection; 