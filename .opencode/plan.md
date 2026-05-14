# Implementation Plan: Independent Preset Architecture

## Overview

Transform 5 UI presets (todo, plugin, ecommerce, community, saas) from a switchable demo into 5 independent, deployable applications — each with its own identity, auth, server-side mock data, and authentic UI.

---

## Phase 0: Foundation (Must Do First)

### 0.1 Separate Client Auth vs Admin Auth Token Storage

**Problem:** Single `auth-token` localStorage key shared between client and admin. Single auth module (`module-auth`) with one login endpoint.

**Files to modify:**

- `template/src/client/stores/authStore.ts` — change persist name from `'auth-token'` to `'client-auth-token'`
- `template/src/admin/stores/adminStore.ts` — verify it uses `'admin-storage'` (already different, confirm)
- `template/src/shared/modules/auth/schemas.ts` — add `AuthScope` field to token response (`'client' | 'admin'`)
- `template/src/server/module-auth/routes/auth-routes.ts` — add scope to JWT payload
- `template/src/server/module-admin/routes/client-auth-routes.ts` — ensure admin auth uses different token prefix
- `template/src/server/middleware/auth.ts` — validate scope matches expected auth type

**Change:** JWT tokens carry `scope: 'client'` or `scope: 'admin'`. Client store persists to `client-auth-token`, admin to `admin-auth-token`. Middleware rejects wrong-scope tokens.

**Dependencies:** None
**Complexity:** M

---

### 0.2 Create Server Mock Routes for Missing Presets

**Problem:** DashboardPage, CartPage, OrdersPage, TopicsPage, ProfilePage, SettingsPage all hardcode data in React components. Need server-side mock routes following the full RPC chain (schema → shared types → server route → client RPC call).

#### 0.2.1 Dashboard Stats Mock Routes (for SaaS preset)

**Files to create/modify:**

- `template/src/shared/modules/dashboard/schemas.ts` — DashboardStatsSchema, RevenueDataSchema, ActivitySchema
- `template/src/shared/modules/dashboard/index.ts` — barrel export
- `template/src/shared/schemas/index.ts` — add dashboard exports
- `template/src/server/module-admin/routes/admin-routes.ts` — add `GET /api/admin/dashboard/stats` mock route
  - Returns: `{ stats: [...], revenue: [...], userGrowth: [...], activity: [...] }`
  - All mock data currently in DashboardPage.tsx moves here

**Dependencies:** None
**Complexity:** M

#### 0.2.2 Cart Mock Routes (for E-Commerce preset)

**Files to create/modify:**

- `template/src/shared/modules/cart/schemas.ts` — CartItemSchema, CartSummarySchema
- `template/src/shared/modules/cart/index.ts` — barrel export
- `template/src/shared/schemas/index.ts` — add cart exports
- `template/src/server/module-order/routes/order-routes.ts` — add cart mock routes:
  - `GET /api/cart` — returns mock cart items
  - `POST /api/cart/items` — add item
  - `PUT /api/cart/items/:id` — update quantity
  - `DELETE /api/cart/items/:id` — remove item

**Dependencies:** None
**Complexity:** M

#### 0.2.3 Orders Mock Routes (for E-Commerce preset)

**Files to create/modify:**

- `template/src/shared/modules/order/schemas.ts` — verify OrderSchema exists, add ECommerceOrderSchema with status
- `template/src/server/module-order/routes/order-routes.ts` — add mock order routes:
  - `GET /api/orders` — returns mock orders list (data currently in OrdersPage.tsx)

**Dependencies:** None
**Complexity:** S

#### 0.2.4 Topics/Forum Mock Routes (for Community preset)

**Files to create/modify:**

- `template/src/shared/modules/community/schemas.ts` — TopicSchema, TopicVoteSchema, ProfileSchema
- `template/src/shared/modules/community/index.ts` — barrel export
- `template/src/shared/schemas/index.ts` — add community exports
- `template/src/server/module-content/routes/public-content-routes.ts` — add:
  - `GET /api/topics` — returns mock topics (data from TopicsPage.tsx)
  - `GET /api/topics/popular` — returns sorted by votes
  - `POST /api/topics/:id/vote` — mock vote
- `template/src/server/module-content/routes/public-content-routes.ts` — add:
  - `GET /api/profile` — returns mock user profile (data from ProfilePage.tsx)

**Dependencies:** None
**Complexity:** M

---

### 0.3 Refactor Pages to Use Server Data via RPC

Each page currently hardcoding data needs to call `apiClient.api.*.$get()` instead.

#### 0.3.1 DashboardPage → use RPC

**Files to modify:**

- `template/src/client/pages/DashboardPage.tsx` — remove hardcoded arrays, add `useEffect` calling `apiClient.api.admin.dashboard.stats.$get()`
- `template/src/client/stores/` — optionally add `dashboardStore.ts` (Zustand pattern)

**Dependencies:** 0.2.1
**Complexity:** M

#### 0.3.2 CartPage → use RPC

**Files to modify:**

- `template/src/client/pages/CartPage.tsx` — remove INITIAL_CART, fetch from `apiClient.api.cart.$get()`
- `template/src/client/stores/` — add `cartStore.ts` (Zustand pattern with cart actions)

**Dependencies:** 0.2.2
**Complexity:** M

#### 0.3.3 OrdersPage → use RPC

**Files to modify:**

- `template/src/client/pages/OrdersPage.tsx` — remove MOCK_ORDERS, fetch from `apiClient.api.orders.$get()`

**Dependencies:** 0.2.3
**Complexity:** S

#### 0.3.4 TopicsPage → use RPC

**Files to modify:**

- `template/src/client/pages/TopicsPage.tsx` — remove MOCK_TOPICS, fetch from `apiClient.api.topics.$get()`

**Dependencies:** 0.2.4
**Complexity:** S

#### 0.3.5 ProfilePage → use RPC

**Files to modify:**

- `template/src/client/pages/ProfilePage.tsx` — remove hardcoded STATS/MOCK_ACTIVITY, fetch from `apiClient.api.profile.$get()`

**Dependencies:** 0.2.4
**Complexity:** S

---

### 0.4 Login Page: Pre-filled Demo Credentials per Preset

**Problem:** LoginPage has empty fields and generic demo buttons ("User"/"Admin"). Need preset-specific pre-filled credentials.

**Files to modify:**

- `template/src/client/pages/LoginPage.tsx` — complete rewrite:
  - Accept `presetId` via React context or route param
  - Define `DEMO_CREDENTIALS` map per preset:
    ```
    todo:      { email: 'demo@biomimic.app', password: 'demo123' }
    plugin:    { email: 'developer@pluginhub.io', password: 'dev123' }
    ecommerce: { email: 'shopper@shopmart.com', password: 'shop123' }
    community: { email: 'member@community.dev', password: 'member123' }
    saas:      { email: 'admin@biomimic.app', password: 'admin123' }
    ```
  - `useState` initialized with preset's demo credentials (pre-filled)
  - Remove "Quick demo login" buttons — just show pre-filled form with "Sign In"
  - Navigate to preset's `defaultRoute` after login
- `template/src/client/stores/authStore.ts` — ensure `login()` accepts email (currently uses `account || email`)
- `template/src/server/module-auth/services/auth-service.ts` — add demo user seed:
  - On startup (or first login), auto-create demo users if they don't exist
  - Or simpler: bypass DB for demo credentials, return mock profile directly

**Demo user approach (simplest):**

- In `auth-service.ts`, add `isDemoUser(email, password)` check before DB lookup
- If matches known demo pair, return hardcoded `DeveloperProfile` without DB query
- This avoids needing DB seeding for demo mode

**Dependencies:** 0.1 (for auth scope awareness)
**Complexity:** M

---

### 0.5 Pass PresetId Context to Client App

**Problem:** Pages (like LoginPage) don't know which preset is active.

**Files to create/modify:**

- `template/src/client/contexts/PresetContext.tsx` — create React context:
  ```ts
  export const PresetContext = createContext<PresetType>('todo')
  export const usePreset = () => useContext(PresetContext)
  ```
- `template/src/client/App.tsx` — wrap with `PresetContext.Provider` using `presetId` prop
- `template/src/client/main.tsx` — read preset from `window.__PRESET_ID__` or env var

**Dependencies:** None
**Complexity:** S

---

### 0.6 Remove Preset Switcher from Navigation

**Problem:** Navigation.tsx has a `showPresetSwitcher` prop with dropdown to switch presets at runtime. This violates "each preset is its own app."

**Files to modify:**

- `template/src/client/components/Navigation.tsx` — remove `showPresetSwitcher`, `activePreset`, `onPresetSwitch` props, remove `PRESET_OPTIONS` array, remove dropdown JSX
- `template/src/client/App.tsx` — remove any preset switching logic (already uses single `presetId` prop)

**Dependencies:** None
**Complexity:** S

---

### 0.7 Align Module Presets with UI Presets (naming)

**Problem:** `modules.config.ts` has `fullstack-admin` / `todo-app` / `minimal`. `preset-ui-config.ts` has `todo` / `plugin` / `ecommerce` / `community` / `saas`. These need to map to each other.

**Files to create/modify:**

- `template/modules.config.ts` — add 2 new presets:
  ```ts
  plugin: {
    modules: ['todos', 'chat', 'notifications', 'plugin', 'auth']
  }
  ecommerce: {
    modules: ['todos', 'chat', 'notifications', 'order', 'content', 'auth']
  }
  community: {
    modules: ['todos', 'chat', 'notifications', 'content', 'auth']
  }
  ```
  Rename existing:
  - `todo-app` → `todo` (align with UI preset name)
  - Keep `fullstack-admin` → `saas` (or add `saas` as alias)
  - Keep `minimal` as-is
- `template/src/client/preset-ui-config.ts` — add `modulePreset` field mapping to modules.config preset name

**Dependencies:** None
**Complexity:** S

---

## Phase 1: Preset Independence

### 1.1 Preset-Aware main.tsx Entry Point

**Problem:** `main.tsx` always renders `<App />` without a preset prop. Need way to select preset at build time or runtime.

**Files to modify:**

- `template/src/client/main.tsx` — read preset from:
  - `import.meta.env.VITE_PRESET` (build-time, set via `.env`)
  - Or `window.__PRESET_ID__` (runtime, injected by server)
  - Pass to `<App presetId={preset} />`
- `template/.env.example` — add `VITE_PRESET=todo`
- `template/vite.config.ts` — add `define: { 'import.meta.env.VITE_PRESET': JSON.stringify(process.env.VITE_PRESET || 'todo') }`

**Dependencies:** 0.5, 0.7
**Complexity:** S

---

### 1.2 Per-Preset Environment Files

**Files to create:**

- `template/.env.todo` — `VITE_PRESET=todo`, `VITE_APP_NAME=Biomimic`, `VITE_PORT=3010`
- `template/.env.plugin` — `VITE_PRESET=plugin`, `VITE_APP_NAME=PluginHub`, `VITE_PORT=3011`
- `template/.env.ecommerce` — `VITE_PRESET=ecommerce`, `VITE_APP_NAME=ShopMart`, `VITE_PORT=3012`
- `template/.env.community` — `VITE_PRESET=community`, `VITE_APP_NAME=Community`, `VITE_PORT=3013`
- `template/.env.saas` — `VITE_PRESET=saas`, `VITE_APP_NAME=AdminPanel`, `VITE_PORT=3014`

**Add scripts to `template/package.json`:**

```json
{
  "dev:todo": "VITE_PRESET=todo vite --port 3010",
  "dev:plugin": "VITE_PRESET=plugin vite --port 3011",
  "dev:ecommerce": "VITE_PRESET=ecommerce vite --port 3012",
  "dev:community": "VITE_PRESET=community vite --port 3013",
  "dev:saas": "VITE_PRESET=saas vite --port 3014",
  "dev:all": "concurrently \"npm:dev:todo\" \"npm:dev:plugin\" \"npm:dev:ecommerce\" \"npm:dev:community\" \"npm:dev:saas\""
}
```

**Dependencies:** 1.1
**Complexity:** S

---

### 1.3 Theme CSS Variables in index.css

**Problem:** Layout.tsx sets CSS vars inline, but components use hardcoded Tailwind colors (e.g., `bg-blue-600`, `text-emerald-500`).

**Files to modify:**

- `template/src/client/index.css` — add CSS variable-based utility classes:
  ```css
  .bg-primary {
    background-color: var(--preset-primary);
  }
  .bg-primary-hover:hover {
    background-color: var(--preset-primary-hover);
  }
  .text-primary {
    color: var(--preset-primary);
  }
  .bg-secondary {
    background-color: var(--preset-secondary-bg);
  }
  .border-preset {
    border-color: var(--preset-border);
  }
  .rounded-preset {
    border-radius: var(--preset-radius);
  }
  /* ... etc */
  ```
- `template/tailwind.config.js` — add theme.extend.colors mapping CSS vars:
  ```js
  colors: {
    preset: {
      primary: 'var(--preset-primary)',
      'primary-hover': 'var(--preset-primary-hover)',
      bg: 'var(--preset-bg)',
      text: 'var(--preset-text)',
      'secondary-bg': 'var(--preset-secondary-bg)',
      border: 'var(--preset-border)',
    }
  }
  ```

**Dependencies:** None
**Complexity:** S

---

### 1.4 Use Theme Variables in LoginPage (Template for All Pages)

**Files to modify:**

- `template/src/client/pages/LoginPage.tsx` — replace hardcoded `bg-blue-600` / `focus:ring-blue-500` with `bg-preset-primary` / `focus:ring-preset-primary`

**Dependencies:** 1.3
**Complexity:** S

---

## Phase 2: UI Authenticity per Preset

### 2.1 Make Navigation Theme-Aware in All Presets

**Problem:** Navigation already reads `theme` prop but uses hardcoded fallbacks. Generated Navigation (by `client-navigation.ts`) hardcodes `bg-indigo-500` and `Biomimic`.

**Files to modify:**

- `template/src/client/components/Navigation.tsx` — already mostly done, verify all hardcoded colors replaced with `primaryColor` from theme
- `src/generators/client-navigation.ts` — use `@primaryColor` and `@logoText` placeholders replaced at generation time

**Dependencies:** 0.7 (preset config)
**Complexity:** S

---

### 2.2 Refactor DashboardPage for Theme Consistency

**Files to modify:**

- `template/src/client/pages/DashboardPage.tsx` — replace all `bg-gray-800` with CSS variable approach for SaaS theme. Use `var(--preset-primary)` for chart bars and active tab styles.

**Dependencies:** 0.3.1, 1.3
**Complexity:** S

---

### 2.3 Refactor CartPage / OrdersPage for E-Commerce Theme

**Files to modify:**

- `template/src/client/pages/CartPage.tsx` — replace `bg-amber-500` / `text-amber-600` with theme variables
- `template/src/client/pages/OrdersPage.tsx` — same treatment

**Dependencies:** 0.3.2, 0.3.3, 1.3
**Complexity:** S

---

### 2.4 Refactor TopicsPage / ProfilePage for Community Theme

**Files to modify:**

- `template/src/client/pages/TopicsPage.tsx` — replace `bg-emerald-*` / `text-emerald-*` with theme variables
- `template/src/client/pages/ProfilePage.tsx` — same treatment

**Dependencies:** 0.3.4, 0.3.5, 1.3
**Complexity:** S

---

### 2.5 Ensure Each Preset Has Distinct Landing Experience

**Verification checklist (manual, not code change):**

- Todo: Clean minimal, indigo accent, calendar/today view
- Plugin: Blue marketplace, search-centric, plugin cards
- E-Commerce: Warm amber, product grid, cart prominent
- Community: Green forum, topic list, voting prominent
- SaaS: Dark professional, stat cards, charts

**If any preset feels too generic, add preset-specific layout tweaks:**

- `template/src/client/pages/ContentListPage.tsx` — used by ecommerce, needs product grid styling
- `template/src/client/pages/ContentDetailPage.tsx` — used by ecommerce, needs product detail styling

**Dependencies:** 2.1-2.4
**Complexity:** M

---

## Phase 3: Scaffold Generator Alignment

### 3.1 Generate preset-ui-config.ts per Preset (Single-Preset Version)

**Problem:** Generator doesn't produce `preset-ui-config.ts`. Generated scaffold loses all theme/route config.

**Files to create/modify:**

- `src/generators/preset-ui-config.ts` — new generator:
  - Input: `ResolvedPreset` + selected preset ID
  - Output: `preset-ui-config.ts` with ONLY that preset's config (not all 5)
  - Includes theme, nav, tabs, routes for the single preset
  - Uses `PresetType` as literal type (not union)

**Dependencies:** 0.7
**Complexity:** M

---

### 3.2 Fix client-app.ts Generator to Use preset-ui-config Routes

**Problem:** `client-app.ts` reads from module manifests (`getClientPages`), ignoring preset-ui-config route definitions.

**Files to modify:**

- `src/generators/client-app.ts` — change to:
  - Import and use routes from generated `preset-ui-config.ts`
  - Use lazy loading (like the template version does)
  - Remove direct module page imports

**Dependencies:** 3.1
**Complexity:** M

---

### 3.3 Fix client-navigation.ts Generator to Use Theme

**Problem:** Generated Navigation hardcodes `bg-indigo-500`, `Biomimic`, `#6366f1`.

**Files to modify:**

- `src/generators/client-navigation.ts` — read theme from preset config:
  - `primaryColor` for active state
  - `logoText` for brand name
  - Remove `AuthButton` conditional logic (always include if auth module present)

**Dependencies:** 3.1
**Complexity:** S

---

### 3.4 Fix client-layout.ts Generator for Theme Support

**Files to modify:**

- `src/generators/client-layout.ts` — include CSS variable injection (from theme config), include `BottomTabBar` for mobile tabs, remove preset switcher

**Dependencies:** 3.1
**Complexity:** S

---

### 3.5 Generate Login/Register Pages with Pre-filled Credentials

**Files to create:**

- `src/generators/client-login-page.ts` — new generator:
  - Takes preset ID, outputs LoginPage.tsx with pre-filled demo credentials
  - Imports from `@client/contexts/PresetContext` for `usePreset()`
  - No "Quick demo login" buttons — just pre-filled form

**Dependencies:** 0.4, 0.5
**Complexity:** S

---

### 3.6 Generate PresetContext

**Files to create:**

- `src/generators/client-preset-context.ts` — new generator:
  - Outputs `contexts/PresetContext.tsx` with the preset hardcoded as literal

**Dependencies:** 0.5
**Complexity:** S

---

### 3.7 Register New Generators in Template Generator Pipeline

**Files to modify:**

- `src/generators/template-generator.ts` — add new generators to pipeline:
  - `generatePresetConfig` → `preset-ui-config.ts`
  - `generatePresetContext` → `contexts/PresetContext.tsx`
  - `generateLoginPage` → `pages/LoginPage.tsx`
- Ensure generation order: shared schemas → server routes → client config → client pages

**Dependencies:** 3.1-3.6
**Complexity:** M

---

### 3.8 Generate Per-Preset .env Files

**Files to create:**

- `src/generators/dotenv.ts` — new generator:
  - Output `.env` with `VITE_PRESET=<preset>` and `VITE_APP_NAME=<theme.logoText>`
  - Based on selected preset

**Dependencies:** 1.2
**Complexity:** S

---

## Phase 4: Deployment & Verification

### 4.1 Dev Script for Running All Presets Concurrently

**Files to modify:**

- `template/package.json` — add `dev:all` script using `concurrently`
- Add `concurrently` to devDependencies if not present

**Dependencies:** 1.2
**Complexity:** S

---

### 4.2 Build and Verify Each Preset Independently

**Verification steps (manual):**

1. `cd template && VITE_PRESET=todo npm run build` — verify no errors
2. Repeat for plugin, ecommerce, community, saas
3. Each build should produce `dist/` with only that preset's pages
4. Run `npm run preview` for each to verify functionality

**Fix any build issues found:**

- Unused imports for non-included preset pages
- Missing routes for excluded modules
- Theme variable defaults

**Dependencies:** Phase 0 + Phase 1 complete
**Complexity:** M

---

### 4.3 Screenshot Each Preset

**Tool:** Use Playwright or manual browser screenshots

**Screenshots needed per preset:**

1. Login page (showing pre-filled credentials)
2. Main page (default route after login)
3. One secondary page (e.g., notifications, cart, topic detail)
4. Mobile view (responsive layout)

**Total: 5 presets × 4 screenshots = 20 screenshots**

**Dependencies:** Phase 2 complete
**Complexity:** S

---

### 4.4 Generate Gallery HTML

**Files to create:**

- `docs/preset-gallery.html` — single HTML page showing all 5 presets side by side:
  - 4 screenshots per preset in a card layout
  - Preset name, description, tech features
  - "Launch" link to running instance
  - Responsive grid

**Dependencies:** 4.3
**Complexity:** S

---

## Task Dependency Graph

```
Phase 0 (parallel):
  0.1 (auth scope) ─────────────────────────────────────┐
  0.2.1-0.2.4 (server mock routes) ──┐                   │
  0.5 (PresetContext) ───────────────┤                   │
  0.6 (remove switcher) ─────────────┤                   │
  0.7 (align presets) ───────────────┤                   │
                                      │                   │
Phase 1 (depends on Phase 0):         │                   │
  0.3.1-0.3.5 (pages → RPC) ←───────┘                   │
  0.4 (login prefill) ←─────────────────────────────────┘
  1.1 (main.tsx) ← 0.5 + 0.7
  1.2 (env files) ← 1.1
  1.3 (CSS vars) ← (independent)
  1.4 (login theme) ← 1.3 + 0.4

Phase 2 (depends on Phase 0 + 1):
  2.1-2.4 (theme in pages) ← 0.3.* + 1.3
  2.5 (verify authenticity) ← 2.1-2.4

Phase 3 (depends on Phase 1):
  3.1 (preset config gen) ← 0.7
  3.2 (client-app gen) ← 3.1
  3.3 (nav gen) ← 3.1
  3.4 (layout gen) ← 3.1
  3.5 (login gen) ← 0.4 + 0.5
  3.6 (context gen) ← 0.5
  3.7 (pipeline) ← 3.1-3.6
  3.8 (env gen) ← 1.2

Phase 4 (depends on all above):
  4.1 (dev scripts) ← 1.2
  4.2 (build verify) ← Phase 0-2
  4.3 (screenshots) ← Phase 2
  4.4 (gallery) ← 4.3
```

## Complexity Summary

| Phase     | S      | M      | L     | Total Tasks |
| --------- | ------ | ------ | ----- | ----------- |
| 0         | 3      | 8      | 0     | 11          |
| 1         | 4      | 0      | 0     | 4           |
| 2         | 4      | 1      | 0     | 5           |
| 3         | 4      | 3      | 0     | 7           |
| 4         | 3      | 1      | 0     | 4           |
| **Total** | **18** | **13** | **0** | **31**      |

## Execution Priority

1. **Phase 0** — Foundation, blocks everything else
2. **Phase 1** — Independence, can start as Phase 0 completes
3. **Phase 2** — UI polish, overlaps with Phase 3
4. **Phase 3** — Generator fixes, can be done in parallel with Phase 2
5. **Phase 4** — Final verification, requires all above

## Estimated Timeline

- Phase 0: 3-4 days
- Phase 1: 1-2 days
- Phase 2: 2-3 days
- Phase 3: 3-4 days
- Phase 4: 1-2 days
- **Total: 10-15 days**
