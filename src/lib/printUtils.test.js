import { describe, it, expect } from 'vitest';
import { escapeHtml, renderPrintPageHeader } from './printUtils.js';

describe('escapeHtml', () => {
  it('escapes ampersand, angle brackets, and quotes', () => {
    expect(escapeHtml('<script>&"x"</script>')).toBe('&lt;script&gt;&amp;&quot;x&quot;&lt;/script&gt;');
  });
  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });
  it('coerces numbers to strings', () => {
    expect(escapeHtml(5)).toBe('5');
  });
});

describe('renderPrintPageHeader', () => {
  const baseOrder = {
    customers: { name: 'מסעדת השלום' },
    delivery_date: '2026-08-10',
    order_number: 'ORD-123'
  };

  it('includes the customer name with the לקוח label', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('לקוח: מסעדת השלום');
  });

  it('escapes an XSS payload in the customer name', () => {
    const html = renderPrintPageHeader({
      ...baseOrder,
      customers: { name: '<img src=x onerror=alert(1)>' }
    });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('falls back to a placeholder when customer name is missing', () => {
    const html = renderPrintPageHeader({ ...baseOrder, customers: null });
    expect(html).toContain('לקוח: לא צוין');
  });

  it('includes a formatted delivery date', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('תאריך אספקה:');
    expect(html).toContain('2026');
  });

  it('includes the order number when present', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('מספר הזמנה: ORD-123');
  });

  it('omits the order number section when absent', () => {
    const html = renderPrintPageHeader({ ...baseOrder, order_number: '' });
    expect(html).not.toContain('מספר הזמנה');
  });

  it('marks the header as unsplittable across print pages', () => {
    const html = renderPrintPageHeader(baseOrder);
    expect(html).toContain('print-page-header');
  });
});
