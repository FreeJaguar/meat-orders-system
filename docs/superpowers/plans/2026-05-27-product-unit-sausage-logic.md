# Product Unit & Sausage Print Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralise quantity-unit display (קר׳ / יח׳) behind shared helpers driven by product category, and add an extra warehouse print page for "נקניקים" orders.

**Architecture:** A new pure-function module `src/lib/productUnits.js` exports four helpers; the two page files import only what they need. The extra sausage page is generated inside `generatePrintHTML` and appended before `</body>` with `page-break-before: always`.

**Tech Stack:** Next.js 15, React 19, plain JavaScript ES modules, Vitest (added as devDependency for unit tests).

**Spec:** `docs/superpowers/specs/2026-05-27-product-unit-sausage-logic-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/productUnits.js` | 4 helper functions |
| Create | `src/lib/productUnits.test.js` | Unit tests for helpers |
| Modify | `src/app/page.js` | Import + 2 unit display call sites |
| Modify | `src/app/warehouse/page.js` | Import + 2 unit display call sites + extra print page |

---

## Task 1: Create `src/lib/productUnits.js` with tests

**Files:**
- Create: `src/lib/productUnits.js`
- Create: `src/lib/productUnits.test.js`

- [ ] **Step 1.1: Install Vitest**

```bash
npm install -D vitest
```

Expected: `vitest` appears in `package.json` devDependencies.

- [ ] **Step 1.2: Write the failing tests**

Create `src/lib/productUnits.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  normalizeHebrewText,
  isSausageUnitProduct,
  getQuantityUnit,
  isSausagePrintExtraPageProduct
} from './productUnits.js';

describe('normalizeHebrewText', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeHebrewText('  שלום  ')).toBe('שלום');
  });
  it('returns empty string for null', () => {
    expect(normalizeHebrewText(null)).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(normalizeHebrewText(undefined)).toBe('');
  });
  it('returns empty string for empty input', () => {
    expect(normalizeHebrewText('')).toBe('');
  });
});

describe('isSausageUnitProduct', () => {
  it('returns true for category נקניקים', () => {
    expect(isSausageUnitProduct({ category: 'נקניקים' })).toBe(true);
  });
  it('returns false for מוסדי', () => {
    expect(isSausageUnitProduct({ category: 'מוסדי' })).toBe(false);
  });
  it('returns false for מוצרי בקר', () => {
    expect(isSausageUnitProduct({ category: 'מוצרי בקר' })).toBe(false);
  });
  it('returns false for empty category string', () => {
    expect(isSausageUnitProduct({ category: '' })).toBe(false);
  });
  it('returns false for null product', () => {
    expect(isSausageUnitProduct(null)).toBe(false);
  });
  it('returns false for product with no category field', () => {
    expect(isSausageUnitProduct({})).toBe(false);
  });
});

describe('getQuantityUnit', () => {
  it('returns יח׳ for נקניקים', () => {
    expect(getQuantityUnit({ category: 'נקניקים' })).toBe('יח׳');
  });
  it('returns קר׳ for מוסדי', () => {
    expect(getQuantityUnit({ category: 'מוסדי' })).toBe('קר׳');
  });
  it('returns קר׳ for מוצרי הודו', () => {
    expect(getQuantityUnit({ category: 'מוצרי הודו' })).toBe('קר׳');
  });
  it('returns קר׳ for כבש', () => {
    expect(getQuantityUnit({ category: 'כבש' })).toBe('קר׳');
  });
  it('returns קר׳ for null product', () => {
    expect(getQuantityUnit(null)).toBe('קר׳');
  });
  it('returns קר׳ for product with no category', () => {
    expect(getQuantityUnit({})).toBe('קר׳');
  });
});

describe('isSausagePrintExtraPageProduct', () => {
  it('returns true for נקניקים', () => {
    expect(isSausagePrintExtraPageProduct({ category: 'נקניקים' })).toBe(true);
  });
  it('returns false for כבש', () => {
    expect(isSausagePrintExtraPageProduct({ category: 'כבש' })).toBe(false);
  });
  it('returns false for null', () => {
    expect(isSausagePrintExtraPageProduct(null)).toBe(false);
  });
});
```

- [ ] **Step 1.3: Run tests — expect failure (file does not exist yet)**

```bash
npx vitest run src/lib/productUnits.test.js
```

Expected output contains: `Cannot find module './productUnits.js'` or similar import error. This confirms the test harness works.

- [ ] **Step 1.4: Create `src/lib/productUnits.js`**

```js
export function normalizeHebrewText(value) {
  return String(value || '').trim().normalize('NFC');
}

export function isSausageUnitProduct(product) {
  return normalizeHebrewText(product?.category) === 'נקניקים';
}

export function getQuantityUnit(product) {
  return isSausageUnitProduct(product) ? 'יח׳' : 'קר׳';
}

export function isSausagePrintExtraPageProduct(product) {
  return isSausageUnitProduct(product);
}
```

- [ ] **Step 1.5: Run tests — expect all pass**

```bash
npx vitest run src/lib/productUnits.test.js
```

Expected: all 16 tests pass, zero failures.

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/productUnits.js src/lib/productUnits.test.js package.json package-lock.json
git commit -m "feat: add productUnits helpers driven by product category"
```

---

## Task 2: Update order entry form (`src/app/page.js`)

**Files:**
- Modify: `src/app/page.js:6` (import)
- Modify: `src/app/page.js:792` (product list row)
- Modify: `src/app/page.js:924-926` (product modal unit label)

- [ ] **Step 2.1: Add import**

In `src/app/page.js`, after line 6 (`import { getItemWeightAndNotes } from '@/lib/orderUtils';`), add:

```js
import { getQuantityUnit } from '@/lib/productUnits';
```

- [ ] **Step 2.2: Update product list row**

In `src/app/page.js`, find this line (≈line 792):

```jsx
<span className="text-gray-700">{product.unit || 'יחידה'}</span>
```

Replace with:

```jsx
<span className="text-gray-700">{getQuantityUnit(product)}</span>
```

- [ ] **Step 2.3: Update product modal quantity label**

In `src/app/page.js`, find this span (≈lines 924-926):

```jsx
<span className="text-sm text-gray-600 mr-2 font-medium">
  {selectedProduct.unit === 'ק"ג' ? 'קר׳' : selectedProduct.unit}
</span>
```

Replace with:

```jsx
<span className="text-sm text-gray-600 mr-2 font-medium">
  {getQuantityUnit(selectedProduct)}
</span>
```

- [ ] **Step 2.4: Manual verification**

Run the dev server (`npm run dev`) and open `http://localhost:3000`.

Check:
- [ ] Product list shows "קר׳" next to non-sausage products
- [ ] Product list shows "יח׳" next to products whose category is "נקניקים"
- [ ] Opening a "נקניקים" product's quantity modal shows "יח׳" next to the quantity spinner
- [ ] Opening any other product's quantity modal shows "קר׳"

- [ ] **Step 2.5: Commit**

```bash
git add src/app/page.js
git commit -m "feat: use getQuantityUnit in order entry form"
```

---

## Task 3: Update warehouse dashboard unit display (`src/app/warehouse/page.js`)

**Files:**
- Modify: `src/app/warehouse/page.js:6` (import)
- Modify: `src/app/warehouse/page.js:519` (order details modal)
- Modify: `src/app/warehouse/page.js:186` (print HTML main list)

- [ ] **Step 3.1: Add import**

In `src/app/warehouse/page.js`, after line 6 (`import { getItemWeightAndNotes } from '@/lib/orderUtils';`), add:

```js
import { getQuantityUnit, isSausagePrintExtraPageProduct } from '@/lib/productUnits';
```

- [ ] **Step 3.2: Update order details modal**

In `src/app/warehouse/page.js`, find this expression (≈line 519, inside the items-by-category render):

```jsx
{weight ? weight : `${item.quantity} ${item.products?.unit || 'יח׳'}`}
```

Replace with:

```jsx
{weight ? weight : `${item.quantity} ${getQuantityUnit(item.products)}`}
```

- [ ] **Step 3.3: Update print HTML main list**

In `src/app/warehouse/page.js`, inside `generatePrintHTML`, find this line (≈line 186):

```js
${weight ? weight : `${item.quantity} ${escapeHtml(item.products?.unit || 'יח׳')}`}
```

Replace with:

```js
${weight ? weight : `${item.quantity} ${escapeHtml(getQuantityUnit(item.products))}`}
```

- [ ] **Step 3.4: Manual verification**

Open the warehouse dashboard (`http://localhost:3000/warehouse`) and open an order's detail modal.

Check:
- [ ] Items in non-sausage categories show "קר׳" after the quantity
- [ ] Items in category "נקניקים" show "יח׳" after the quantity
- [ ] Items with weight set show only the weight value (no unit) — unchanged behaviour

- [ ] **Step 3.5: Commit**

```bash
git add src/app/warehouse/page.js
git commit -m "feat: use getQuantityUnit in warehouse modal and print main list"
```

---

## Task 4: Add extra sausage page to warehouse print

**Files:**
- Modify: `src/app/warehouse/page.js` — `generatePrintHTML` function (≈lines 165–240)

The `generatePrintHTML` function currently computes `itemsByCategory` and `categoriesHTML`, then returns the full HTML string. This task adds `sausageItems` and `sausagePageHTML` variables in that same local scope.

- [ ] **Step 4.1: Add sausage variables inside `generatePrintHTML`**

In `src/app/warehouse/page.js`, find the `generatePrintHTML` function. Immediately **after** the closing of the `categoriesHTML` assignment (after the `.join('')` line, before the `return`), insert:

```js
    const sausageItems = (order.order_items || []).filter(
      item => isSausagePrintExtraPageProduct(item.products)
    );

    const sausagePageHTML = sausageItems.length === 0 ? '' : `
      <div style="page-break-before:always;padding:20px 10px;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">
        <h2 style="text-align:center;font-size:16px;font-weight:bold;margin:0 0 15px 0;padding-bottom:8px;border-bottom:2px solid #374151;color:#1f2937;">
          ריכוז נקניקים - עמוד נפרד למחסן
        </h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#e5e7eb;">
              <th style="border:1px solid #9ca3af;padding:8px;text-align:right;font-weight:bold;">מוצר</th>
              <th style="border:1px solid #9ca3af;padding:8px;text-align:center;font-weight:bold;width:70px;">כמות</th>
              <th style="border:1px solid #9ca3af;padding:8px;text-align:center;font-weight:bold;width:60px;">יחידה</th>
              <th style="border:1px solid #9ca3af;padding:8px;text-align:right;font-weight:bold;">הערות</th>
            </tr>
          </thead>
          <tbody>
            ${sausageItems.map(item => {
              const { weight, notes } = getItemWeightAndNotes(item);
              const qty = weight ? escapeHtml(weight) : item.quantity;
              const unit = weight ? 'ק"ג' : getQuantityUnit(item.products);
              return `
                <tr>
                  <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(item.products?.name || 'מוצר לא זמין')}</td>
                  <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${qty}</td>
                  <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${unit}</td>
                  <td style="border:1px solid #d1d5db;padding:8px;">${escapeHtml(notes)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
```

- [ ] **Step 4.2: Inject `sausagePageHTML` into the return string**

In the same `generatePrintHTML` function, find the return template (≈lines 194–239). The closing section currently reads:

```js
  <div class="items-container">
    <div class="categories-container">${categoriesHTML}</div>
  </div>
</body>
</html>`;
```

Replace with:

```js
  <div class="items-container">
    <div class="categories-container">${categoriesHTML}</div>
  </div>
  ${sausagePageHTML}
</body>
</html>`;
```

- [ ] **Step 4.3: Manual verification**

Open the warehouse dashboard and click "הדפס" (print) on an order that has at least one "נקניקים" item.

Check:
- [ ] First page(s) show the normal 2-column category layout including the "נקניקים" items
- [ ] A second page appears with heading "ריכוז נקניקים - עמוד נפרד למחסן"
- [ ] The extra page is a single-column table with columns: מוצר | כמות | יחידה | הערות
- [ ] Quantity-only "נקניקים" rows show the count in כמות and "יח׳" in יחידה
- [ ] Weight-only "נקניקים" rows show the weight value in כמות and `ק"ג` in יחידה
- [ ] Notes appear in the הערות column where present

Then print an order that has **no** "נקניקים" items:
- [ ] Only one page is generated — no extra page

- [ ] **Step 4.4: Commit**

```bash
git add src/app/warehouse/page.js
git commit -m "feat: add נקניקים extra print page to warehouse order print"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| `normalizeHebrewText` helper | Task 1 |
| `isSausageUnitProduct` helper | Task 1 |
| `getQuantityUnit` helper | Task 1 |
| `isSausagePrintExtraPageProduct` helper | Task 1 |
| Product list / order entry uses `getQuantityUnit` | Task 2 |
| Product modal uses `getQuantityUnit` | Task 2 |
| Warehouse modal uses `getQuantityUnit` | Task 3 |
| Print main list uses `getQuantityUnit` | Task 3 |
| Extra print page for "נקניקים" orders | Task 4 |
| Weight rows → qty=weight, unit=ק"ג | Task 4 step 4.1 |
| Quantity rows → qty=item.quantity, unit=getQuantityUnit | Task 4 step 4.1 |
| Extra page only when ≥1 נקניקים item | Task 4 step 4.1 (`sausageItems.length === 0 ? ''`) |
| נקניקים items remain in main print list | Not removed — only added to extra page |
| CSV export unchanged | No task — confirmed no unit column exists |
