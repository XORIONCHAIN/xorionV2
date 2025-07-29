import { Button } from '@/components/ui/button';
import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  onPrev: () => void;
  onNext: () => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  filteredCount,
  onPrev,
  onNext,
}) => (
  <div className="flex items-center justify-between mt-4">
    <div className="text-sm text-muted-foreground">
      Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, filteredCount)} of {filteredCount} transactions
    </div>
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={currentPage === 1}
        className="text-white"
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={currentPage >= totalPages}
        className="text-white"
      >
        Next
      </Button>
    </div>
  </div>
);

export default PaginationControls; 