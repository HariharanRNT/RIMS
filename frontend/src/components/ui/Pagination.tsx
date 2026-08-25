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
        padding: '12px 16px',
        marginTop: '16px',
        borderRadius: '12px',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Items count summary */}
      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
        Showing <strong style={{ color: '#111827' }}>{startItem}</strong>–
        <strong style={{ color: '#111827' }}>{endItem}</strong> of{' '}
        <strong style={{ color: '#111827' }}>{totalCount}</strong> items
      </div>

      {/* Controls & Page Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: '#6b7280' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={disabled}
              style={{
                background: '#ffffff',
                color: '#111827',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.825rem',
                outline: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option} style={{ background: '#ffffff', color: '#111827' }}>
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
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: safeCurrentPage <= 1 || disabled ? '#d1d5db' : '#374151',
              cursor: safeCurrentPage <= 1 || disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
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
                    color: '#9ca3af',
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
                  minWidth: '32px',
                  height: '32px',
                  padding: '0 6px',
                  borderRadius: '6px',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 600 : 400,
                  border: isActive ? '1px solid #E8873C' : '1px solid #e5e7eb',
                  background: isActive ? '#fff4e6' : '#ffffff',
                  color: isActive ? '#E8873C' : '#374151',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
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
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: safeCurrentPage >= totalPages || disabled ? '#d1d5db' : '#374151',
              cursor: safeCurrentPage >= totalPages || disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
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
