# Phase 1 Redesign — Design Spec
**Date:** 2026-04-29
**Branch:** redesign-ui
**Scope:** Field agent order form (`src/app/page.js`) — Phase 1 only

---

## Context

The meat-orders-system is a Hebrew RTL order management platform used by field sales agents (tablet-primary) and warehouse staff. This spec covers Phase 1 of a two-phase redesign.

**Phase 1 goal:** Restructure the field agent form into a split-panel layout and apply a warm operational visual system — without touching any business logic, Supabase queries, state management, or localStorage behavior.

**Phase 2 (out of scope here):** Warehouse dashboard redesign + state extraction into custom hooks.

---

## Hard Constraints (Non-Negotiable)

- No changes to Supabase queries, table names, column names, or query structure
- No changes to localStorage key (`meat_order_draft`) or draft structure
- No changes to validation logic (`validateForm`, `buildItemsPayload`)
- No changes to order payload shape sent to Supabase
- No business logic rewrites — existing functions are moved or called, never rewritten
- `page.js` remains the single source of all state and Supabase interaction for Phase 1
- No schema or RLS changes

---

## Visual System

### Color Tokens

Defined as CSS custom properties in `src/app/globals.css`. Used via Tailwind's arbitrary value syntax `[var(--token)]` or `[#hex]`. No new CSS library or dependency.

```css
:root {
  --color-bg:              #F2EDE8;   /* warm off-white page background */
  --color-surface:         #FFFFFF;   /* cards, panels */
  --color-surface-alt:     #FAF7F3;   /* subtle alternate surface (e.g. sidebar) */

  --color-border:          #DDD5CB;   /* default dividers and panel edges */
  --color-border-strong:   #C4B9AE;   /* emphasized separators */

  --color-text:            #1C1917;   /* primary body text */
  --color-text-secondary:  #6B6058;   /* labels, captions */
  --color-text-muted:      #9C8F84;   /* placeholders, hints */

  --color-accent:          #7B5E3A;   /* warm brown — primary action color */
  --color-accent-light:    #EDE4D8;   /* hover, active surfaces */

  --color-success:         #3D7A52;
  --color-danger:          #A63D3D;
  --color-warning:         #8B6914;
  --color-info:            #2D5A8E;
}
```

### Status Badge Colors

Replaces the current bright Tailwind presets (`bg-blue-100 text-blue-800` etc.) with muted warm equivalents:

| Status | Background | Text |
|--------|-----------|------|
| חדשה | `#EAF0F8` | `#2D5A8E` |
| בטיפול | `#FDF3DC` | `#8B6914` |
| הודפס | `#EFEFEF` | `#5A5A5A` |
| נשלחה | `#F0EAF8` | `#6B3FAB` |
| הושלמה | `#E8F4EC` | `#3D7A52` |
| בוטלה | `#F8EAEA` | `#A63D3D` |

### Typography Rules

- Font: Inter (already loaded — no change)
- No emoji in section headers, buttons, or feedback messages
- Replace all emoji labels with concise Hebrew text
- Weight hierarchy: `400` body → `500` labels → `600` headings → `700` primary actions
- Label text-transform: none (no uppercase)

### Primary Action Contrast

The submit button must have strong visual contrast and be immediately noticeable:
- Background: `var(--color-accent)` (`#7B5E3A`)
- Text: `#FFFFFF`
- Font weight: `700`
- Minimum height: `48px`
- Never use ghost/outline style for the primary submit action

---

## Layout Structure

### SplitLayout Component

**File:** `src/components/layout/SplitLayout.jsx`

A single CSS layout wrapper. No internal state, no logic. Props: `leftPanel`, `rightPanel` (React nodes).

**Landscape (≥ 768px width):**
```
┌────────────────────────────┬──────────────────────┐
│       LEFT PANEL            │    RIGHT PANEL        │
│       (catalog side)        │    (order side)       │
│       58% width             │    42% width          │
│       full height           │    full height        │
│       overflow-y: auto      │    overflow-y: hidden  │
│                             │    (right panel uses   │
│                             │     internal flex      │
│                             │     column with fixed  │
│                             │     footer)            │
└────────────────────────────┴──────────────────────┘
```

**Portrait (< 768px width):**
```
┌─────────────────────────────────────┐
│            TOP PANEL                │
│            (catalog side)           │
│            55vh height              │
│            overflow-y: auto         │
├─────────────────────────────────────┤
│          BOTTOM PANEL               │
│          (order side)               │
│          45vh height                │
│          overflow-y: hidden         │
│          (internal flex column)     │
└─────────────────────────────────────┘
```

**Order panel internal structure (right/bottom panel):**
The order panel must be a flex column where:
- The order items list is `flex-1 overflow-y: auto` (scrollable)
- The footer (submit button, total count, clear order) is `flex-shrink: 0` (always visible, never scrolls out)

This ensures the submit button and order summary are always on screen regardless of how many items are in the order.

**Phone fallback (< 480px width):**
Single column. Order panel appears below catalog. No split. Basic scrolling layout. This is a fallback — not the primary design target.

**Layout fills viewport:** The outer container is `height: 100dvh` (or `100vh` fallback) with `overflow: hidden` on the root. Each panel handles its own scroll.

---

## Component Hierarchy — Phase 1

Only **pure presentational components** are extracted. All state, effects, and Supabase logic remain in `page.js`.

### New Components

#### 1. `SplitLayout` — `src/components/layout/SplitLayout.jsx`
- Props: `leftPanel: ReactNode`, `rightPanel: ReactNode`
- Responsibility: Responsive two-panel container
- No state, no logic, no Supabase

#### 2. `StatusBadge` — `src/components/agent/StatusBadge.jsx`
- Props: `status: string`
- Responsibility: Renders a colored pill for a Hebrew order status string
- Returns a `<span>` with hardcoded warm color map
- Replaces inline ternary chains in: existing orders list, customer history panel
- No state, no logic

#### 3. `ProductCard` — `src/components/agent/ProductCard.jsx`
- Props: `product: object`, `onAdd: function`, `isInOrder: boolean`
- Responsibility: Single row in the product catalog grid
- Displays: product name, category badge, unit
- Shows a visual indicator if the product is already in the current order (`isInOrder`)
- Calls `onAdd(product)` when the action button is clicked
- No state, no logic

#### 4. `OrderItemRow` — `src/components/agent/OrderItemRow.jsx`
- Props: `item: object`, `index: number`, `onRemove: function`, `onQuantityChange: function`, `onFieldChange: function`
- Responsibility: Single editable row in the active order
- Displays: product name, category, quantity controls (−/input/+), weight field, notes field, delete button
- All handlers (`onRemove`, `onQuantityChange`, `onFieldChange`) are passed from `page.js` — the functions `removeItem`, `updateQuantity`, `updateItemField` are unchanged
- No state, no logic

---

### Feedback Message Color Logic — Emoji Coupling Fix

The current `page.js` render uses emoji as status detectors for the feedback message color:
```js
message.includes('🎉') || message.includes('✅') || message.includes('בהצלחה') → green
message.includes('📝') || message.includes('📋')                                → blue (info)
else                                                                              → red
```

When emoji are removed from message strings in Step 6, the `🎉` and `📝/📋` checks break. This is a render-layer change, not business logic. The fix: replace emoji matching with Hebrew keyword matching.

Updated logic for Step 6:
```js
message.includes('בהצלחה') || message.includes('נשלחה') || message.includes('עודכנה') || message.includes('נוסף')  → green
message.includes('עורך') || message.includes('הועתקו') || message.includes('פריטים')                               → blue (info)
else                                                                                                                  → red
```

**What does NOT change:** The `setMessage(...)` calls inside `submitOrder`, `updateOrder`, `addNewCustomer`, `cloneOrder`, `loadOrderForEdit` — those strings are updated only in the Step 6 final pass when emoji are stripped from all static and dynamic UI text. The logic change is limited to the conditional in the render section.

### What Is NOT Extracted in Phase 1

| Component | Reason deferred |
|-----------|----------------|
| CustomerPanel | Contains dropdown open/close state, click-outside effect — Phase 2 |
| ProductModal | Contains `tempProduct` state — Phase 2 |
| AddCustomerForm | Contains `newCustomer` form state — Phase 2 |
| Any custom hooks | Phase 2: state extraction only after UI structure is stable |

---

## `page.js` Changes — Phase 1

### What Changes

1. **Imports:** Add `SplitLayout`, `StatusBadge`, `ProductCard`, `OrderItemRow`
2. **Render root:** Wrap existing JSX in `<SplitLayout leftPanel={...} rightPanel={...} />`
3. **Catalog section:** Replace `filteredProducts.map(...)` inline block with `<ProductCard ... />` per product
4. **Order items section:** Replace `orderItems.map(...)` inline block with `<OrderItemRow ... />` per item
5. **Status badges:** Replace all inline status ternary chains with `<StatusBadge status={...} />`
6. **Color tokens:** Apply warm color tokens throughout, replacing Tailwind preset color classes
7. **Emoji removal:** Strip emoji from all headings, buttons, and message strings; replace with concise Hebrew text
8. **Order panel footer:** Ensure submit button and clear/count controls are inside a sticky/fixed footer within the right panel

### What Does NOT Change

- Every `useState` declaration (all 23 variables)
- Every `useEffect` (all 5 hooks)
- Every Supabase function: `loadCustomers`, `loadProducts`, `loadAllOrders`, `loadCustomerOrders`, `addNewCustomer`, `submitOrder`, `updateOrder`
- Every order action: `validateForm`, `buildItemsPayload`, `cloneOrder`, `loadOrderForEdit`, `cancelEdit`
- Every item action: `removeItem`, `updateQuantity`, `updateItemField`, `clearItems`, `clearOrder`
- `DRAFT_KEY`, `draftRestoredRef`, all localStorage logic
- Auth check (`supabase.auth.getSession`) and redirect
- `handleSignOut`
- `filteredProducts` and `categories` derived data computation

---

## Incremental Styling Approach

Styling changes are applied **alongside each component extraction**, not all at once. Order:

1. **Step 1:** Add color tokens to `globals.css` (no visual change yet — tokens unused)
2. **Step 2:** Create `SplitLayout` + apply warm background/border tokens to the layout shell → first visible change
3. **Step 3:** Extract `StatusBadge` + apply warm status colors → existing orders list and history panel update
4. **Step 4:** Extract `ProductCard` + apply warm catalog card styling
5. **Step 5:** Extract `OrderItemRow` + apply warm item row styling + enforce sticky footer in order panel
6. **Step 6:** Final pass — apply warm tokens to remaining inline sections (customer selector, delivery date, notes, header, feedback messages); remove all remaining emoji

Each step is a separate commit. Each step is visually verifiable in the browser before proceeding.

---

## Verification Checklist — Phase 1 Complete

After all steps, the following behaviors must work identically to the pre-Phase-1 state:

- [ ] Add a product to the order via catalog
- [ ] Open product modal, set quantity and weight, confirm
- [ ] Edit quantity with −/+ buttons and direct input
- [ ] Set weight on an item (quantity clears automatically)
- [ ] Delete an item with the trash/remove button
- [ ] Decrease quantity to 0 on a unit-only item → item auto-removed
- [ ] Clear all items with "Clear Items" button
- [ ] Clear entire order with "Clear Order" button (resets customer, date, notes)
- [ ] Select a customer from dropdown search
- [ ] View customer order history and clone a past order
- [ ] Submit a new order → success message → form resets
- [ ] Edit an existing order (חדשה status only)
- [ ] Refresh page → draft restored from localStorage
- [ ] Submit button disabled when no customer or no items
- [ ] Split layout renders correctly in landscape (side-by-side)
- [ ] Split layout renders correctly in portrait (top/bottom)
- [ ] Order panel footer (submit button + clear) always visible regardless of item count

---

## Files Changed in Phase 1

| File | Change type |
|------|-------------|
| `src/app/globals.css` | Modified — add color tokens |
| `src/app/page.js` | Modified — layout wrapper + component imports + styling |
| `src/components/layout/SplitLayout.jsx` | Created |
| `src/components/agent/StatusBadge.jsx` | Created |
| `src/components/agent/ProductCard.jsx` | Created |
| `src/components/agent/OrderItemRow.jsx` | Created |

Total: 2 modified, 4 created. No files deleted. No other files touched.

---

## Out of Scope for Phase 1

- Warehouse dashboard (`src/app/warehouse/page.js`) — Phase 2
- Custom hooks (`useOrderForm`, `useSupabaseData`) — Phase 2
- `CustomerPanel` component — Phase 2
- `ProductModal` component — Phase 2
- `AddCustomerForm` component — Phase 2
- TypeScript migration — not planned
- Authentication improvements — not planned
- Pagination — not planned
- Any Supabase schema changes — explicitly prohibited
