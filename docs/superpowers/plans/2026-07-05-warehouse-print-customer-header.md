# Warehouse Print Customer Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every printed warehouse page (main list, נקניקים extra page, and any future extra page) must open with a large, unmissable customer-name banner so pages can't be mixed up between orders.

**Architecture:** Add a new pure, unit-tested helper `renderPrintPageHeader(order)` in `src/lib/printUtils.js` (alongside a relocated `escapeHtml`). Call it from the existing `generatePrintHTML` in `src/app/warehouse/page.js` at the top of the main page and at the top of the נקניקים extra page. No other print logic changes.

**Tech Stack:** Next.js client component (`src/app/warehouse/page.js`), plain template-string HTML generation, Vitest for unit tests.

## Global Constraints

- All dynamic values injected into print HTML MUST go through `escapeHtml`.
- Do not change נקניקים filtering logic, quantity/unit behavior, or Excel export.
- Do not redesign the overall print layout — this is additive only.
- The header bar must use `break-inside: avoid; page-break-inside: avoid;` so it never splits across a page boundary.
- Customer name text must be ~28-32px, bold, and clearly RTL.

---

### Task 1: Add `printUtils.js` with `escapeHtml` and `renderPrintPageHeader`

**Files:**
- Create: `src/lib/printUtils.js`
- Create: `src/lib/printUtils.test.js`

**Interfaces:**
- Produces: `escapeHtml(str: string): string` — escapes `&`, `<`, `>`, `"`. Identical behavior to the function currently defined at `src/app/warehouse/page.js:624`.
- Produces: `renderPrintPageHeader(order: { customers?: { name?: string }, delivery_date?: string, order_number?: string }): string` — returns an HTML string for the header banner. Consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/printUtils.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/printUtils.test.js`
Expected: FAIL with "Failed to resolve import ./printUtils.js" (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/printUtils.js`:

```js
// Escapes user-supplied strings before inserting them into print HTML
// built via document.write() in the warehouse print window.
export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDeliveryDate(deliveryDate) {
  if (!deliveryDate) return '';
  return new Date(deliveryDate).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Prominent banner repeated at the top of every printed warehouse page/section
// so pages can't be mixed up between different customers' orders.
export function renderPrintPageHeader(order) {
  const customerName = order?.customers?.name || 'לא צוין';
  const deliveryDate = formatDeliveryDate(order?.delivery_date);
  const orderNumber = order?.order_number || '';

  const metaParts = [];
  if (deliveryDate) metaParts.push(`תאריך אספקה: ${escapeHtml(deliveryDate)}`);
  if (orderNumber) metaParts.push(`מספר הזמנה: ${escapeHtml(orderNumber)}`);

  return `
    <div class="print-page-header">
      <div class="print-page-header-name">לקוח: ${escapeHtml(customerName)}</div>
      ${metaParts.length ? `<div class="print-page-header-meta">${metaParts.join(' | ')}</div>` : ''}
    </div>
  `;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/printUtils.test.js`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/printUtils.js src/lib/printUtils.test.js
git commit -m "feat: add printUtils with prominent print page header banner"
```

---

### Task 2: Wire the header banner into `generatePrintHTML`

**Files:**
- Modify: `src/app/warehouse/page.js:1-9` (imports)
- Modify: `src/app/warehouse/page.js:239-286` (`generatePrintHTML` body — insert header calls, add CSS)
- Modify: `src/app/warehouse/page.js:622-630` (delete local `escapeHtml`, now sourced from `printUtils.js`)

**Interfaces:**
- Consumes: `escapeHtml(str: string): string` and `renderPrintPageHeader(order): string` from `src/lib/printUtils.js` (Task 1).

- [ ] **Step 1: Update imports**

In `src/app/warehouse/page.js`, replace line 7:

```js
import { getQuantityUnit, isSausagePrintExtraPageProduct } from '@/lib/productUnits';
```

with:

```js
import { getQuantityUnit, isSausagePrintExtraPageProduct } from '@/lib/productUnits';
import { escapeHtml, renderPrintPageHeader } from '@/lib/printUtils';
```

- [ ] **Step 2: Delete the now-duplicate local `escapeHtml`**

Delete lines 621-630 (the trailing comment + `function escapeHtml(str) {...}` block) at the end of the file, since it's now imported from `printUtils.js`.

- [ ] **Step 3: Add header CSS to the `<style>` block**

In the `<style>` block inside `generatePrintHTML` (around line 244-255), add after the existing `.items-container` rule:

```css
    .items-container { border:2px solid #e5e7eb; border-radius:8px; overflow:hidden; background:white; }
    .print-page-header {
      border: 3px solid #1f2937;
      background: #f3f4f6;
      padding: 14px 16px;
      margin: 0 0 16px 0;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .print-page-header-name { font-size: 30px; font-weight: 800; color: #111827; }
    .print-page-header-meta { margin-top: 6px; font-size: 13px; font-weight: 600; color: #374151; }
```

- [ ] **Step 4: Insert the header at the top of the main print page**

Change (around line 257-258):

```js
<body>
  <div class="info-grid">
```

to:

```js
<body>
  ${renderPrintPageHeader(order)}
  <div class="info-grid">
```

- [ ] **Step 5: Insert the header at the top of the נקניקים extra page**

Change (around line 206-210), noting the added comment for future extra pages:

```js
    // Any future extra print page must also open with renderPrintPageHeader(order).
    const sausagePageHTML = sausageItems.length === 0 ? '' : `
      <div style="page-break-before:always;padding:20px 10px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">
        ${renderPrintPageHeader(order)}
        <h2 style="text-align:center;font-size:16px;font-weight:bold;margin:0 0 15px 0;padding-bottom:8px;border-bottom:2px solid #374151;color:#1f2937;">
          ריכוז נקניקים - עמוד נפרד למחסן
        </h2>
```

- [ ] **Step 6: Run the full test suite to confirm nothing else broke**

Run: `npm run test`
Expected: PASS (all existing suites, including `productUnits.test.js` and the new `printUtils.test.js`).

- [ ] **Step 7: Commit**

```bash
git add src/app/warehouse/page.js
git commit -m "feat: show prominent customer header on every warehouse print page"
```

---

### Task 3: Manual print verification (per spec requirement 12)

**Files:** none (manual browser verification only — `generatePrintHTML` is a `window.open`/`document.write` flow that can't be driven headlessly without a much larger test harness, which is out of scope for this fix).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify an order with no נקניקים items (single print page)**

In the warehouse dashboard, open an order whose items are all non-נקניקים categories and click "הדפס". In the print preview:
- Confirm the bordered banner appears at the very top, above "פרטי לקוח" / "פרטי הזמנה".
- Confirm "לקוח: {name}" is large and bold, and the date/order-number line is visible underneath.
- Confirm no נקניקים page was generated.

- [ ] **Step 3: Verify an order with נקניקים items (extra page)**

Open an order that includes at least one נקניקים product and click "הדפס". In the print preview:
- Confirm the main page shows the banner as in Step 2.
- Confirm the נקניקים page (after the page break) starts with the same banner, followed by "ריכוז נקניקים - עמוד נפרד למחסן", followed by the table.

- [ ] **Step 4: Verify an order with enough items to overflow onto multiple physical pages, if such an order exists**

Open the largest available order (many items across categories) and check the print preview page-by-page:
- Confirm the banner appears on the first physical page.
- Note whether the two-column category layout causes automatic overflow onto further physical pages without a repeated banner — if so, this is a known limitation of the current CSS-columns layout (not something this fix's page-break-based header insertion can control) and should be called out to the user rather than silently accepted.

- [ ] **Step 5: Confirm no regressions in unrelated features**

- Click "ייצא לאקסל" and confirm the CSV export still works unchanged.
- Confirm נקניקים quantity/unit display (יח׳ vs ק"ג/קר׳) is unchanged in both the main list and extra page.
