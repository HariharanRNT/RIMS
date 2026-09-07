import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  disabled = false,
}) => {
  if (totalCount === 0) {
    return null;
  }

  const safeCurrentPage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalCount);

  // Helper to generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, safeCurrentPage - 1);
      let end = Math.min(totalPages - 1, safeCurrentPage + 1);

      if (safeCurrentPage <= 3) {
        end = 4;
      } else if (safeCurrentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '14px 18px',
        marginTop: '16px',
        borderRadius: '14px',
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Items count summary */}
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Showing <strong style={{ color: 'var(--text-main)' }}>{startItem}</strong>–
        <strong style={{ color: 'var(--text-main)' }}>{endItem}</strong> of{' '}
        <strong style={{ color: 'var(--text-main)' }}>{totalCount}</strong> items
      </div>

      {/* Controls & Page Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={disabled}
              style={{
                background: 'var(--input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.825rem',
                outline: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option} style={{ background: 'var(--panel)', color: 'var(--text-main)' }}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={disabled || safeCurrentPage <= 1}
            title="Previous Page"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--panel-raised)',
              color: safeCurrentPage <= 1 || disabled ? 'var(--text-faint)' : 'var(--text-main)',
              cursor: safeCurrentPage <= 1 || disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              fontWeight: 500,
            }}
          >
            <ChevronLeft size={16} />
            <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>Prev</span>
          </button>

          {/* Number Buttons */}
          {pages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: '4px 8px',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  ...
                </span>
              );
            }

            const isActive = p === safeCurrentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={disabled || isActive}
                style={{
                  minWidth: '34px',
                  height: '34px',
                  padding: '0 6px',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 600 : 400,
                  border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: isActive ? 'var(--primary-tint)' : 'var(--panel)',
                  color: isActive ? 'var(--primary)' : 'var(--text-main)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? 'var(--shadow-glow-primary)' : 'none',
                }}
              >
                {p}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={disabled || safeCurrentPage >= totalPages}
            title="Next Page"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--panel-raised)',
              color: safeCurrentPage >= totalPages || disabled ? 'var(--text-faint)' : 'var(--text-main)',
              cursor: safeCurrentPage >= totalPages || disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: '0.8rem', marginRight: '4px' }}>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
