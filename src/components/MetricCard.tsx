import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  iconBgClass?: string;
  cardClassName?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon,
  value,
  badge,
  description,
  iconBgClass = 'gradient-blue-purple',
  cardClassName = '',
}) => (
  <Card className={`glass-card hover:border-primary/50 transition-all duration-300 ${cardClassName}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${iconBgClass} text-white shadow-lg`}>
        {icon}
      </span>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground dark:text-primary-foreground">{value}</div>
      {badge && <Badge className="mt-2">{badge}</Badge>}
      {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
    </CardContent>
  </Card>
);

export default MetricCard; 