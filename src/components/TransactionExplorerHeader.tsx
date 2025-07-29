import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FaBars, FaTimes } from 'react-icons/fa';
import React from 'react';

interface TransactionExplorerHeaderProps {
  hasData: boolean;
  isTransactionLoading: boolean;
  isTransactionFetching: boolean;
  lastUpdated: number;
  onRefresh: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const TransactionExplorerHeader: React.FC<TransactionExplorerHeaderProps> = ({
  hasData,
  isTransactionLoading,
  isTransactionFetching,
  lastUpdated,
  onRefresh,
  sidebarOpen,
  setSidebarOpen,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-white">Transaction Explorer</h1>
      <p className="text-muted-foreground">Explore recent transactions and blocks on the network</p>
    </div>
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="text-xs">
        {!hasData && isTransactionLoading ? 'Loading...' : isTransactionFetching ? 'Updating...' : 'Live'}
      </Badge>
      {lastUpdated > 0 && (
        <span className="text-xs text-muted-foreground">
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
      {isTransactionFetching && !isTransactionLoading && (
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
      )}
      <Button onClick={onRefresh} size="sm" variant="outline" disabled={isTransactionFetching}>
        {isTransactionFetching ? 'Refreshing...' : 'Refresh'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden"
      >
        {sidebarOpen ? <FaTimes className="w-4 h-4" /> : <FaBars className="w-4 h-4" />}
      </Button>
    </div>
  </div>
);

export default TransactionExplorerHeader; 