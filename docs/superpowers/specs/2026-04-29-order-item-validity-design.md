# Order Item Validity — Design Spec
**Date:** 2026-04-29
**Branch:** redesign-ui
**File in scope:** `src/app/page.js`

---

## Problem

The trash icon sets an item's quantity to 0 instead of removing it. Items with `quantity = 0` and no weight remain in state, persist to localStorage, and survive page refresh. The submission guard catches them at the last moment but the invalid state is never cleaned up.

---

## Validity Rule

An item is valid if:

```
item.quantity > 0  ||  (item.weight && item.weight.trim() !== '')
```

- **Unit-based item:** `quantity > 0`, weight is empty.
- **Weight-based item:** `quantity = 0` (intentional), weight is a non-empty string.
- **Invalid item:** `quantity <= 0` AND weight is empty or whitespace — must never exist in state.

This single predicate is the source of truth for all removal decisions, localStorage filtering, and UI guards.

---

## Approach: Fix at Mutation Sites (Option A)

All changes are in `src/app/page.js`. No new files. No new abstractions beyond a `removeItem` helper.

---

## Changes

### 1. New helper — `removeItem(index)`

```js
const removeItem = (index) =>
  setOrderItems(prev => prev.filter((_, i) => i !== index));
```

### 2. Trash button (line 821)

**Before:**
```js
onClick={() => updateQuantity(index, 0)}
```
**After:**
```js
onClick={() => removeItem(index)}
```

### 3. `updateQuantity` — auto-remove when result is invalid

```js
const updateQuantity = (index, quantity) => {
  const item = orderItems[index];
  if (quantity <= 0 && !(item.weight && item.weight.trim())) {
    removeItem(index);
  } else {
    setOrderItems(orderItems.map((it, i) =>
      i === index ? { ...it, quantity, weight: quantity > 0 ? '' : it.weight } : it
    ));
  }
};
```

Covers: minus button, direct input of 0 or negative, decrement to 0.

### 4. `updateItemField` — remove when weight cleared and qty is also 0

Add this guard at the top of the weight branch:
```js
if (field === 'weight' && !value?.trim() && updated.quantity <= 0) {
  removeItem(index);
  return;
}
```

Ensures: clearing the weight field on a weight-based item (qty=0) removes the item rather than leaving it invalid.

### 5. Draft load — filter invalid items from localStorage

```js
if (draft.orderItems?.length > 0) {
  const valid = draft.orderItems.filter(
    item => item.quantity > 0 || (item.weight && item.weight.trim())
  );
  if (valid.length > 0) setOrderItems(valid);
}
```

### 6. Auto-save — no change

The auto-save effect writes `orderItems` as-is. Since the mutation fixes above ensure only valid items reach state, the persisted data is always clean.

### 7. New action — `clearItems()`

Removes all order items and clears localStorage immediately:

```js
const clearItems = () => {
  setOrderItems([]);
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
};
```

Button: **"נקה פריטים"** — placed in the order-items card header, next to the item count. Styled as a secondary destructive button (red outline or gray).

### 8. New action — `clearOrder()`

Resets the form to a fully clean state: items, selected customer, customer search text, notes, and delivery date (reset to tomorrow). Clears localStorage:

```js
const clearOrder = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  setOrderItems([]);
  setSelectedCustomer('');
  setCustomerSearch('');
  setNotes('');
  setDeliveryDate(tomorrow.toISOString().split('T')[0]);
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
};
```

Button: **"נקה הזמנה"** — placed in the submit card, alongside the submit button. Styled as secondary destructive.

---

## Submission validation — no changes

`validateForm()` and the submit button `disabled` condition already use the same validity predicate. Once invalid items can no longer enter state, these checks will always pass naturally. No edits needed.

---

## Out of scope

- `cloneOrder` and `loadOrderForEdit` produce weight-based items with `quantity: 0` intentionally. These are valid under the rule and require no changes.
- No changes to `orderUtils.js`, Supabase queries, or warehouse page.
- No UI refactoring beyond the two new buttons.
