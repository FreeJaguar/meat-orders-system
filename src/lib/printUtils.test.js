import { describe, it, expect } from 'vitest';
import { escapeHtml, renderPrintPageHeader } from './printUtils.js';

describe('escapeHtml', () => {
  it('escapes ampersand, angle brackets, and quotes', () => {
    expect(escapeHtml('<script>&"x"</script>')).toBe('&lt;script&gt;&amp;&quot;x&quot;&lt;/script&gt;');
  });

  it('returns empty string for null or undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('coerces numbers to strings', () => {
    expect(escapeHtml(5)).toBe('5');
  });
});

describe('renderPrintPageHeader', () => {
  const baseOrder = {
    customers: { name: 'מסעדת השלום', code: '0042' },
    delivery_date: '2026-08-10',
    order_number: 'ORD-123',
    order_items: [{ id: 1, quantity: 3 }, { id: 2, units: 10 }]
  };

  it('displays the actual customer code prominently, preserving leading zeros', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('קוד לקוח: 0042');
    expect(html).toContain('class="print-page-header-name"');
    expect(html).not.toContain('לקוח: מסעדת השלום');
  });

  it('preserves the customer name for warehouse identification', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('class="print-page-header-customer-name"');
    expect(html).toContain('מסעדת השלום');
  });

  it('escapes XSS payloads in both the customer code and name', () => {
    const html = renderPrintPageHeader({
      ...baseOrder,
      customers: {
        code: '<script>alert(1)</script>',
        name: '<img src=x onerror=alert(1)>'
      }
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('uses a placeholder if the customer code is missing', () => {
    const html = renderPrintPageHeader({ ...baseOrder, customers: null });
    expect(html).toContain('קוד לקוח: לא צוין');
    expect(html).not.toContain('undefined');
  });

  it('includes the formatted delivery date', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('תאריך אספקה:');
    expect(html).toContain('2026');
  });

  it('shows the number of distinct order lines, not the sum of package quantities', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('כמות פריטים בהזמנה: 2');
    expect(html).not.toContain('כמות פריטים בהזמנה: 13');
  });

  it('shows zero items for empty or missing order_items', () => {
    expect(renderPrintPageHeader({ ...baseOrder, order_items: [] }))
      .toContain('כמות פריטים בהזמנה: 0');
    expect(renderPrintPageHeader({ ...baseOrder, order_items: undefined }))
      .toContain('כמות פריטים בהזמנה: 0');
  });

  it('does not display the order number in the printed header', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).not.toContain('מספר הזמנה');
    expect(html).not.toContain('ORD-123');
  });

  it('marks the header as unsplittable across print pages', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('print-page-header');
  });
});
