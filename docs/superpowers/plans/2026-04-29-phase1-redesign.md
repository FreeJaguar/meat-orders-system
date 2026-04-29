# Phase 1 UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the field agent order form into a split-panel layout with a warm operational visual system, extracting 4 pure presentational components, without changing any business logic or Supabase queries.

**Architecture:** All state (23 `useState` vars), all `useEffect` hooks, and all Supabase functions remain unchanged in `page.js`. Only the render section is restructured. Four presentational components are extracted from inline JSX. Styling is applied alongside each extraction — one commit per task so each change is verifiable before the next begins.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4 (arbitrary value syntax for CSS tokens), Hebrew RTL (`dir="rtl"`), no test suite — manual browser verification for each task.

---

## File Map

| File | Change type |
|------|-------------|
| `src/app/globals.css` | Modified — add 14 warm color tokens to `:root` |
| `src/components/layout/SplitLayout.jsx` | Created |
| `src/components/agent/StatusBadge.jsx` | Created |
| `src/components/agent/ProductCard.jsx` | Created |
| `src/components/agent/OrderItemRow.jsx` | Created |
| `src/app/page.js` | Modified — full render restructure + imports + styling |

No other files touched.

---

## Task 1: Add Color Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace `:root` block in `src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;

  --color-bg:              #F2EDE8;
  --color-surface:         #FFFFFF;
  --color-surface-alt:     #FAF7F3;

  --color-border:          #DDD5CB;
  --color-border-strong:   #C4B9AE;

  --color-text:            #1C1917;
  --color-text-secondary:  #6B6058;
  --color-text-muted:      #9C8F84;

  --color-accent:          #7B5E3A;
  --color-accent-light:    #EDE4D8;

  --color-success:         #3D7A52;
  --color-danger:          #A63D3D;
  --color-warning:         #8B6914;
  --color-info:            #2D5A8E;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

html,
body {
  overscroll-behavior: none;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3000. Page should look identical to before — tokens are defined but unused.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add warm color tokens to globals.css"
```

---

## Task 2: SplitLayout + render restructure

**Files:**
- Create: `src/components/layout/SplitLayout.jsx`
- Modify: `src/app/page.js`

- [ ] **Step 1: Create `src/components/layout/SplitLayout.jsx`**

```jsx
export default function SplitLayout({ leftPanel, rightPanel }) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
      <div className="h-[55vh] md:h-full md:w-[58%] overflow-y-auto border-b border-[var(--color-border)] md:border-b-0 md:border-l bg-[var(--color-surface)]">
        {leftPanel}
      </div>
      <div className="h-[45vh] md:h-full md:w-[42%] overflow-hidden flex flex-col bg-[var(--color-surface-alt)]">
        {rightPanel}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add import to `src/app/page.js`**

After the existing imports, add:

```js
import SplitLayout from '@/components/layout/SplitLayout';
```

- [ ] **Step 3: Replace the auth loading guard (around line 527)**

Replace:
```jsx
if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

With:
```jsx
if (authLoading) {
  return (
    <div className="h-dvh flex items-center justify-center bg-[var(--color-bg)]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-accent)]"></div>
    </div>
  );
}
```

- [ ] **Step 4: Replace the entire main `return (...)` block (lines 536–1022)**

The complete new render return:

```jsx
return (
  <div className="h-dvh overflow-hidden flex flex-col bg-[var(--color-bg)]">

    {/* ── Header ── */}
    <div className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">
          🥩 מערכת הזמנות בשר
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[var(--color-text-secondary)]">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-[var(--color-danger)] hover:underline font-medium"
          >
            התנתק
          </button>
        </div>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        <button
          onClick={() => setShowOrdersList(!showOrdersList)}
          className="bg-[var(--color-accent)] text-white px-4 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-opacity"
        >
          📋 הזמנות קיימות
        </button>
        <button
          onClick={() => window.open('/warehouse', '_blank')}
          className="border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-4 py-1.5 rounded text-sm font-medium hover:bg-[var(--color-accent-light)] transition-colors"
        >
          🏭 דשבורד מחסן
        </button>
        {editingOrder && (
          <button
            onClick={cancelEdit}
            className="border border-[var(--color-danger)] text-[var(--color-danger)] px-4 py-1.5 rounded text-sm font-medium hover:bg-[#F8EAEA] transition-colors"
          >
            ❌ בטל עריכה
          </button>
        )}
      </div>
    </div>

    {/* ── Feedback message ── */}
    {message && (
      <div className={`flex-shrink-0 px-6 py-2.5 text-sm font-medium border-b ${
        message.includes('🎉') || message.includes('✅') || message.includes('בהצלחה')
          ? 'bg-[#E8F4EC] text-[#3D7A52] border-[#3D7A52]'
          : message.includes('📝') || message.includes('📋')
          ? 'bg-[#EAF0F8] text-[#2D5A8E] border-[#2D5A8E]'
          : 'bg-[#F8EAEA] text-[#A63D3D] border-[#A63D3D]'
      }`}>
        {message}
      </div>
    )}

    {/* ── Orders list panel (collapsible) ── */}
    {showOrdersList && (
      <div className="flex-shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 max-h-72 overflow-y-auto">
        <h3 className="font-semibold text-[var(--color-text)] mb-3">הזמנות קיימות לעריכה</h3>
        <div className="space-y-2">
          {allOrders.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-4">אין הזמנות להצגה</p>
          ) : (
            allOrders.map(order => (
              <div key={order.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-accent-light)] transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[var(--color-text)]">#{order.order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'חדשה'   ? 'bg-blue-100 text-blue-800' :
                      order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'נשלחה'  ? 'bg-purple-100 text-purple-800' :
                      order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                                                   'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    <strong>{order.customers?.name}</strong> |{' '}
                    {new Date(order.delivery_date).toLocaleDateString('he-IL')} |{' '}
                    {order.order_items?.length || 0} פריטים
                  </p>
                </div>
                <button
                  onClick={() => loadOrderForEdit(order)}
                  disabled={order.status !== 'חדשה'}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    order.status === 'חדשה'
                      ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {order.status === 'חדשה' ? '✏️ ערוך' : '🔒 במחסן'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    )}

    {/* ── Split layout ── */}
    <form onSubmit={editingOrder ? updateOrder : submitOrder} className="flex-1 overflow-hidden flex flex-col">
      <SplitLayout
        leftPanel={
          <div className="p-4 space-y-4">

            {/* Customer selection */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="font-semibold text-[var(--color-text)] mb-3">🏪 בחירת לקוח</h3>
              <div className="space-y-3">
                <div className="relative customer-dropdown">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="חפש לקוח..."
                    className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)] placeholder-[var(--color-text-muted)]"
                  />
                  {showCustomerDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border-strong)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {customers
                        .filter(c =>
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          (c.code && c.code.toLowerCase().includes(customerSearch.toLowerCase()))
                        )
                        .map(customer => (
                          <div
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer.id);
                              setCustomerSearch(`${customer.name}${customer.code ? ` (${customer.code})` : ''}`);
                              setShowCustomerDropdown(false);
                            }}
                            className="p-3 hover:bg-[var(--color-accent-light)] cursor-pointer border-b border-[var(--color-border)] last:border-b-0"
                          >
                            <span className="text-[var(--color-text)]">
                              {customer.name}{customer.code ? ` (${customer.code})` : ''}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                  className="border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-3 py-1.5 rounded text-sm font-medium hover:bg-[var(--color-accent-light)] transition-colors"
                >
                  ➕ הוסף לקוח חדש
                </button>
              </div>

              {showAddCustomer && (
                <div className="mt-4 p-3 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
                  <h4 className="font-semibold text-[var(--color-text)] mb-3 text-sm">הוספת לקוח חדש</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="שם הלקוח *" value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      className="border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" required />
                    <input type="text" placeholder="קוד לקוח (אופציונלי)" value={newCustomer.code}
                      onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})}
                      className="border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                    <input type="text" placeholder="טלפון" value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      className="border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                    <input type="text" placeholder="כתובת" value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                      className="border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={addNewCustomer}
                      className="bg-[var(--color-accent)] text-white px-4 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-opacity">
                      💾 שמור לקוח
                    </button>
                    <button type="button" onClick={() => setShowAddCustomer(false)}
                      className="border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-4 py-1.5 rounded text-sm font-medium hover:bg-[var(--color-accent-light)] transition-colors">
                      ביטול
                    </button>
                  </div>
                </div>
              )}

              {selectedCustomer && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowCustomerHistory(!showCustomerHistory)}
                    className="flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:opacity-80"
                  >
                    <span>{showCustomerHistory ? '▲' : '▼'}</span>
                    <span>
                      {loadingHistory
                        ? 'טוען היסטוריה...'
                        : `היסטוריית הזמנות (${customerOrders.length})`}
                    </span>
                  </button>

                  {showCustomerHistory && customerOrders.length > 0 && (
                    <div className="mt-2 border border-[var(--color-border)] rounded-lg overflow-hidden">
                      <div className="bg-[var(--color-surface-alt)] px-4 py-2 border-b border-[var(--color-border)]">
                        <p className="text-xs text-[var(--color-text-muted)]">
                          20 הזמנות אחרונות — לחץ &quot;שכפל&quot; לטעון פריטים לטופס
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-[var(--color-border)]">
                        {customerOrders.map(order => (
                          <div key={order.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--color-accent-light)]">
                            <div className="flex-1 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--color-text)]">#{order.order_number}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  order.status === 'חדשה'   ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                                                               'bg-gray-100 text-gray-800'
                                }`}>{order.status}</span>
                              </div>
                              <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                                אספקה: {new Date(order.delivery_date).toLocaleDateString('he-IL')} |{' '}
                                {order.order_items?.length || 0} פריטים
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => cloneOrder(order)}
                              className="mr-2 bg-[var(--color-accent)] text-white px-3 py-1 rounded text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                              📋 שכפל
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showCustomerHistory && customerOrders.length === 0 && !loadingHistory && (
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">אין היסטוריית הזמנות ללקוח זה</p>
                  )}
                </div>
              )}
            </div>

            {/* Delivery date */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="font-semibold text-[var(--color-text)] mb-3">📅 תאריך אספקה</h3>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]"
                required
              />
            </div>

            {/* Product catalog */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="font-semibold text-[var(--color-text)] mb-3">🔍 חיפוש וסינון מוצרים</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 text-[var(--color-text-muted)]" size={18} />
                  <input
                    type="text"
                    placeholder="חפש מוצר לפי שם..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 pr-10 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)] placeholder-[var(--color-text-muted)]"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]"
                >
                  <option value="">כל הקטגוריות</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <div key={product.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-accent-light)] transition-colors">
                    <div className="flex-1">
                      <span className="font-medium text-[var(--color-text)]">{product.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-2 py-0.5 rounded text-xs font-medium">{product.category}</span>
                        <span className="text-[var(--color-text-secondary)] text-xs">{product.unit || 'יחידה'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      className="bg-[var(--color-accent)] text-white px-3 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      ⚙️ הגדר כמות
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* General notes */}
            <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
              <h3 className="font-semibold text-[var(--color-text)] mb-3">📝 הערות נוספות</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות כלליות להזמנה..."
                className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)] placeholder-[var(--color-text-muted)] resize-none"
                rows="3"
              />
            </div>

          </div>
        }
        rightPanel={
          <div className="h-full flex flex-col">

            {/* Order items header */}
            <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b border-[var(--color-border)]">
              <h3 className="font-semibold text-[var(--color-text)] text-sm">
                🛒 פריטי ההזמנה ({orderItems.length})
              </h3>
              {orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearItems}
                  className="text-xs text-[var(--color-danger)] border border-[var(--color-danger)] px-2.5 py-1 rounded hover:bg-[#F8EAEA] transition-colors"
                >
                  נקה פריטים
                </button>
              )}
            </div>

            {/* Scrollable order items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {orderItems.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[var(--color-text-muted)] text-sm text-center">
                    אין פריטים בהזמנה
                    <br />
                    <span className="text-xs">בחר מוצרים מהקטלוג</span>
                  </p>
                </div>
              ) : (
                orderItems.map((item, index) => (
                  <div key={item.product_id} className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-[var(--color-text)] text-sm">{item.product_name}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">{item.category}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-[var(--color-danger)] hover:opacity-70 mr-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">כמות</label>
                        <div className="flex items-center gap-1">
                          <button type="button"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="w-6 h-6 bg-[var(--color-danger)] text-white rounded-full hover:opacity-80 flex items-center justify-center flex-shrink-0">
                            <Minus size={10} />
                          </button>
                          <input type="number" value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 0)}
                            className="w-10 text-center border border-[var(--color-border)] rounded px-1 py-0.5 text-sm text-[var(--color-text)] bg-[var(--color-surface)] font-medium"
                            min="0" />
                          <button type="button"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="w-6 h-6 bg-[var(--color-success)] text-white rounded-full hover:opacity-80 flex items-center justify-center flex-shrink-0">
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">משקל</label>
                        <input type="text" value={item.weight || ''}
                          onChange={(e) => updateItemField(index, 'weight', e.target.value)}
                          placeholder='ק"ג'
                          className="w-full border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">הערות</label>
                        <input type="text" value={item.notes || ''}
                          onChange={(e) => updateItemField(index, 'notes', e.target.value)}
                          placeholder="הערות..."
                          className="w-full border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Fixed footer */}
            <div className="flex-shrink-0 border-t border-[var(--color-border-strong)] bg-[var(--color-surface-alt)] p-4 space-y-2">
              <button
                type="submit"
                disabled={
                  loading || !selectedCustomer || orderItems.length === 0 ||
                  orderItems.some(item => item.quantity <= 0 && (!item.weight || !item.weight.trim()))
                }
                className="w-full bg-[var(--color-accent)] text-white py-3 rounded-lg font-bold text-base hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity min-h-[48px]"
              >
                {loading ? '⏳ מעדכן...' : editingOrder ? '💾 עדכן הזמנה' : '🚀 שליחת הזמנה'}
              </button>
              <button
                type="button"
                onClick={clearOrder}
                className="w-full border border-[var(--color-danger)] text-[var(--color-danger)] py-2 rounded-lg font-medium hover:bg-[#F8EAEA] transition-colors text-sm"
              >
                🗑️ נקה הזמנה
              </button>
            </div>

          </div>
        }
      />
    </form>

    {/* ── Product quantity modal ── */}
    {showProductModal && selectedProduct && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-[var(--color-surface)] rounded-lg max-w-md w-full border border-[var(--color-border-strong)]">
          <div className="p-5 border-b border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">
              הגדרת כמות — {selectedProduct.name}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">כמות</label>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => {
                    const q = Math.max(0, tempProduct.quantity - 1);
                    setTempProduct({ ...tempProduct, quantity: q, weight: q > 0 ? '' : tempProduct.weight });
                  }}
                  className="w-8 h-8 bg-[var(--color-danger)] text-white rounded-full hover:opacity-80 flex items-center justify-center font-bold">-</button>
                <input type="number" value={tempProduct.quantity}
                  onChange={(e) => {
                    const q = parseInt(e.target.value) || 0;
                    setTempProduct({ ...tempProduct, quantity: q, weight: q > 0 ? '' : tempProduct.weight });
                  }}
                  className="w-20 text-center border border-[var(--color-border)] rounded px-2 py-1.5 text-[var(--color-text)] bg-[var(--color-surface)] font-medium"
                  min="0" />
                <button type="button"
                  onClick={() => setTempProduct({ ...tempProduct, quantity: tempProduct.quantity + 1, weight: '' })}
                  className="w-8 h-8 bg-[var(--color-success)] text-white rounded-full hover:opacity-80 flex items-center justify-center font-bold">+</button>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {selectedProduct.unit === 'ק"ג' ? 'קר׳' : selectedProduct.unit}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">משקל</label>
              <input type="text" value={tempProduct.weight}
                onChange={(e) => setTempProduct({
                  ...tempProduct,
                  weight: e.target.value,
                  quantity: e.target.value && e.target.value.trim() ? 0 : tempProduct.quantity
                })}
                placeholder='כמה ק"ג?'
                className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">הערות</label>
              <input type="text" value={tempProduct.notes}
                onChange={(e) => setTempProduct({ ...tempProduct, notes: e.target.value })}
                placeholder="הערות למוצר..."
                className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:border-[var(--color-accent)] focus:outline-none text-[var(--color-text)] bg-[var(--color-surface)]" />
            </div>
          </div>
          <div className="p-5 border-t border-[var(--color-border)] flex gap-3">
            <button onClick={confirmAddProduct}
              className="bg-[var(--color-accent)] text-white px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity font-bold flex-1">
              ✅ הוסף להזמנה
            </button>
            <button onClick={() => setShowProductModal(false)}
              className="border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-6 py-2.5 rounded-lg hover:bg-[var(--color-accent-light)] transition-colors font-medium">
              ❌ ביטול
            </button>
          </div>
        </div>
      </div>
    )}

  </div>
);
```

- [ ] **Step 5: Verify layout in browser — landscape**

1. Open http://localhost:3000 at full window width (≥ 768px)
2. Check: page fills viewport height (no page-level scrollbar)
3. Check: left panel (catalog side) occupies ~58% width on the right side of screen
4. Check: right panel (order side) occupies ~42% on the left side of screen, showing empty state message
5. Check: scrolling inside the left panel works (add many products in search → catalog scrolls independently)
6. Check: header, feedback zone, and orders list toggle appear above the split
7. Check: warm off-white background (#F2EDE8) visible around panels

- [ ] **Step 6: Verify layout in browser — portrait**

Resize window to < 768px width.
1. Check: catalog panel on top (~55vh)
2. Check: order panel below (~45vh)
3. Check: horizontal divider visible between panels

- [ ] **Step 7: Verify core functionality**

1. Select a customer from dropdown → history button appears
2. Open product modal → set quantity → confirm → item appears in right panel
3. Adjust quantity with +/− in order panel
4. Submit button disabled when no customer or no items
5. Click "נקה הזמנה" → form resets

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/SplitLayout.jsx src/app/page.js
git commit -m "feat: split-panel layout with warm visual system"
```

---

## Task 3: Extract StatusBadge

**Files:**
- Create: `src/components/agent/StatusBadge.jsx`
- Modify: `src/app/page.js`

- [ ] **Step 1: Create `src/components/agent/StatusBadge.jsx`**

```jsx
const STATUS_STYLES = {
  'חדשה':   { bg: '#EAF0F8', text: '#2D5A8E' },
  'בטיפול': { bg: '#FDF3DC', text: '#8B6914' },
  'הודפס':  { bg: '#EFEFEF', text: '#5A5A5A' },
  'נשלחה':  { bg: '#F0EAF8', text: '#6B3FAB' },
  'הושלמה': { bg: '#E8F4EC', text: '#3D7A52' },
  'בוטלה':  { bg: '#F8EAEA', text: '#A63D3D' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#EFEFEF', text: '#5A5A5A' };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Add import to `src/app/page.js`**

```js
import StatusBadge from '@/components/agent/StatusBadge';
```

- [ ] **Step 3: Replace inline status ternary in orders list panel**

In the orders list panel (inside the `allOrders.map(order => ...)` block), find:
```jsx
<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
  order.status === 'חדשה'   ? 'bg-blue-100 text-blue-800' :
  order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
  order.status === 'נשלחה'  ? 'bg-purple-100 text-purple-800' :
  order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                               'bg-red-100 text-red-800'
}`}>
  {order.status}
</span>
```

Replace with:
```jsx
<StatusBadge status={order.status} />
```

- [ ] **Step 4: Replace inline status ternary in customer history panel**

In the customer history panel (inside `customerOrders.map(order => ...)`), find:
```jsx
<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
  order.status === 'חדשה'   ? 'bg-blue-100 text-blue-800' :
  order.status === 'בטיפול' ? 'bg-yellow-100 text-yellow-800' :
  order.status === 'הושלמה' ? 'bg-green-100 text-green-800' :
                               'bg-gray-100 text-gray-800'
}`}>{order.status}</span>
```

Replace with:
```jsx
<StatusBadge status={order.status} />
```

- [ ] **Step 5: Verify in browser**

1. Click "הזמנות קיימות" → orders list opens → status badges use warm muted colors
2. Select a customer with order history → click history toggle → status badges in history use same warm colors
3. Each status color matches the spec table: חדשה=blue, בטיפול=yellow, הושלמה=green, בוטלה=red, נשלחה=purple, הודפס=gray

- [ ] **Step 6: Commit**

```bash
git add src/components/agent/StatusBadge.jsx src/app/page.js
git commit -m "feat: extract StatusBadge with warm status colors"
```

---

## Task 4: Extract ProductCard

**Files:**
- Create: `src/components/agent/ProductCard.jsx`
- Modify: `src/app/page.js`

- [ ] **Step 1: Create `src/components/agent/ProductCard.jsx`**

```jsx
export default function ProductCard({ product, onAdd, isInOrder }) {
  return (
    <div
      className="flex justify-between items-center p-3 rounded-lg border transition-colors"
      style={isInOrder ? {
        backgroundColor: 'var(--color-accent-light)',
        borderColor: 'var(--color-accent)',
        borderRightWidth: '3px',
      } : {
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex-1">
        <span
          className="font-medium text-[var(--color-text)]"
          style={isInOrder ? { fontWeight: 600 } : undefined}
        >
          {product.name}
        </span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-2 py-0.5 rounded text-xs font-medium">
            {product.category}
          </span>
          <span className="text-[var(--color-text-secondary)] text-xs">{product.unit || 'יחידה'}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAdd(product)}
        className="px-3 py-1.5 rounded text-sm font-medium transition-opacity"
        style={isInOrder ? {
          border: '1px solid var(--color-accent)',
          color: 'var(--color-accent)',
          backgroundColor: 'transparent',
        } : {
          backgroundColor: 'var(--color-accent)',
          color: '#FFFFFF',
        }}
      >
        {isInOrder ? 'עדכן' : 'הוסף'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add import to `src/app/page.js`**

```js
import ProductCard from '@/components/agent/ProductCard';
```

- [ ] **Step 3: Replace inline catalog map in `src/app/page.js`**

Find the `filteredProducts.map(...)` block inside the catalog section:
```jsx
<div className="space-y-2">
  {filteredProducts.map(product => (
    <div key={product.id} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-accent-light)] transition-colors">
      <div className="flex-1">
        <span className="font-medium text-[var(--color-text)]">{product.name}</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-2 py-0.5 rounded text-xs font-medium">{product.category}</span>
          <span className="text-[var(--color-text-secondary)] text-xs">{product.unit || 'יחידה'}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => addProduct(product)}
        className="bg-[var(--color-accent)] text-white px-3 py-1.5 rounded text-sm font-medium hover:opacity-90 transition-opacity"
      >
        ⚙️ הגדר כמות
      </button>
    </div>
  ))}
</div>
```

Replace with:
```jsx
<div className="space-y-2">
  {filteredProducts.map(product => (
    <ProductCard
      key={product.id}
      product={product}
      onAdd={addProduct}
      isInOrder={orderItems.some(item => item.product_id === product.id)}
    />
  ))}
</div>
```

- [ ] **Step 4: Verify in browser**

1. Catalog shows product cards with accent-colored "הוסף" button
2. Add a product to order via modal → product card changes: background warms to `#EDE4D8`, 3px left border appears, button changes to "עדכן" in outline style
3. Click "עדכן" on an in-order item → modal opens with product (same as adding fresh)
4. The in-order state is immediately obvious — not subtle

- [ ] **Step 5: Commit**

```bash
git add src/components/agent/ProductCard.jsx src/app/page.js
git commit -m "feat: extract ProductCard with in-order visual state"
```

---

## Task 5: Extract OrderItemRow

**Files:**
- Create: `src/components/agent/OrderItemRow.jsx`
- Modify: `src/app/page.js`

- [ ] **Step 1: Create `src/components/agent/OrderItemRow.jsx`**

```jsx
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
```

- [ ] **Step 2: Add import to `src/app/page.js`**

```js
import OrderItemRow from '@/components/agent/OrderItemRow';
```

- [ ] **Step 3: Remove `Trash2`, `Plus`, `Minus` from lucide import in `src/app/page.js`**

These icons are now only used inside `OrderItemRow`. Change:
```js
import { Search, Plus, Minus, Trash2 } from 'lucide-react';
```
to:
```js
import { Search } from 'lucide-react';
```

- [ ] **Step 4: Replace inline order items map in `src/app/page.js`**

Find the `orderItems.map((item, index) => (...))` block inside the scrollable order items div and replace:

```jsx
{orderItems.map((item, index) => (
  <div key={item.product_id} className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
    ...{/* entire inline block */}
  </div>
))}
```

With:

```jsx
{orderItems.map((item, index) => (
  <OrderItemRow
    key={item.product_id}
    item={item}
    index={index}
    onRemove={removeItem}
    onQuantityChange={updateQuantity}
    onFieldChange={updateItemField}
  />
))}
```

- [ ] **Step 5: Verify in browser**

1. Add 2–3 items to order → each renders correctly with product name, category, quantity controls, weight, notes
2. Tap − button until quantity reaches 0 on a unit-only item → item disappears (auto-remove)
3. Type weight value → quantity clears to 0
4. Clear weight field on a weight-only item (qty=0) → item disappears
5. Click trash icon → item removed immediately
6. Add 8+ items → right panel scrolls, footer (submit + clear) stays visible at all times
7. Reduce to 0 items → empty state message appears

- [ ] **Step 6: Commit**

```bash
git add src/components/agent/OrderItemRow.jsx src/app/page.js
git commit -m "feat: extract OrderItemRow, verify sticky footer"
```

---

## Task 6: Emoji removal + feedback color fix

**Files:**
- Modify: `src/app/page.js`

This is a text-only pass. No logic changes except the feedback message color detection (replacing emoji checks with Hebrew keyword checks, as required because emoji are being removed from the message strings).

- [ ] **Step 1: Update message strings in business logic functions**

Apply these exact string replacements:

| Location | Old string | New string |
|----------|-----------|-----------|
| `addNewCustomer` (missing name) | `'❌ יש למלא את שם הלקוח'` | `'יש למלא את שם הלקוח'` |
| `addNewCustomer` (success) | `` `✅ לקוח ${data.name} נוסף בהצלחה ונבחר!` `` | `` `לקוח ${data.name} נוסף בהצלחה ונבחר!` `` |
| `addNewCustomer` (error) | `'❌ שגיאה בהוספת הלקוח'` | `'שגיאה בהוספת הלקוח'` |
| `cloneOrder` | `` `📋 פריטים הועתקו מהזמנה ${order.order_number} — עדכן ובדוק לפני שליחה` `` | `` `פריטים הועתקו מהזמנה ${order.order_number} — עדכן ובדוק לפני שליחה` `` |
| `loadOrderForEdit` (blocked) | `'❌ לא ניתן לערוך הזמנה שכבר בטיפול במחסן'` | `'לא ניתן לערוך הזמנה שכבר בטיפול במחסן'` |
| `loadOrderForEdit` (editing) | `` `📝 עורך הזמנה ${order.order_number} (סטטוס: ${order.status})` `` | `` `עורך הזמנה ${order.order_number} (סטטוס: ${order.status})` `` |
| `validateForm` (missing fields) | `'❌ יש למלא את כל השדות הנדרשים'` | `'יש למלא את כל השדות הנדרשים'` |
| `validateForm` (invalid items) | `'❌ כל פריט חייב לכלול כמות או משקל'` | `'כל פריט חייב לכלול כמות או משקל'` |
| `submitOrder` (success) | `` `🎉 הזמנה ${orderNumber} נשלחה בהצלחה למחסן!` `` | `` `הזמנה ${orderNumber} נשלחה בהצלחה למחסן!` `` |
| `submitOrder` (error) | `'❌ שגיאה בשליחת ההזמנה'` | `'שגיאה בשליחת ההזמנה'` |
| `updateOrder` (success) | `` `✅ הזמנה ${editingOrder.order_number} עודכנה בהצלחה!` `` | `` `הזמנה ${editingOrder.order_number} עודכנה בהצלחה!` `` |
| `updateOrder` (error) | `'❌ שגיאה בעדכון ההזמנה'` | `'שגיאה בעדכון ההזמנה'` |

- [ ] **Step 2: Update the feedback message color detection logic**

Find the feedback message block (which currently checks for emoji):
```jsx
message.includes('🎉') || message.includes('✅') || message.includes('בהצלחה')
  ? 'bg-[#E8F4EC] text-[#3D7A52] border-[#3D7A52]'
  : message.includes('📝') || message.includes('📋')
  ? 'bg-[#EAF0F8] text-[#2D5A8E] border-[#2D5A8E]'
  : 'bg-[#F8EAEA] text-[#A63D3D] border-[#A63D3D]'
```

Replace with Hebrew keyword detection:
```jsx
message.includes('בהצלחה') || message.includes('נשלחה') || message.includes('עודכנה') || message.includes('נוסף')
  ? 'bg-[#E8F4EC] text-[#3D7A52] border-[#3D7A52]'
  : message.includes('עורך') || message.includes('הועתקו') || message.includes('פריטים')
  ? 'bg-[#EAF0F8] text-[#2D5A8E] border-[#2D5A8E]'
  : 'bg-[#F8EAEA] text-[#A63D3D] border-[#A63D3D]'
```

- [ ] **Step 3: Strip remaining emoji from static UI text**

Apply these string replacements in the JSX:

| Old | New |
|-----|-----|
| `🥩 מערכת הזמנות בשר` | `מערכת הזמנות בשר` |
| `📋 הזמנות קיימות` | `הזמנות קיימות` |
| `🏭 דשבורד מחסן` | `דשבורד מחסן` |
| `❌ בטל עריכה` | `בטל עריכה` |
| `🏪 בחירת לקוח` | `בחירת לקוח` |
| `➕ הוסף לקוח חדש` | `הוסף לקוח חדש` |
| `💾 שמור לקוח` | `שמור לקוח` |
| `📋 שכפל` | `שכפל` |
| `📅 תאריך אספקה` | `תאריך אספקה` |
| `🔍 חיפוש וסינון מוצרים` | `חיפוש וסינון מוצרים` |
| `🛒 פריטי ההזמנה` | `פריטי ההזמנה` |
| `⏳ מעדכן...` | `מעדכן...` |
| `💾 עדכן הזמנה` | `עדכן הזמנה` |
| `🚀 שליחת הזמנה` | `שליחת הזמנה` |
| `🗑️ נקה הזמנה` | `נקה הזמנה` |
| `📝 הערות נוספות` | `הערות נוספות` |
| `✏️ ערוך` | `ערוך` |
| `🔒 במחסן` | `במחסן` |
| `✅ הוסף להזמנה` | `הוסף להזמנה` |
| `❌ ביטול` | `ביטול` |

- [ ] **Step 4: Verify all feedback message types in browser**

1. Submit a valid order → success banner appears in green (#E8F4EC / #3D7A52)
2. Select a customer with history → clone an order → info banner appears in blue (#EAF0F8 / #2D5A8E)
3. Click edit on an order in "בטיפול" status → error banner appears in red (#F8EAEA / #A63D3D)
4. Try submitting with no customer → error banner appears in red
5. Confirm no emoji appear anywhere in the UI

- [ ] **Step 5: Full Phase 1 verification checklist**

Run through each item before committing:

- [ ] Add a product to the order via catalog
- [ ] Open product modal, set quantity and weight, confirm
- [ ] Edit quantity with −/+ buttons and direct input
- [ ] Set weight on an item (quantity clears automatically)
- [ ] Delete an item with the trash button
- [ ] Decrease quantity to 0 on a unit-only item → item auto-removed
- [ ] Clear all items with "נקה פריטים"
- [ ] Clear entire order with "נקה הזמנה" → customer, date, notes, items all reset
- [ ] Select a customer → view history → clone a past order
- [ ] Submit a new order → success message → form resets
- [ ] Edit an existing order (חדשה status only) → update → success message
- [ ] Refresh page → draft restored from localStorage
- [ ] Submit button disabled when no customer or no items
- [ ] Split layout renders correctly in landscape (side-by-side)
- [ ] Split layout renders correctly in portrait (top/bottom)
- [ ] Order panel footer always visible with 8+ items

- [ ] **Step 6: Commit**

```bash
git add src/app/page.js
git commit -m "style: remove emoji, fix feedback color detection to use Hebrew keywords"
```
