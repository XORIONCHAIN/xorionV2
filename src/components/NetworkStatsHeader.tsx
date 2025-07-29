import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import React from 'react';

interface NetworkStatsHeaderProps {
  hasData: boolean;
  isLoading: boolean;
  isFetching: boolean;
  lastUpdated: number;
  onRefresh: () => void;
}

const NetworkStatsHeader: React.FC<NetworkStatsHeaderProps> = ({
  hasData,
  isLoading,
  isFetching,
  lastUpdated,
  onRefresh,
}) => (
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-bold text-foreground">Network Statistics</h2>
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="text-xs">
        {!hasData && isLoading ? 'Loading...' : isFetching ? 'Updating...' : 'Live'}
      </Badge>
      {lastUpdated > 0 && (
        <span className="text-xs text-muted-foreground">
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
      <Button className='text-white' onClick={onRefresh} size="sm" variant="outline" disabled={isFetching}>
        {isFetching ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  </div>
);

export default NetworkStatsHeader; 