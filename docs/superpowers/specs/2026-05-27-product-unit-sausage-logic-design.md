# Product Unit & Sausage Print Logic — Design Spec
Date: 2026-05-27

## Goal

Centralise quantity-unit display logic (קר׳ vs יח׳) into a single shared helper file, using **product category** as the only source of truth. Add an extra warehouse print page for orders that contain products from category "נקניקים".

---

## Rules (authoritative)

1. Display **"יח׳"** when `product.category === 'נקניקים'` (exact match). All other categories, including "מוסדי", display **"קר׳"**.
2. Never detect sausage products by name (`product.name.includes(...)` is forbidden for this logic).
3. "נקניקים" products stay in the regular full product list of the print. The extra page is *additive*.
4. The extra page is only generated when at least one order item has category "נקניקים".

---

## New file: `src/lib/productUnits.js`

Four named exports:

### `normalizeHebrewText(value)`
Trims whitespace and applies Unicode NFC normalisation. Used internally so Hebrew comparisons are stable across text sources.

```js
export function normalizeHebrewText(value) {
  return String(value || '').trim().normalize('NFC');
}
```

### `isSausageUnitProduct(product)`
Returns `true` when the product belongs to the sausage unit category. Drives the unit display decision.

```js
export function isSausageUnitProduct(product) {
  return normalizeHebrewText(product?.category) === 'נקניקים';
}
```

### `getQuantityUnit(product)`
Primary public API. Returns the correct unit string for display.

```js
export function getQuantityUnit(product) {
  return isSausageUnitProduct(product) ? 'יח׳' : 'קר׳';
}
```

### `isSausagePrintExtraPageProduct(product)`
Semantic alias for the print extra-page decision. Same condition as `isSausageUnitProduct` but named for its distinct purpose (controlling print layout, not display units), making each call site self-documenting.

```js
export function isSausagePrintExtraPageProduct(product) {
  return isSausageUnitProduct(product);
}
```

---

## Changes to `src/app/page.js`

Import `getQuantityUnit` from `@/lib/productUnits`.

| Location | Current | Replacement |
|----------|---------|-------------|
| Product list row (≈line 792) | `product.unit \|\| 'יחידה'` | `getQuantityUnit(product)` |
| Product modal quantity label (≈line 924–926) | `selectedProduct.unit === 'ק"ג' ? 'קר׳' : selectedProduct.unit` | `getQuantityUnit(selectedProduct)` |

No other quantity-unit display exists in this file.

---

## Changes to `src/app/warehouse/page.js`

Import `getQuantityUnit` and `isSausagePrintExtraPageProduct` from `@/lib/productUnits`.

### 1. Order details modal (≈line 519)

| Current | Replacement |
|---------|-------------|
| `` `${item.quantity} ${item.products?.unit \|\| 'יח׳'}` `` | `` `${item.quantity} ${getQuantityUnit(item.products)}` `` |

### 2. `generatePrintHTML` — main product list (≈line 186)

| Current | Replacement |
|---------|-------------|
| `` `${item.quantity} ${escapeHtml(item.products?.unit \|\| 'יח׳')}` `` | `` `${item.quantity} ${escapeHtml(getQuantityUnit(item.products))}` `` |

### 3. `generatePrintHTML` — extra sausage page (new)

Appended **after** the `items-container` div, conditional on the order containing at least one item whose category is exactly "נקניקים".

**Structure:**
```html
<div style="page-break-before: always;">
  <h2>ריכוז נקניקים - עמוד נפרד למחסן</h2>
  <table>
    <thead>
      <tr><th>מוצר</th><th>כמות</th><th>יחידה</th><th>הערות</th></tr>
    </thead>
    <tbody>
      <!-- one row per נקניקים item -->
      <tr><td>{name}</td><td>{quantity or weight}</td><td>{unit}</td><td>{notes}</td></tr>
    </tbody>
  </table>
</div>
```

- Unit column uses `getQuantityUnit(item.products)` → always "יח׳" for these items.
- Weight rows: quantity cell shows the weight value; unit cell shows the weight value (same as main print convention) — or alternatively display "משקל" as the unit. **Decision: when `weight` is set, quantity cell = weight value, unit cell = empty string** (consistent with main print which omits the unit when weight is present).
- Notes column shows `notes` from `getItemWeightAndNotes`.
- Table has a clean border, RTL direction.

---

## CSV export (`generateCSVContent`)

Currently has no unit column and no "יח׳"/"קר׳" text in any column. **No change required.**

---

## Out of scope

- No changes to Supabase queries or the products DB schema.
- No changes to how `product.unit` is stored — `getQuantityUnit` derives display purely from `product.category`.
- No changes to any other file beyond the three listed above.
