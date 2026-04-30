'use client';

import { Trash2, Plus, Minus } from 'lucide-react';

export default function OrderItemRow({ item, index, onRemove, onQuantityChange, onFieldChange }) {
  return (
    <div className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="font-semibold text-[var(--color-text)] text-sm">{item.product_name}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">{item.category}</div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-[var(--color-danger)] hover:opacity-70 mr-1"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">כמות</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onQuantityChange(index, item.quantity - 1)}
              className="w-6 h-6 bg-[var(--color-danger)] text-white rounded-full hover:opacity-80 flex items-center justify-center flex-shrink-0"
            >
              <Minus size={10} />
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => onQuantityChange(index, parseInt(e.target.value) || 0)}
              className="w-10 text-center border border-[var(--color-border)] rounded px-1 py-0.5 text-sm text-[var(--color-text)] bg-[var(--color-surface)] font-medium"
              min="0"
            />
            <button
              type="button"
              onClick={() => onQuantityChange(index, item.quantity + 1)}
              className="w-6 h-6 bg-[var(--color-success)] text-white rounded-full hover:opacity-80 flex items-center justify-center flex-shrink-0"
            >
              <Plus size={10} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">משקל</label>
          <input
            type="text"
            value={item.weight || ''}
            onChange={(e) => onFieldChange(index, 'weight', e.target.value)}
            placeholder='ק"ג'
            className="w-full border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">הערות</label>
          <input
            type="text"
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
