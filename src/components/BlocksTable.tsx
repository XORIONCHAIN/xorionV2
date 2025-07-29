import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import { FaCopy } from 'react-icons/fa';

interface Block {
  height: number;
  hash: string;
  txCount: number;
  timestamp?: Date;
}

interface BlocksTableProps {
  blocks: Block[];
  showSkeleton: boolean;
  formatHash: (hash: string) => string;
  handleCopyToClipboard: (text: string, label: string) => void;
}

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

const BlocksTable: React.FC<BlocksTableProps> = ({
  blocks,
  showSkeleton,
  formatHash,
  handleCopyToClipboard,
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="text-white">Height</TableHead>
        <TableHead className="text-white">Hash</TableHead>
        <TableHead className="text-white">Transactions</TableHead>
        <TableHead className="text-white">Time</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {showSkeleton ? (
        Array.from({ length: 10 }, (_, i) => <BlockSkeleton key={i} />)
      ) : (
        blocks.map((block, index) => (
          <TableRow key={index} className="hover:bg-muted/50">
            <TableCell className="text-white">
              <span className="font-medium text-white">{block.height}</span>
            </TableCell>
            <TableCell className="text-white">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm text-white">{formatHash(block.hash)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(block.hash, 'Block Hash')}
                  className="h-6 w-6 p-0"
                >
                  <FaCopy className="w-3 h-3" />
                </Button>
              </div>
            </TableCell>
            <TableCell className="text-white">
              <Badge variant="outline">{block.txCount}</Badge>
            </TableCell>
            <TableCell className="text-white">
              <span className="text-sm text-white">
                {block.timestamp ? block.timestamp.toLocaleTimeString() : 'N/A'}
              </span>
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
);

export default BlocksTable; 