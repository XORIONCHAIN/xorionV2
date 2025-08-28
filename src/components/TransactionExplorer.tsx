import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { FaSearch, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePolkadotStore } from '@/stores/polkadotStore';
import { cn } from '@/lib/utils';
import TransactionExplorerHeader from './TransactionExplorerHeader';
import ConnectionStatusCard from './ConnectionStatusCard';
import TransactionsTable from './TransactionsTable';
import BlocksTable from './BlocksTable';
import PaginationControls from './PaginationControls';
import TransactionDetailsDialog from './TransactionDetailsDialog';
import { formatTxor } from '@/lib/utils';

// DEBOUNCE HOOK FOR SEARCH INPUT
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// SKELETON COMPONENTS FOR LOADING
const TransactionSkeleton = () => (
  <TableRow>
    <TableCell>
      <div className="h-4 bg-muted-foreground/20 rounded w-24 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 bg-muted-foreground/20 rounded w-12 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-6 bg-muted-foreground/20 rounded w-20 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 bg-muted-foreground/20 rounded w-16 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 w-4 bg-muted-foreground/20 rounded animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 bg-muted-foreground/20 rounded w-16 animate-pulse"></div>
    </TableCell>
  </TableRow>
);

const BlockSkeleton = () => (
  <TableRow>
    <TableCell>
      <div className="h-4 bg-muted-foreground/20 rounded w-16 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 bg-muted-foreground/20 rounded w-24 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-6 bg-muted-foreground/20 rounded w-8 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 bg-muted-foreground/20 rounded w-16 animate-pulse"></div>
    </TableCell>
  </TableRow>
);

const TransactionExplorer = () => {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsSearchHash, setDetailsSearchHash] = useState('');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // DEBOUNCED SEARCH QUERY
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // GET DATA FROM THE STORE
  const {
    apiState,
    transactionData,
    isTransactionLoading,
    isTransactionFetching,
    transactionDetails,
    isDetailsLoading,
    detailsError,
    fetchTransactionData,
    fetchTransactionDetails,
    refreshTransactionData,
    resetDetailsState
  } = usePolkadotStore();

  // Debug log for fetched transactions (enhanced with more details)
  useEffect(() => {
    if (transactionData && transactionData.transactions) {
    }
  }, [transactionData]);

  // ENHANCED FILTER TRANSACTIONS WITH BETTER TRANSFER DETECTION
  const filteredExtrinsics = useMemo(() => {
    const transactions = transactionData.transactions || [];

    const filtered = transactions.filter(tx => {
      // Search filter - check hash, signer, method, and transfer details
      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch = !searchLower ||
        tx.hash.toLowerCase().includes(searchLower) ||
        tx.signer.toLowerCase().includes(searchLower) ||
        `${tx.section}.${tx.method}`.toLowerCase().includes(searchLower) ||
        (tx.transferTo && tx.transferTo.toLowerCase().includes(searchLower)) ||
        (tx.transferAmount && tx.transferAmount.toLowerCase().includes(searchLower));

      // Type filter - enhanced with better transfer detection
      let matchesFilter = true;
      switch (filterType) {
        case 'all':
          matchesFilter = true;
          break;
        case 'transfers':
          // Use the enhanced transfer detection from the store
          matchesFilter = tx.isTransfer === true ||
            (tx.section === 'balances' && tx.method.toLowerCase().includes('transfer')) ||
            (tx.section === 'currencies' && tx.method.toLowerCase().includes('transfer')) ||
            (tx.section === 'tokens' && tx.method.toLowerCase().includes('transfer')) ||
            (tx.section === 'assets' && tx.method.toLowerCase().includes('transfer'));
          break;
        case 'staking':
          matchesFilter = tx.section === 'staking';
          break;
        case 'system':
          matchesFilter = tx.section === 'system';
          break;
        case 'governance':
          matchesFilter = tx.section === 'democracy' || tx.section === 'council' ||
            tx.section === 'treasury' || tx.section === 'referenda';
          break;
        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });
    return filtered;
  }, [transactionData.transactions, debouncedSearchQuery, filterType]);

  // PAGINATE THE FILTERED TRANSACTIONS
  const paginatedExtrinsics = useMemo(() => {
    const paginated = filteredExtrinsics.slice((currentPage - 1) * 10, currentPage * 10);
    return paginated;
  }, [filteredExtrinsics, currentPage]);

  // FETCH DATA WHEN CONNECTED
  useEffect(() => {
    if (apiState.status === 'connected' && transactionData.lastUpdated === 0) {
      console.log('🔄 Initial data fetch triggered');
      fetchTransactionData();
    }
  }, [apiState.status, fetchTransactionData, transactionData.lastUpdated]);

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    refreshTransactionData();
  };

  const handleSearchDetails = async () => {
    if (detailsSearchHash.trim()) {
      const normalizedHash = detailsSearchHash.trim();

      // Validate hash format
      const isValidHash = normalizedHash.length === 64 ||
        (normalizedHash.startsWith('0x') && normalizedHash.length === 66) ||
        (normalizedHash.length === 64 && !normalizedHash.startsWith('0x'));

      if (!isValidHash) {
        toast({
          title: "Invalid Hash Format",
          description: "Please enter a valid 64-character transaction hash (with or without 0x prefix)",
          variant: "destructive"
        });
        return;
      }

      // Reset any previous state
      resetDetailsState();

      // Show modal immediately
      setShowDetailsDialog(true);

      // Then fetch details (store handles loading state)
      try {
        await fetchTransactionDetails(normalizedHash);

        // Check if we found the transaction
        const { transactionDetails, detailsError } = usePolkadotStore.getState();

        if (transactionDetails) {
          toast({
            title: "Transaction Found!",
            description: `Found transaction in block ${transactionDetails.blockNumber}`,
          });
        } else if (detailsError) {
          toast({
            title: "Transaction Not Found",
            description: "The transaction hash was not found in recent blocks. It may be older or the hash is incorrect.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Search failed:', error);
        toast({
          title: "Search Failed",
          description: "Failed to search for transaction. Please try again.",
          variant: "destructive"
        });
        // Reset loading state on error
        resetDetailsState();
      }
    }
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => formatTxor(balance) + ' XOR';

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <FaCheckCircle className="w-4 h-4 text-blue-500" />
    ) : (
      <FaTimesCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getMethodColor = (section: string, isTransfer?: boolean) => {
    if (isTransfer) {
      return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-500 border-green-500/30';
    }

    switch (section) {
      case 'balances': return 'bg-gradient-blue-purple text-blue-500 border-blue-500/30';
      case 'staking': return 'bg-gradient-purple-indigo text-purple-500 border-purple-500/30';
      case 'system': return 'bg-gradient-orange-yellow text-orange-500 border-orange-500/30';
      case 'democracy':
      case 'council':
      case 'treasury':
      case 'referenda': return 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-500 border-indigo-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  // Enhanced filter options
  const filterOptions = [
    { value: 'all', label: 'All Transactions', count: transactionData.transactions?.length || 0 },
    { value: 'transfers', label: 'Transfers', count: transactionData.transactions?.filter(tx => tx.isTransfer).length || 0 },
    { value: 'staking', label: 'Staking', count: transactionData.transactions?.filter(tx => tx.section === 'staking').length || 0 },
    { value: 'system', label: 'System', count: transactionData.transactions?.filter(tx => tx.section === 'system').length || 0 },
    {
      value: 'governance', label: 'Governance', count: transactionData.transactions?.filter(tx =>
        ['democracy', 'council', 'treasury', 'referenda'].includes(tx.section)).length || 0
    }
  ];

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, debouncedSearchQuery]);

  // IF NOT CONNECTED, SHOW CONNECTION STATUS CARD
  if (apiState.status !== 'connected') {
    return <ConnectionStatusCard apiState={apiState} />;
  }

  const hasData = transactionData.lastUpdated > 0;
  const showSkeleton = !hasData && isTransactionLoading;
  const totalPages = Math.max(1, Math.ceil(filteredExtrinsics.length / 10));
  const isEmpty = !showSkeleton && filteredExtrinsics.length === 0;

  return (
    <div className="min-h-screen bg-card p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <TransactionExplorerHeader
          hasData={hasData}
          isTransactionLoading={isTransactionLoading}
          isTransactionFetching={isTransactionFetching}
          lastUpdated={transactionData.lastUpdated}
          onRefresh={handleRefresh}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className={cn(
            "lg:col-span-1 space-y-4",
            sidebarOpen ? "block" : "hidden lg:block"
          )}>
            <h2 className="text-white text-xl font-bold mb-4">Search & Filter</h2>

            {/* Enhanced Sidebar with Filter Counts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Search Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by hash, address, method..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Filter by Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center justify-between w-full">
                            <span>{option.label}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {option.count}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Details Search */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter transaction hash (64 characters)"
                    value={detailsSearchHash}
                    onChange={(e) => setDetailsSearchHash(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchDetails()}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a 64-character transaction hash to search for details
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSearchDetails}
                    disabled={!detailsSearchHash.trim() || isDetailsLoading}
                    className="flex-1"
                    size="sm"
                  >
                    {isDetailsLoading ? 'Searching...' : 'Search Details'}
                  </Button>
                  {isDetailsLoading && (
                    <Button
                      onClick={resetDetailsState}
                      variant="outline"
                      size="sm"
                      className="px-2"
                      title="Reset search"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Transactions:</span>
                  <span className="font-medium">{transactionData.transactions?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Filtered Results:</span>
                  <span className="font-medium">{filteredExtrinsics.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Current Page:</span>
                  <span className="font-medium">{currentPage} of {totalPages}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transfer Count:</span>
                  <span className="font-medium text-green-500">
                    {transactionData.transactions?.filter(tx => tx.isTransfer).length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="transactions" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions">
                  Recent Transactions
                  {hasData && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredExtrinsics.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="blocks">
                  Recent Blocks
                  {hasData && (
                    <Badge variant="secondary" className="ml-2">
                      {transactionData.blocks?.length || 0}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Recent Transactions</span>
                      {filterType === 'transfers' && (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                          Transfer Filter Active
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEmpty ? (
                      <div className="text-center text-muted-foreground py-8">
                        <FaInfoCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-lg">
                          {debouncedSearchQuery || filterType !== 'all'
                            ? 'No transactions match your search criteria.'
                            : 'No transactions found on this network.'}
                        </p>
                        {(debouncedSearchQuery || filterType !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setSearchQuery('');
                              setFilterType('all');
                            }}
                          >
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      <TransactionsTable
                        transactions={paginatedExtrinsics}
                        showSkeleton={showSkeleton}
                        formatHash={formatHash}
                        formatAddress={formatAddress}
                        getMethodColor={getMethodColor}
                        getStatusIcon={getStatusIcon}
                        handleCopyToClipboard={handleCopyToClipboard}
                      />
                    )}

                    {!isEmpty && (
                      <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        filteredCount={filteredExtrinsics.length}
                        onPrev={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        onNext={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="blocks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Blocks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <BlocksTable
                        blocks={transactionData.blocks || []}
                        showSkeleton={showSkeleton}
                        formatHash={formatHash}
                        handleCopyToClipboard={handleCopyToClipboard}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Transaction Details Dialog */}
      <TransactionDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        isDetailsLoading={isDetailsLoading}
        detailsError={detailsError}
        transactionDetails={transactionDetails}
        formatHash={formatHash}
        formatAddress={formatAddress}
        formatBalance={formatBalance}
        getStatusIcon={getStatusIcon}
        getMethodColor={(section: string) => getMethodColor(section, false)}
        handleCopyToClipboard={handleCopyToClipboard}
      />
    </div>
  );
};

export default TransactionExplorer;