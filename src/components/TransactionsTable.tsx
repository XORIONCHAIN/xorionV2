import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import { FaCopy } from 'react-icons/fa';

interface Transaction {
  hash: string;
  blockNumber: number;
  section: string;
  method: string;
  signer: string;
  success: boolean;
  timestamp?: Date;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  showSkeleton: boolean;
  formatHash: (hash: string) => string;
  formatAddress: (address: string) => string;
  getMethodColor: (section: string) => string;
  getStatusIcon: (success: boolean) => React.ReactNode;
  handleCopyToClipboard: (text: string, label: string) => void;
}

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

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  showSkeleton,
  formatHash,
  formatAddress,
  getMethodColor,
  getStatusIcon,
  handleCopyToClipboard,
}) => {
  const isEmpty = !showSkeleton && transactions.length === 0;
  transactions.map((tx) => {
    console.log(tx);
  });
  return (
    <>
      {isEmpty ? (
        <div className="text-center text-muted-foreground py-8 text-lg">
          No transactions found.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-white">Hash</TableHead>
              <TableHead className="text-white">Block</TableHead>
              <TableHead className="text-white">Method</TableHead>
              <TableHead className="text-white">Signer</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-white">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton ? (
              Array.from({ length: 10 }, (_, i) => <TransactionSkeleton key={i} />)
            ) : (
              transactions.map((tx, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="text-white">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-white">{formatHash(tx.hash)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToClipboard(tx.hash, 'Hash')}
                        className="h-6 w-6 p-0"
                      >
                        <FaCopy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">
                    <span className="text-sm text-white">{tx.blockNumber}</span>
                  </TableCell>
                  <TableCell className="text-white">
                    <Badge className={"text-xs " + getMethodColor(tx.section)}>
                      {tx.section}.{tx.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white">
                    <span className="text-sm font-mono text-white">{formatAddress(tx.signer)}</span>
                  </TableCell>
                  <TableCell className="text-white">
                    {getStatusIcon(tx.success)}
                  </TableCell>
                  <TableCell className="text-white">
                    <span className="text-sm text-white">
                      {tx.timestamp ? tx.timestamp.toLocaleTimeString() : 'N/A'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </>
  );
};

export default TransactionsTable; 