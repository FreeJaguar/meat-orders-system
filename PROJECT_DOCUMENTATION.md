# Meat Orders System — Technical Documentation

**Version:** 0.1.0  
**Last Updated:** 2026-04-23  
**Prepared By:** Engineering Team  
**Language:** Hebrew UI (RTL) / English Documentation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Folder Structure](#4-folder-structure)
5. [Entry Points](#5-entry-points)
6. [Core Logic](#6-core-logic)
7. [Dependencies Between Components](#7-dependencies-between-components)
8. [Current Status](#8-current-status)
9. [Known Issues & Risks](#9-known-issues--risks)
10. [How to Run the Project](#10-how-to-run-the-project)
11. [Recommended Next Steps](#11-recommended-next-steps)

---

## 1. System Overview

### What the System Does

**Meat Orders System** (מערכת הזמנות בשר) is a digital order management platform for a meat distribution business. It provides two distinct interfaces:

1. **Field Agent Interface** (`/`) — A mobile-friendly order form where sales agents create and manage customer orders in real time. Agents select a customer, choose products (with flexible quantity or weight-based entry), set a delivery date, and submit orders directly to the database.

2. **Warehouse Dashboard** (`/warehouse`) — A real-time operations dashboard for warehouse staff. It displays all incoming orders, allows staff to transition orders through a fulfillment workflow (New → In Progress → Sent → Completed), print physical picking lists, and export data to CSV/Excel.

### Who the Target Users Are

| Role | Interface | Responsibility |
|---|---|---|
| Field Sales Agent | `/` (main page) | Creates and edits customer orders from the field |
| Warehouse Staff | `/warehouse` | Processes, fulfills, prints, and tracks orders |

There is currently **no authentication layer** — any user who has the URL can access either interface.

### What Problem It Solves

Before this system, orders were likely communicated by phone, WhatsApp, or paper forms — a process prone to errors, loss of information, and no audit trail. This system provides:

- A single source of truth for all orders
- Real-time visibility for warehouse staff when new orders arrive
- Structured order data with customer details, product lines, quantities, and delivery dates
- A printable picking list for warehouse fulfillment
- A CSV export for reporting or importing into accounting software

---

## 2. Architecture

### Overall Structure

This is a **single-tier web application** with no custom backend server. All business logic runs in the browser (client-side React), and data persistence is entirely delegated to **Supabase** (a managed PostgreSQL + REST + real-time service).

```
┌────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                                                                  │
│   ┌────────────────────┐      ┌──────────────────────────────┐  │
│   │  Field Agent Page  │      │   Warehouse Dashboard Page   │  │
│   │  src/app/page.js   │      │  src/app/warehouse/page.js   │  │
│   │                    │      │                              │  │
│   │  - Customer select │      │  - Order list + filtering    │  │
│   │  - Product select  │      │  - Status transitions        │  │
│   │  - Order create    │      │  - Print picking list        │  │
│   │  - Order edit      │      │  - CSV export                │  │
│   └────────┬───────────┘      └──────────────┬───────────────┘  │
│            │   @supabase/supabase-js           │                  │
└────────────┼──────────────────────────────────┼──────────────────┘
             │                                  │
             ▼                                  ▼
┌────────────────────────────────────────────────────────────────┐
│                      Supabase (Cloud)                           │
│                                                                  │
│  ┌─────────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL DB  │  │  PostgREST API │  │  Realtime WS    │  │
│  │                  │  │  (REST CRUD)   │  │  (Subscriptions)│  │
│  │  - customers     │  │                │  │                 │  │
│  │  - products      │  │  Auto-generated│  │  orders table   │  │
│  │  - orders        │  │  from schema   │  │  changes        │  │
│  │  - order_items   │  │                │  │                 │  │
│  └─────────────────┘  └────────────────┘  └─────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### How Data Flows Through the System

**Creating an Order (Field Agent):**

1. Page mounts → `loadCustomers()` and `loadProducts()` query Supabase.
2. Agent selects a customer from a filtered dropdown.
3. Agent opens a product modal, enters quantity or weight and optional notes, confirms.
4. The product is added to the local `orderItems` array in React state.
5. Agent clicks "שליחת הזמנה" → client-side validation runs.
6. A row is `INSERT`ed into `orders` with status `חדשה`.
7. For each item in `orderItems`, a row is `INSERT`ed into `order_items`, with notes serialized as `"משקל: {weight} | {notes}"`.
8. The form resets; the agent sees a success message.

**Processing an Order (Warehouse):**

1. Warehouse page mounts → `loadOrders()` fetches all orders joined with customers and order_items + products.
2. A Supabase real-time subscription is established on the `orders` table.
3. When a new order arrives (INSERT event), the warehouse staff sees a visual + audio notification.
4. Staff clicks into an order, views items grouped by category, clicks "התחל טיפול".
5. `updateOrderStatus()` runs an `UPDATE` on Supabase.
6. Staff can print — `printOrder()` opens a new browser window with HTML-rendered picking list and updates status to `הודפס`.
7. Staff continues through the workflow until the order is `הושלמה` or `בוטלה`.

**Real-time Flow:**

```
Field Agent submits order
        │
        ▼
Supabase INSERT (orders table)
        │
        ▼
Supabase Realtime broadcasts change to all subscribers
        │
        ▼
Warehouse page WebSocket receives payload
        │
        ├── showNotification() → visual toast + browser Notification API
        ├── playNotificationSound() → Web Audio API oscillator
        └── loadOrders() → full data reload from Supabase
```

### Main Components and How They Interact

The application has **no shared state between pages**. Each page is completely self-contained and communicates with Supabase independently. The warehouse page observes the `orders` table via a Supabase real-time channel; it does not call or import anything from the main page.

---

## 3. Tech Stack

| Layer | Technology | Version | Reason |
|---|---|---|---|
| Framework | Next.js | 15.3.5 | App Router, SSR/CSR flexibility, Vercel deployment target |
| UI Library | React | 19.0.0 | Component model, hooks-based state management |
| Language | JavaScript (JSX) | ES2017+ | Project was bootstrapped with JS; TS config exists but is unused |
| Styling | Tailwind CSS | 4.x | Utility-first, rapid prototyping, RTL support via `space-x-reverse` |
| Icons | Lucide React | 0.525.0 | Clean SVG icons, tree-shakeable |
| Backend/DB | Supabase | 2.50.4 | Serverless PostgreSQL with auto-generated REST API and real-time subscriptions; eliminates need for a custom Node.js backend |
| Build Tool | Turbopack (via Next.js) | bundled | Faster HMR and dev builds than Webpack |
| Linting | ESLint + Next.js config | 9.x | Code quality enforcement |
| Deployment | Not yet configured | — | Vercel is the natural target for Next.js |

### Notable Observations About Tech Choices

- **TypeScript is installed but not used.** `tsconfig.json` exists with strict mode enabled and `@types/*` packages are in `devDependencies`, but all source files are `.js`/`.jsx`, not `.ts`/`.tsx`. This means none of the type safety benefits are realized.
- **No state management library** (Redux, Zustand, Jotai) was chosen. This is appropriate for the current scale — two self-contained pages with no shared state. It would become a problem if pages needed to share data without a full reload.
- **Supabase anon key is used on the client.** This is the intended pattern for Supabase. Row-Level Security (RLS) in the database is the security enforcement layer, not the application code. RLS configuration is **not visible in this codebase** — it must be verified in the Supabase console.

---

## 4. Folder Structure

```
meat-orders-system/
│
├── .claude/
│   └── settings.local.json          # Claude Code CLI permissions (git commands)
│
├── .env.local                        # Supabase URL + anon key (not committed to git)
│
├── .gitignore                        # Standard Next.js gitignore
│
├── public/                           # Static file serving (currently unused SVGs)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── src/
│   └── app/                          # Next.js App Router root
│       │
│       ├── layout.js                 # Root HTML shell: lang="he", dir="rtl", Inter font
│       ├── page.js                   # [PRIMARY] Field agent order form (~700+ lines)
│       ├── globals.css               # Tailwind base directives + global resets
│       ├── favicon.ico               # Browser tab icon
│       │
│       ├── debug/
│       │   └── page.js               # Diagnostic page: shows env vars + connection status
│       │
│       ├── test/
│       │   └── page.js               # Manual DB test: verifies customer + product counts
│       │
│       └── warehouse/
│           └── page.js               # [PRIMARY] Warehouse operations dashboard (~600+ lines)
│
├── next.config.ts                    # Next.js config (empty, all defaults)
├── tsconfig.json                     # TypeScript config (strict, path alias @/*)
├── postcss.config.mjs                # PostCSS config for Tailwind v4
├── eslint.config.mjs                 # ESLint with Next.js rules
├── package.json                      # Dependencies + npm scripts
└── package-lock.json                 # Locked dependency tree
```

### Important Directories

| Path | Purpose |
|---|---|
| `src/app/` | All application pages live here. Next.js App Router uses directory-based routing. |
| `src/app/warehouse/` | Dedicated route for warehouse staff (`/warehouse` URL). |
| `src/app/debug/` | Internal diagnostic route (`/debug`). Should be removed or protected before production. |
| `src/app/test/` | Internal test route (`/test`). Should be removed or protected before production. |

---

## 5. Entry Points

### `src/app/layout.js` — Root Layout

This is the **outermost HTML wrapper** rendered for every page. It:

- Sets `<html lang="he" dir="rtl">` — critical for correct Hebrew text rendering and RTL layout behavior in the browser.
- Loads the **Inter** font from Google Fonts with `display: 'swap'`.
- Exports metadata: `title: "מערכת הזמנות בשר"`, `description: "מערכת הזמנות דיגיטלית לסוכן שטח"`.
- Renders a `<body>` with the Inter font class, then `{children}` (the page content).

No navigation bar, header, or shared UI exists at this level. Each page is fully standalone.

### `src/app/page.js` — Field Agent Order Form

**Route:** `/`

This is the main page of the application. On mount it:

1. Calls `loadCustomers()` — fetches all rows from `customers`, ordered by `name`.
2. Calls `loadProducts()` — fetches all rows from `products` where `is_active = true`, ordered by `category` then `name`.
3. Calls `loadAllOrders()` — fetches all orders with joined customer data and all order items with product data, for the "existing orders" panel.
4. Registers a `document` click listener to close the customer dropdown when clicking outside.

The component renders a full-page gradient background with a centered card containing the order form.

### `src/app/warehouse/page.js` — Warehouse Dashboard

**Route:** `/warehouse`

On mount it:

1. Calls `loadOrders()` — fetches all orders with full nested data, ordered by `created_at` descending.
2. Calls `setupRealtimeSubscription()` — opens a Supabase WebSocket channel (`orders-changes`) that listens for all changes (`INSERT`, `UPDATE`, `DELETE`) on the `orders` table. The cleanup function returned by `useEffect` calls `supabase.removeChannel(channel)` on unmount.
3. Requests browser notification permission via `Notification.requestPermission()`.

The component renders an order management dashboard with filter tabs and an order card grid.

---

## 6. Core Logic

### State Management

All state is managed with React's `useState` hook, local to each page component. There is no global store. The state in `page.js` (field agent) includes approximately **16 separate `useState` declarations**, covering:

- Data state: `customers`, `products`, `orderItems`, `allOrders`
- Selection state: `selectedCustomer`, `selectedProduct`, `selectedCategory`
- UI state: `showProductModal`, `showCustomerDropdown`, `showOrdersList`, `showAddCustomer`
- Form state: `deliveryDate`, `notes`, `tempProduct`, `newCustomer`, `customerSearch`, `searchTerm`
- Feedback state: `loading`, `message`
- Edit state: `editingOrder`

This is a lot of state for one component. As the application grows, this will become increasingly difficult to maintain.

### Item Notes Serialization (Critical Pattern)

The `order_items.notes` column stores a **compound string** that encodes both the weight and freeform notes for an item:

```
Format: "משקל: {weight} | {notes}"
Examples:
  "משקל: 2.5 | אנא לחתוך דק"   → weight="2.5", notes="אנא לחתוך דק"
  "משקל: 3 | "                  → weight="3", notes=""
  " | ללא עצמות"                → weight="", notes="ללא עצמות"
```

This is a **design risk**: structured data is being packed into an unstructured text field. Parsing is done by `parseItemNotes()`, which exists as a **duplicate local function** in both `page.js` and `warehouse/page.js`. Any change to the format must be updated in both places.

```javascript
// Defined twice — once in each page file
function parseItemNotes(raw) {
  if (!raw) return { weight: '', notes: '' };
  const parts = raw.split(' | ');
  const weightPart = parts[0] || '';
  const notesPart = parts.slice(1).join(' | ');
  const weight = weightPart.replace('משקל: ', '').trim();
  return { weight, notes: notesPart };
}
```

### Quantity vs. Weight Mutual Exclusivity

A product line item can be ordered either by **discrete quantity** (e.g., 3 units) or by **weight** (e.g., 2.5 kg), but not both simultaneously. This is enforced in `updateItemField()`:

```javascript
// Setting weight clears quantity; setting quantity clears weight
if (field === 'weight') {
  updatedItems[index].quantity = 0;
} else if (field === 'quantity' && value > 0) {
  updatedItems[index].weight = '';
}
```

However, when writing to the database, the system always stores `quantity: item.quantity || 1` — meaning weight-based items are stored with `quantity = 1`. The actual ordered amount is only preserved in the serialized `notes` field. This is a **data integrity issue**.

### Order Status Workflow

```
חדשה (New)
  │
  ├─[התחל טיפול]──→ בטיפול (In Progress)
  │                        │
  │                        ├─[סמן כנשלחה]──→ נשלחה (Sent)
  │                        │                       │
  │                        │                       └─[סמן כהושלמה]──→ הושלמה (Completed)
  │                        │
  │                        └─[בטל הזמנה]──→ בוטלה (Cancelled)
  │
  └─[בטל הזמנה]──→ בוטלה (Cancelled)
```

Status transitions are enforced only by which buttons are shown in the UI — there is **no server-side validation** of valid transitions.

### Print Logic

`printOrder()` in `warehouse/page.js`:

1. Opens a `window.open('', '_blank')` popup window.
2. Calls `generatePrintHTML(order)` to produce a self-contained HTML string.
3. `document.write()`s the HTML into the new window.
4. Calls `window.print()` on the popup.
5. Updates the order status to `הודפס` via `updateOrderStatus()`.

The print HTML groups items by product category in a two-column layout, renders customer info, delivery date, and order-level notes. It includes embedded `<style>` with `@media print` rules.

### API Communication

All database operations use the `@supabase/supabase-js` client. The client is initialized inline at the top of each page file:

```javascript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

This means a new Supabase client instance is created **on every render** because it is declared at the module level outside the component — this is actually fine as React module code runs once. The client is used for:

- `SELECT` with nested joins via PostgREST's embedded resource syntax
- `INSERT` with `.select().single()` for retrieving inserted rows
- `UPDATE` with `.eq()` filters
- `DELETE` with `.eq()` filters
- Real-time channel subscriptions

---

## 7. Dependencies Between Components

```
src/app/layout.js
    └── Wraps all pages (provides HTML, lang, dir, font)

src/app/page.js (Field Agent)
    ├── Reads: customers, products tables
    ├── Writes: orders, order_items tables
    └── No dependency on warehouse page

src/app/warehouse/page.js (Warehouse)
    ├── Reads: orders, order_items, products, customers tables
    ├── Writes: orders table (status updates)
    ├── Subscribes to: orders table (real-time)
    └── No dependency on main page

src/app/test/page.js
    └── Reads: customers, products (diagnostic only)

src/app/debug/page.js
    └── Reads: process.env values (diagnostic only)
```

**There is zero code sharing between page files.** The `parseItemNotes` function is copy-pasted. The Supabase client is instantiated separately in each file. No shared utilities, no shared hooks, no shared types exist. This is workable at the current scale but would compound maintenance costs as the codebase grows.

---

## 8. Current Status

### Fully Implemented

- Customer listing and search/filter
- Adding new customers inline (name, code, phone, address, contact person)
- Product listing with category filter and name search
- Product quantity or weight entry via modal
- Order creation with full validation
- Order editing (limited to `חדשה` status orders)
- Order status workflow in warehouse dashboard
- Real-time order notifications (visual + audio + browser Notification API)
- Print picking list with category grouping
- CSV export of filtered orders
- Hebrew RTL UI throughout
- Status-based color coding
- Order details modal in warehouse

### Partially Implemented

- **Order editing:** Only orders with status `חדשה` can be edited. Orders in `בטיפול` or later states cannot be modified at all — there is no interface for warehouse corrections or amendments.
- **CSV export:** Exports all currently filtered orders, but there is no date range filter or selective export. The entire visible set is always exported.
- **Customer management:** Customers can be created but not edited or deleted from within the application.
- **Product management:** Products cannot be added, edited, or deactivated from within the application. The `is_active` flag and product data must be managed directly in the Supabase console.

### TODOs, Placeholders, or Missing Parts

- No authentication or user identification. Any user with the URL has full access to all data.
- No user is recorded as the "creator" of an order — there is no `agent_id` or `created_by` field on the `orders` table.
- No admin interface for managing customers, products, or categories.
- `README.md` is the default Next.js template README — it contains no project-specific information.
- `public/` directory contains only the default Next.js placeholder SVGs — no actual assets.
- `next.config.ts` is completely empty (just `export default {}`).
- The `/debug` and `/test` routes are development tools that are exposed in production without any access control.
- No `404` or error page customization.
- No loading skeleton UI — loading state is managed with a boolean but rendered inconsistently.

---

## 9. Known Issues & Risks

### Critical

**1. No Authentication**
Any person with the URL can view all customer data, all orders, and transition any order to any status. If the URL becomes known outside the organization, the entire system is exposed with no access control.

**2. No Row-Level Security (RLS) Verification**
The Supabase anon key is shipped to the browser. Security depends entirely on RLS policies configured in Supabase. If RLS is disabled (which is the default for new tables), any client can read and write all data without restriction. This **cannot be verified from the codebase** — the Supabase project must be audited directly.

**3. Quantity Field Misrepresents Weight Orders**
When a user enters an order by weight (e.g., 2.5 kg), the `order_items.quantity` column is set to `1` (fallback). The actual weight is only stored in the serialized `notes` string. Querying total quantities or volumes from the database directly is therefore unreliable for weight-based items.

**4. Duplicate `parseItemNotes` Function**
The notes parsing logic exists in two separate files. If the serialization format changes (e.g., separator changes from ` | ` to `;`), it must be updated in both places. A mismatch would cause data display corruption without any runtime error.

### High Severity

**5. No Server-Side Order Validation**
All validation (customer selected, item quantity > 0) is done purely on the client. A malformed request directly to the Supabase API (e.g., via `curl`) could insert invalid orders — e.g., orders with no items, negative quantities, or missing customer references.

**6. Document-level Click Listener for Dropdown**
The customer dropdown is closed by listening to `document.addEventListener('click', ...)` and checking if the click target is inside `.customer-dropdown`. This class selector is fragile — if the class name is ever changed in JSX, the click-outside behavior breaks silently.

**7. print via `document.write()`**
Using `document.write()` on a new window is a deprecated pattern that some browsers may restrict or handle inconsistently. The print window content is also built via string interpolation, which could fail to render correctly if customer names or product names contain characters that break HTML (e.g., `<`, `>`, `&`). There is **no HTML escaping** of user-supplied data in `generatePrintHTML()`. This is an XSS vulnerability in the print window context.

**8. No Optimistic Locking / Concurrent Edit Protection**
Two agents could load the same order for editing simultaneously, submit changes, and one set of changes would silently overwrite the other. There is no `updated_at` check, no locking, and no conflict detection.

### Medium Severity

**9. All Orders Loaded Without Pagination**
`loadOrders()` and `loadAllOrders()` fetch all rows without `LIMIT` or pagination. As the order history grows, this will result in increasingly large payloads, slower load times, and higher Supabase bandwidth usage.

**10. Supabase Client Instantiated in Module Scope**
```javascript
// At the top of page.js and warehouse/page.js — outside the component
const supabase = createClient(...);
```
This works correctly for client-side rendering but is not the recommended pattern for Next.js, which can run code on the server. If any page is ever switched to SSR or SSG, this could expose the anon key on the server or cause hydration issues. The recommended pattern is to create the client in a shared utility file with a singleton guard.

**11. Real-time Subscription Always Open**
The warehouse page opens a Supabase WebSocket subscription on mount. If the page is left open indefinitely (common for warehouse terminals), the subscription stays open permanently. Supabase has connection limits; this should be tested under concurrent warehouse users.

**12. `deliveryDate` Default Uses JavaScript `Date` Without Timezone Handling**
```javascript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
```
This uses the browser's local timezone. If the server (Supabase) or export process interprets dates in UTC, dates near midnight could be off by one day depending on the user's timezone. This is especially relevant for users in non-UTC+0 timezones — which includes Israel (UTC+2/+3).

### Low Severity / Technical Debt

**13. ~700-Line Monolithic Page Components**
Both `page.js` and `warehouse/page.js` are large single-component files with all state, all handlers, and all JSX in one place. There is no component decomposition (no `<OrderCard>`, `<ProductModal>`, `<CustomerDropdown>` components). This makes the files hard to read, test, and modify safely.

**14. Generic Error Handling**
All `try-catch` blocks do `console.log(error)` and set a vague user message like `"שגיאה בשמירת ההזמנה"`. There is no error reporting to an external service (e.g., Sentry), no distinction between network errors and validation errors, and no retry logic.

**15. `/debug` and `/test` Pages in Production**
These pages expose internal configuration (Supabase URL, anon key visibility) and database counts. They should be removed or protected with an environment check before production deployment.

---

## 10. How to Run the Project

### Prerequisites

- **Node.js** v18 or later (v20 recommended)
- **npm** v9 or later
- A **Supabase project** with the required tables created (see schema below)

### Step 1 — Clone the Repository

```bash
git clone <repository-url>
cd meat-orders-system
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Retrieve these values from: **Supabase Dashboard → Project Settings → API**.

### Step 4 — Set Up the Database

In your Supabase SQL editor, run the following to create the required tables:

```sql
-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  phone TEXT,
  address TEXT,
  contact_person TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'ק"ג',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  delivery_date DATE,
  status TEXT DEFAULT 'חדשה',
  notes TEXT,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Important:** Enable Row-Level Security (RLS) on all tables and configure appropriate policies to prevent unauthorized access.

### Step 5 — Run in Development Mode

```bash
npm run dev
```

The application will start at `http://localhost:3000`.

- Field agent interface: `http://localhost:3000/`
- Warehouse dashboard: `http://localhost:3000/warehouse`
- Debug info: `http://localhost:3000/debug`
- DB connection test: `http://localhost:3000/test`

### Step 6 — Build for Production

```bash
npm run build
npm start
```

### Deploying to Vercel (Recommended)

1. Push the repository to GitHub.
2. Create a new Vercel project linked to the repository.
3. In Vercel project settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Vercel will run `npm run build` automatically.

---

## 11. Recommended Next Steps

Listed in priority order, from most critical to most incremental.

### Priority 1 — Security (Do Before Any Production Use)

**1.1 Add Authentication**
Implement Supabase Auth (email/password or magic link). Protect all pages behind a session check. Assign a role to each user (agent vs. warehouse) and render the appropriate interface. This is a prerequisite for any serious production deployment.

**1.2 Audit and Enable Supabase RLS**
Verify that Row-Level Security is enabled on all four tables. Define policies that restrict read/write access based on authenticated user roles. Without this, any SQL-savvy person with the anon key can read or delete all data.

**1.3 Remove or Protect `/debug` and `/test` Routes**
These pages expose internal system information. Either delete them entirely or wrap them in `if (process.env.NODE_ENV !== 'production') return null`.

### Priority 2 — Data Integrity

**2.1 Fix Weight Storage**
Add a `weight` column (NUMERIC, nullable) to `order_items` alongside `quantity`. Stop using the serialized notes string as a data channel. This will make the data queryable and reportable.

**2.2 Extract `parseItemNotes` to a Shared Utility**
Create `src/lib/orderUtils.js` (or `.ts`) and move `parseItemNotes` there. Import it in both page files. This eliminates the duplication risk.

**2.3 Add Server-Side Validation via Supabase Functions or Check Constraints**
Add PostgreSQL CHECK constraints (e.g., `quantity >= 0`, `status IN ('חדשה', 'בטיפול', 'הודפס', 'נשלחה', 'הושלמה', 'בוטלה')`) so the database enforces correctness regardless of what the client sends.

### Priority 3 — Maintainability

**3.1 Decompose the Monolithic Page Components**
Break `page.js` and `warehouse/page.js` into smaller components:

- `<CustomerSelect>` — dropdown with search
- `<ProductModal>` — modal for configuring an item
- `<OrderItemRow>` — a single row in the order items list
- `<OrderCard>` — a card in the warehouse order grid
- `<OrderDetailsModal>` — the warehouse detail modal
- `<StatusBadge>` — status pill with color

**3.2 Create a Supabase Client Singleton**
Create `src/lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js';
let client;
export function getSupabaseClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
```
Import this everywhere instead of calling `createClient` inline.

**3.3 Enable TypeScript Properly**
Rename `.js` files to `.tsx`, define interfaces for `Customer`, `Product`, `Order`, `OrderItem`, and use them throughout. This will catch many classes of bugs at compile time rather than at runtime.

### Priority 4 — Reliability & UX

**4.1 Add Pagination to Order Lists**
Both order lists should use Supabase's `.range(from, to)` method and render a "Load More" button or paginator. Start with 50 orders per page.

**4.2 Improve Error Handling**
Replace generic `alert()` and `setMessage()` calls with a toast notification system. Log errors to an external service (Sentry's free tier is appropriate here). Show different messages for network errors vs. validation errors.

**4.3 Add `created_by` to Orders**
Once authentication is added, record the agent's user ID in `orders.created_by`. This enables accountability, filtering by agent, and agent-specific views.

**4.4 Fix HTML Escaping in Print Output**
In `generatePrintHTML`, escape all user-supplied strings before inserting into HTML:
```javascript
function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
```

### Priority 5 — Features

**5.1 Admin Panel for Product & Customer Management**
Create a protected `/admin` route where an authorized user can:
- Add/edit/deactivate products
- Edit customer details
- View order statistics

**5.2 Date Range Filtering in Warehouse**
Allow warehouse staff to filter orders by delivery date range, not just status.

**5.3 Order History / Customer View**
Allow field agents to view the full order history for a specific customer — useful for repeat orders and reference.

**5.4 Progressive Web App (PWA) Support**
Field agents likely use mobile phones. Adding a `manifest.json` and service worker would allow the app to be "installed" on a phone's home screen and potentially support offline drafting of orders.

---

*This document reflects the state of the codebase as of 2026-04-23 (git commit `6317aec`). Update this document when significant architectural changes are made.*
