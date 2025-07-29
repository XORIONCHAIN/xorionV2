import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FaSearch, FaInfoCircle, FaHashtag, FaClock } from 'react-icons/fa';
import React, { useState } from 'react';

interface TransactionExplorerSidebarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  detailsSearchHash: string;
  setDetailsSearchHash: (v: string) => void;
  handleSearchDetails: () => void;
  isDetailsLoading: boolean;
  transactionCount: number;
  filteredCount: number;
  currentPage: number;
  totalPages: number;
}

const TransactionExplorerSidebar: React.FC<TransactionExplorerSidebarProps> = ({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  detailsSearchHash,
  setDetailsSearchHash,
  handleSearchDetails,
  isDetailsLoading,
  transactionCount,
  filteredCount,
  currentPage,
  totalPages,
}) => {
  const [searchMode, setSearchMode] = useState<'normal' | 'extensive'>('normal');

  // Enhanced search handler with different search modes
  const handleEnhancedSearch = () => {
    if (!detailsSearchHash.trim()) return;
    
    console.log(`🔍 Starting ${searchMode} search for: ${detailsSearchHash}`);
    handleSearchDetails();
  };

  // Quick hash validation
  const isValidHash = (hash: string) => {
    const cleanHash = hash.trim();
    return cleanHash.length === 64 || (cleanHash.startsWith('0x') && cleanHash.length === 66);
  };

  const hashIsValid = isValidHash(detailsSearchHash);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-white space-x-2">
          <FaSearch className="w-5 h-5 text-white" />
          <span>Search & Filter</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Regular Search */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-white">Search Transactions</h3>
          <Input
            placeholder="Search by hash, address, or method..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground">
            Searches current loaded transactions ({transactionCount} total)
          </p>
        </div>

        {/* Filter */}
        <div>
          <label className="block text-sm font-medium mb-1 text-white">Filter by Type</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="transfers">Transfers</SelectItem>
              <SelectItem value="staking">Staking</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Enhanced Hash Search */}
        <div>
          <label className="text-sm font-medium text-foreground flex items-center space-x-2 mb-2">
            <FaHashtag className="w-4 h-4 text-primary" />
            <span>Search by Transaction Hash</span>
          </label>
          
          <div className="space-y-3">
            {/* Hash Input */}
            <div className="space-y-2">
              <Input
                placeholder="0x1234abcd... or 1234abcd..."
                value={detailsSearchHash}
                onChange={(e) => setDetailsSearchHash(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEnhancedSearch()}
                className={`font-mono text-sm ${
                  detailsSearchHash && !hashIsValid ? 'border-red-500' : ''
                }`}
              />
              
              {/* Hash validation feedback */}
              {detailsSearchHash && (
                <div className="flex items-center space-x-2">
                  {hashIsValid ? (
                    <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                      ✓ Valid Hash
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-red-500 border-red-500">
                      ✗ Invalid Hash Format
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Search Mode Selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Search Depth
              </label>
              <Select value={searchMode} onValueChange={(value: 'normal' | 'extensive') => setSearchMode(value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">
                    <div className="flex items-center space-x-2">
                      <FaClock className="w-3 h-3" />
                      <span>Normal (last 500 blocks)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="extensive">
                    <div className="flex items-center space-x-2">
                      <FaClock className="w-3 h-3" />
                      <span>Extensive (last 1000 blocks)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <Button 
              onClick={handleEnhancedSearch}
              size="sm"
              className="w-full"
              disabled={!detailsSearchHash.trim() || !hashIsValid || isDetailsLoading}
            >
              {isDetailsLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching Blockchain...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <FaSearch className="w-3 h-3" />
                  <span>{searchMode === 'extensive' ? 'Deep Search' : 'Search Details'}</span>
                </div>
              )}
            </Button>

            {/* Search Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Normal: Searches recent blocks (faster)</p>
              <p>• Extensive: Searches more blocks (slower but thorough)</p>
              <p>• Hash must be 64 characters (with or without 0x prefix)</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Statistics */}
        <div className="pt-2">
          <div className="text-sm font-medium text-foreground mb-2">Statistics</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Total Transactions:</span>
              <Badge variant="outline" className="text-xs">{transactionCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Filtered Results:</span>
              <Badge variant="outline" className="text-xs">{filteredCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Current Page:</span>
              <Badge variant="outline" className="text-xs">{currentPage} of {totalPages}</Badge>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t border-border">
          <div className="text-sm font-medium text-foreground mb-2">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="text-xs"
            >
              Clear Filters
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDetailsSearchHash('')}
              className="text-xs"
            >
              Clear Hash
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionExplorerSidebar;