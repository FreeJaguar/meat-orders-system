# Order Item Validity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all broken order-item behaviors — trash icon, quantity zero, localStorage corruption, and add two clear buttons — so `orderItems` state always contains only valid items.

**Architecture:** Surgical fixes at each mutation site in `src/app/page.js`. A new `removeItem(index)` helper is the single deletion primitive; every path that can invalidate an item calls it. localStorage is filtered defensively on load; the auto-save is unchanged because clean state in → clean state out.

**Tech Stack:** React 18 (useState, useEffect, useRef), Next.js 14 App Router, localStorage, Tailwind CSS.

> **Note:** This codebase has no automated test suite. Each task includes a manual browser verification step instead of a unit test run.

---

## File Map

| File | Change |
|------|--------|
| `src/app/page.js` | All changes — see tasks below |

---

### Task 1: Add `removeItem` helper and fix the trash button

**Files:**
- Modify: `src/app/page.js:342-347` (add helper before `updateQuantity`), `src/app/page.js:821` (trash onClick)

- [ ] **Step 1: Add `removeItem` helper**

  In `src/app/page.js`, find the comment `// ─── Inline quantity / field updates` (line ~342). Add the helper **before** the `updateQuantity` function:

  ```js
  // ─── Inline quantity / field updates ─────────────────────────────────────
  const removeItem = (index) =>
    setOrderItems(prev => prev.filter((_, i) => i !== index));

  const updateQuantity = (index, quantity) => {
  ```

- [ ] **Step 2: Fix the trash button**

  Find the trash `<button>` in the order-items list JSX (~line 821). Change its `onClick`:

  ```jsx
  <button
    type="button"
    onClick={() => removeItem(index)}
    className="text-red-500 hover:text-red-700 font-medium"
  >
    <Trash2 size={18} />
  </button>
  ```

- [ ] **Step 3: Verify in browser**

  Start the dev server (`npm run dev`). Add two products to the order. Click the trash icon on one. Verify:
  - The item disappears immediately from the list.
  - The item count in the card header decrements.
  - The removed item does NOT reappear on page refresh.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/page.js
  git commit -m "fix: trash icon now removes item instead of zeroing quantity"
  ```

---

### Task 2: Fix `updateQuantity` to auto-remove invalid items

**Files:**
- Modify: `src/app/page.js:343-347` (replace `updateQuantity` body)

- [ ] **Step 1: Replace `updateQuantity`**

  Replace the existing `updateQuantity` function (~lines 343–347) with:

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

- [ ] **Step 2: Verify in browser — unit-only item**

  Add a product with quantity 2, no weight. Click the minus button twice. Verify:
  - At quantity 1, item stays.
  - At quantity 0 (second minus click), item is removed from the list.

- [ ] **Step 3: Verify in browser — weight-based item**

  Add a product. In the weight field enter `2.5` (quantity auto-zeros). Click the minus button on quantity. Verify:
  - Item stays in the list (it has a weight, so it is valid despite qty = 0).

- [ ] **Step 4: Verify in browser — direct input**

  Add a product with quantity 3. Clear the quantity input and type `0`. Verify item is removed.

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/page.js
  git commit -m "fix: decrementing or typing quantity to 0 removes item when no weight set"
  ```

---

### Task 3: Fix `updateItemField` — remove item when weight is cleared on a weight-only item

**Files:**
- Modify: `src/app/page.js:349-357` (replace `updateItemField` body)

- [ ] **Step 1: Replace `updateItemField`**

  Replace the existing `updateItemField` function (~lines 349–357) with:

  ```js
  const updateItemField = (index, field, value) => {
    const item = orderItems[index];
    if (field === 'weight' && !(value && value.trim()) && item.quantity <= 0) {
      removeItem(index);
      return;
    }
    setOrderItems(orderItems.map((it, i) => {
      if (i !== index) return it;
      const updated = { ...it, [field]: value };
      if (field === 'weight' && value && value.trim()) updated.quantity = 0;
      if (field === 'quantity' && value > 0)           updated.weight = '';
      return updated;
    }));
  };
  ```

  **Why `item.quantity` not `updated.quantity`:** `updated` is local to the map callback and doesn't exist at the guard point. We read the current item's quantity directly from `orderItems[index]`.

- [ ] **Step 2: Verify in browser — weight cleared on weight-based item**

  Add a product. Enter `2.5` in the weight field (quantity becomes 0). Then clear the weight field entirely. Verify:
  - Item is removed from the list immediately.

- [ ] **Step 3: Verify — weight cleared on item that still has quantity**

  Add a product with quantity 2. Enter `1.5` in the weight field (quantity becomes 0). Now type `2` in the quantity field (weight clears). Then clear the weight field again. At this point quantity is 2 so the item should stay. Verify:
  - Item remains in the list.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/page.js
  git commit -m "fix: clearing weight on a zero-quantity item removes the item"
  ```

---

### Task 4: Filter invalid items from localStorage on draft restore

**Files:**
- Modify: `src/app/page.js:85-86` (replace single-line draft restore with filtered version)

- [ ] **Step 1: Replace the draft restore line**

  Find this line in the mount `useEffect` (~line 85–86):

  ```js
  if (draft.orderItems?.length > 0) setOrderItems(draft.orderItems);
  ```

  Replace with:

  ```js
  if (draft.orderItems?.length > 0) {
    const valid = draft.orderItems.filter(
      item => item.quantity > 0 || (item.weight && item.weight.trim())
    );
    if (valid.length > 0) setOrderItems(valid);
  }
  ```

- [ ] **Step 2: Verify in browser — corrupt localStorage is ignored**

  Open DevTools → Application → Local Storage. Find the `meat_order_draft` key. Manually edit the `orderItems` array to add an entry like:

  ```json
  {"product_id":"fake","product_name":"Bad Item","quantity":0,"weight":"","notes":"","category":"test","unit":"יחידה"}
  ```

  Save and refresh the page. Verify:
  - The "Bad Item" does NOT appear in the order list.
  - Any valid items (qty > 0 or weight set) do appear.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/page.js
  git commit -m "fix: filter invalid items from localStorage on draft restore"
  ```

---

### Task 5: Add `clearItems` and `clearOrder` functions and buttons

**Files:**
- Modify: `src/app/page.js:460-468` (add two functions after `cancelEdit`)
- Modify: `src/app/page.js:808-811` (order-items card header — wrap h3 + add button)
- Modify: `src/app/page.js:881-893` (submit card — add clear order button)

- [ ] **Step 1: Add `clearItems` and `clearOrder` after `cancelEdit`**

  Find `cancelEdit` (~line 460). After its closing brace, add:

  ```js
  const clearItems = () => {
    setOrderItems([]);
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

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

- [ ] **Step 2: Add "נקה פריטים" button to the order-items card header**

  Find this JSX (~line 810):

  ```jsx
  <h3 className="font-bold text-gray-800 mb-4 text-lg">🛒 פריטי ההזמנה ({orderItems.length})</h3>
  ```

  Replace with:

  ```jsx
  <div className="flex justify-between items-center mb-4">
    <h3 className="font-bold text-gray-800 text-lg">🛒 פריטי ההזמנה ({orderItems.length})</h3>
    <button
      type="button"
      onClick={clearItems}
      className="text-sm text-red-500 hover:text-red-700 font-medium border border-red-300 hover:border-red-500 px-3 py-1 rounded transition-colors"
    >
      נקה פריטים
    </button>
  </div>
  ```

- [ ] **Step 3: Add "נקה הזמנה" button to the submit card**

  Find the submit card (~line 881). The current content is a single `<button type="submit">`. Wrap both buttons in a flex column:

  ```jsx
  <div className="bg-white p-6 rounded-lg shadow-lg border">
    <div className="flex flex-col gap-3">
      <button
        type="submit"
        disabled={
          loading || !selectedCustomer || orderItems.length === 0 ||
          orderItems.some(item => item.quantity <= 0 && (!item.weight || !item.weight.trim()))
        }
        className="w-full bg-green-500 text-white py-4 rounded-lg text-xl font-bold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '⏳ מעדכן...' : editingOrder ? '💾 עדכן הזמנה' : '🚀 שליחת הזמנה'}
      </button>
      <button
        type="button"
        onClick={clearOrder}
        className="w-full border-2 border-red-400 text-red-600 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors"
      >
        🗑️ נקה הזמנה
      </button>
    </div>
  </div>
  ```

- [ ] **Step 4: Verify "נקה פריטים" in browser**

  Add 3 products to the order. Click "נקה פריטים". Verify:
  - All items are removed immediately.
  - The order-items card disappears (it only renders when `orderItems.length > 0`).
  - Refresh the page — items do not reappear (localStorage was cleared).
  - Customer, notes, and delivery date are unchanged.

- [ ] **Step 5: Verify "נקה הזמנה" in browser**

  Select a customer, add products, write a note, set a delivery date. Click "🗑️ נקה הזמנה". Verify:
  - All items are removed.
  - Customer search field is empty.
  - Notes field is empty.
  - Delivery date resets to tomorrow.
  - Refresh the page — nothing is restored from localStorage.

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/page.js
  git commit -m "feat: add clear-items and clear-order buttons with localStorage cleanup"
  ```

---

## Done

All five tasks complete. The system now enforces: items with `quantity <= 0` and no weight can never exist in state, in localStorage, or in the UI.
