'use client';

import { Trash2, Plus, Minus } from 'lucide-react';
import { getQuantityUnit } from '@/lib/productUnits';

export default function OrderItemRow({ item, index, onRemove, onQuantityChange, onFieldChange }) {
  const countUnit = getQuantityUnit({ category: item.category });
  return (
    <div className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="font-semibold text-[var(--color-text)] text-sm">{item.product_name}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">{item.category}</div>
        </div>
        <button type="button" onClick={() => onRemove(index)}
          aria-label={`הסר ${item.product_name} מההזמנה`}
          className="text-[var(--color-danger)] hover:opacity-70 mr-1">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">כמות ({countUnit})</label>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={() => onQuantityChange(index, Math.max(0, Number(item.quantity || 0) - 1))}
              aria-label="הפחת קרטונים"
              className="w-6 h-6 bg-[var(--color-danger)] text-white rounded-full hover:opacity-80 flex items-center justify-center flex-shrink-0">
              <Minus size={10} />
            </button>
            <input type="number" min="0" step="1" inputMode="numeric"
              aria-label={`כמות קרטונים עבור ${item.product_name}`}
              value={item.quantity || ''}
              onChange={(e) => onQuantityChange(index, e.target.value)}
              className="w-full min-w-0 text-center border border-[var(--color-border)] rounded px-1 py-0.5 text-sm text-[var(--color-text)] bg-[var(--color-surface)] font-medium"
            />
            <button type="button"
              onClick={() => onQuantityChange(index, Number(item.quantity || 0) + 1)}
              aria-label="הוסף קרטון"
              className="w-6 h-6 bg-[var(--color-success)] text-white rounded-full hover:opacity-80 flex items-center justify-center flex-shrink-0">
              <Plus size={10} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">יחידות (יח׳)</label>
          <input type="number" min="0" step="1" inputMode="numeric"
            aria-label={`יחידות עבור ${item.product_name}`}
            value={item.units || ''}
            onChange={(e) => onFieldChange(index, 'units', e.target.value)}
            placeholder="0"
            className="w-full border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">משקל (ק״ג)</label>
          <input type="text" inputMode="decimal"
            aria-label={`משקל עבור ${item.product_name}`}
            value={item.weight || ''}
            onChange={(e) => onFieldChange(index, 'weight', e.target.value)}
            placeholder="ק״ג"
            className="w-full border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">הערות</label>
          <input type="text"
            value={item.notes || ''}
            onChange={(e) => onFieldChange(index, 'notes', e.target.value)}
            placeholder="הערות..."
            className="w-full border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]"
          />
        </div>
      </div>
    </div>
  );
}
