import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  itemLabel = 'ideas',
  onPageChange,
  isLoading = false,
}: PaginationControlsProps) {
  if (totalCount === 0 || totalPages <= 1) {
    if (totalCount > 0) {
      return (
        <div className="flex items-center justify-between text-xs text-slate-400 py-3 px-2">
          <span>Mostrando todas las {totalCount} {itemLabel}</span>
        </div>
      );
    }
    return null;
  }

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-xs text-slate-400 font-medium">
        Mostrando <strong className="text-white font-semibold">{from}–{to}</strong> de{' '}
        <strong className="text-white font-semibold">{totalCount}</strong> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className={cn(
            'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
            currentPage <= 1 || isLoading
              ? 'bg-dark-950/50 text-slate-600 border-dark-800/50 cursor-not-allowed'
              : 'bg-dark-950 text-slate-300 border-dark-800 hover:text-white hover:border-dark-700 hover:bg-dark-800'
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-500 text-xs font-mono">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={cn(
                  'w-8 h-8 rounded-xl text-xs font-bold font-mono transition-all border flex items-center justify-center',
                  isActive
                    ? 'bg-aura-500/20 text-aura-300 border-aura-500/40 shadow-sm'
                    : 'bg-dark-950 text-slate-400 border-dark-800 hover:text-white hover:border-dark-700 hover:bg-dark-800'
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className={cn(
            'inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
            currentPage >= totalPages || isLoading
              ? 'bg-dark-950/50 text-slate-600 border-dark-800/50 cursor-not-allowed'
              : 'bg-dark-950 text-slate-300 border-dark-800 hover:text-white hover:border-dark-700 hover:bg-dark-800'
          )}
        >
          <span>Siguiente</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
