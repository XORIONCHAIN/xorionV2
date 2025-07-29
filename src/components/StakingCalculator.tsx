import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaCalculator } from 'react-icons/fa';

const monthsInYear = 12;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

const StakingCalculator = () => {
  const [amount, setAmount] = useState('1000');
  const [apr, setApr] = useState(12.5);      // Annual percentage rate (simple interest)
  const [duration, setDuration] = useState(12); // Months

  // Cumulative, monthly-compounded rewards (APY calculation)
  const chartData = useMemo(() => {
    const principal = clamp(parseFloat(amount) || 0, 0, 1e18);
    const annualRate = clamp(parseFloat(apr) || 0, 0, 100);
    const months = clamp(parseInt(duration), 1, 60);
    const monthlyRate = annualRate / 100 / monthsInYear;
    const data = [];
    let balance = principal;

    for (let i = 0; i <= months; i++) {
      data.push({
        month: i,
        'Total Value': balance,
        'Rewards': balance - principal
      });
      balance *= (1 + monthlyRate);
    }
    return data;
  }, [amount, apr, duration]);

  // Final rewards and total value
  const totalRewards = useMemo(() => {
    const last = chartData[chartData.length - 1];
    return last ? last['Rewards'] : 0;
  }, [chartData]);
  const totalValue = useMemo(() => {
    const last = chartData[chartData.length - 1];
    return last ? last['Total Value'] : 0;
  }, [chartData]);

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center space-x-2">
          <FaCalculator className="w-5 h-5 text-primary" />
          <span>Staking Calculator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Staking Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Staking Amount (XOR)</Label>
            <Input
              id="amount"
              type="number"
              step={0.01}
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/^0+/, ''))}
              className="bg-input border-border text-foreground"
            />
          </div>
          {/* APR */}
          <div className="space-y-2">
            <Label htmlFor="apr">Estimated APY (%)</Label>
            <div className="flex items-center space-x-2">
              <Slider
                id="apr"
                value={[apr]}
                onValueChange={([value]) => setApr(Number(value))}
                min={1}
                max={40}
                step={0.1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12">{apr}%</span>
            </div>
          </div>
          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (months)</Label>
            <div className="flex items-center space-x-2">
              <Slider
                id="duration"
                value={[duration]}
                onValueChange={([value]) => setDuration(Number(value))}
                min={1}
                max={60}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12">{duration}m</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rewards */}
          <Card className="bg-card/50 border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success-foreground">
                {totalRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })} XOR
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                After {duration} months
              </p>
            </CardContent>
          </Card>

          {/* Total Value */}
          <Card className="bg-card/50 border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary-foreground">
                {totalValue.toLocaleString(undefined, { maximumFractionDigits: 4 })} XOR
              </div>
              <p className="text-xs text-muted-foreground mt-1">Including initial stake</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                tickFormatter={n => (n === 1 ? '1 mo' : n + ' mo')}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'XOR', angle: -90, position: 'insideLeft' }}
                tickFormatter={(val) => Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value, name) => [
                  Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' XOR',
                  name
                ]}
              />
              <Line
                type="monotone"
                dataKey="Total Value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Total Value"
              />
              <Line
                type="monotone"
                dataKey="Rewards"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={false}
                name="Rewards"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default StakingCalculator;
