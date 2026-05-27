'use client';
import { getQuantityUnit } from '@/lib/productUnits';

export default function ProductCard({ product, onAdd, isInOrder }) {
  return (
    <div
      className="flex justify-between items-center p-3 rounded-lg border transition-colors"
      style={isInOrder ? {
        backgroundColor: 'var(--color-accent-light)',
        borderColor: 'var(--color-accent)',
        borderRightWidth: '3px',
      } : {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex-1">
        <span
          className={`text-[var(--color-text)] ${isInOrder ? 'font-semibold' : 'font-medium'}`}
        >
          {product.name}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-2 py-0.5 rounded text-xs font-medium">
            {product.category}
          </span>
          <span className="text-[var(--color-text-secondary)] text-xs">{getQuantityUnit(product)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAdd(product)}
        className="px-3 py-1.5 rounded text-sm font-medium transition-opacity"
        style={isInOrder ? {
          border: '1px solid var(--color-accent)',
          color: 'var(--color-accent)',
          backgroundColor: 'transparent',
        } : {
          backgroundColor: 'var(--color-accent)',
          color: '#FFFFFF',
        }}
      >
        {isInOrder ? 'עדכן' : 'הוסף'}
      </button>
    </div>
  );
}
