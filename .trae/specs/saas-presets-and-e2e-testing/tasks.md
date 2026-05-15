# Tasks - SaaS Multi-tenant Preset & E2E Testing Infrastructure

## Phase 1: Multi-tenant Infrastructure

- [ ] Task 1.1: Design and implement database schema for multi-tenancy

  - [ ] Add `tenants` table with fields: id, name, slug, status, plan, settings, created_at, updated_at
  - [ ] Add `tenant_id` foreign key to existing tables (users, todos, orders, etc.)
  - [ ] Create indexes on `tenant_id` for query performance
  - [ ] Write migration script to add tenant columns

- [ ] Task 1.2: Implement tenant isolation middleware

  - [ ] Create `src/server/middleware/tenant-isolation.ts`
  - [ ] Extract `tenant_id` from request (header, JWT claim, or subdomain)
  - [ ] Store tenant in context (Hono `c.var`)
  - [ ] Add tenant validation logic
  - [ ] Write unit tests for middleware

- [ ] Task 1.3: Implement TenantService

  - [ ] Create `src/server/module-tenant/services/tenant-service.ts`
  - [ ] Implement `createTenant()`, `getTenant()`, `updateTenant()`, `deleteTenant()`
  - [ ] Implement `getTenantBySlug()`, `getTenantById()`
  - [ ] Add tenant validation (slug uniqueness, status checks)
  - [ ] Write unit tests for service

- [ ] Task 1.4: Create tenant management routes

  - [ ] Create `src/server/module-tenant/routes/tenant-routes.ts`
  - [ ] Define Hono RPC routes for tenant CRUD (SuperAdmin only)
  - [ ] Define tenant info endpoint (TenantAdmin)
  - [ ] Add request/response schemas using Zod
  - [ ] Write integration tests using `createTestClient()`

- [ ] Task 1.5: Create tenant module manifest

  - [ ] Create `src/server/module-tenant/module.ts`
  - [ ] Define module dependencies (auth, permission)
  - [ ] Register routes (admin, standalone)
  - [ ] Declare shared schemas, DB schemas
  - [ ] Validate with `npm run validate:modules`

- [ ] Task 1.6: Update role-based access control
  - [ ] Extend existing permission system with tenant-scoped permissions
  - [ ] Add roles: SUPER_ADMIN, TENANT_ADMIN, TENANT_USER
  - [ ] Update permission middleware for tenant isolation
  - [ ] Write tests for tenant-scoped permissions

---

## Phase 2: SaaS Preset Implementation

- [ ] Task 2.1: Add saas preset to modules.config.ts

  - [ ] Define saas preset with required modules (auth, permission, admin, notifications, todos, file, content, tenant)
  - [ ] Add tenant to dependency graph
  - [ ] Write description and metadata

- [ ] Task 2.2: Create tenant admin portal structure

  - [ ] Create `template/src/tenant/` directory
  - [ ] Create `template/src/tenant/App.tsx` with routes
  - [ ] Create `template/src/tenant/main.tsx` entry point
  - [ ] Create `template/src/tenant/layouts/` (Layout, Sidebar, Header)
  - [ ] Create `template/src/tenant/pages/` (Dashboard, Users, Subscription, Settings)
  - [ ] Create `template/src/tenant/stores/tenantStore.ts` for state management

- [ ] Task 2.3: Implement tenant admin pages

  - [ ] Create DashboardPage with tenant stats
  - [ ] Create UsersPage with user management (CRUD)
  - [ ] Create SubscriptionPage with plan management
  - [ ] Create SettingsPage with tenant settings
  - [ ] Add navigation and routing

- [ ] Task 2.4: Create tenant admin routes

  - [ ] Create `src/server/module-tenant/routes/tenant-admin-routes.ts`
  - [ ] Define routes for user management (scoped to tenant)
  - [ ] Define routes for subscription management
  - [ ] Define routes for tenant settings
  - [ ] Add request/response schemas
  - [ ] Write integration tests

- [ ] Task 2.5: Create tenant.html entry

  - [ ] Create `template/tenant.html` HTML entry file
  - [ ] Update `template/vite.config.ts` to include tenant entry
  - [ ] Configure path aliases for @tenant
  - [ ] Test build with multiple entries

- [ ] Task 2.6: Update generators for saas preset
  - [ ] Update `src/generators/file-filter.ts` to include tenant files
  - [ ] Update `src/generators/template-generator.ts` to scaffold tenant portal
  - [ ] Update `src/generators/package-json.ts` to handle saas dependencies
  - [ ] Test scaffolding saas preset

---

## Phase 3: Ecommerce Merchant Portal

- [ ] Task 3.1: Create merchant admin portal structure

  - [ ] Create `template/src/merchant/` directory
  - [ ] Create `template/src/merchant/App.tsx` with routes
  - [ ] Create `template/src/merchant/main.tsx` entry point
  - [ ] Create `template/src/merchant/layouts/` (Layout, Sidebar, Header)
  - [ ] Create `template/src/merchant/pages/` (Dashboard, Products, Orders)
  - [ ] Create `template/src/merchant/stores/merchantStore.ts`

- [ ] Task 3.2: Implement merchant admin pages

  - [ ] Create DashboardPage with sales analytics
  - [ ] Create ProductsPage with product management (CRUD)
  - [ ] Create OrdersPage with order management
  - [ ] Add navigation and routing

- [ ] Task 3.3: Create merchant routes

  - [ ] Create `src/server/module-order/routes/merchant-routes.ts`
  - [ ] Define routes for product CRUD (merchant-scoped)
  - [ ] Define routes for order management (merchant-scoped)
  - [ ] Define routes for merchant analytics
  - [ ] Add request/response schemas
  - [ ] Write integration tests

- [ ] Task 3.4: Create merchant.html entry

  - [ ] Create `template/merchant.html` HTML entry file
  - [ ] Update `template/vite.config.ts` to include merchant entry
  - [ ] Configure path aliases for @merchant
  - [ ] Test build with multiple entries

- [ ] Task 3.5: Update ecommerce preset

  - [ ] Update `modules.config.ts` ecommerce preset description
  - [ ] Document merchant portal usage
  - [ ] Test scaffolding ecommerce preset with merchant portal

- [ ] Task 3.6: Update generators for merchant portal
  - [ ] Update `src/generators/file-filter.ts` to include merchant files
  - [ ] Update `src/generators/template-generator.ts` to scaffold merchant portal
  - [ ] Test scaffolding ecommerce preset

---

## Phase 4: E2E Testing Infrastructure

- [ ] Task 4.1: Design E2E test strategy for shanbox

  - [ ] Document test coverage matrix (preset x pages x scenarios)
  - [ ] Define test data generation strategy
  - [ ] Define test timeout and retry strategy
  - [ ] Plan for test parallelization

- [ ] Task 4.2: Create E2E test utilities

  - [ ] Create `tests/e2e/utils/test-helpers.ts` with common functions
  - [ ] Create `tests/e2e/utils/api-client.ts` wrapping Hono RPC client
  - [ ] Create `tests/e2e/utils/data-generator.ts` for random test data
  - [ ] Create `tests/e2e/config/presets.ts` with preset URLs and configs

- [ ] Task 4.3: Create E2E tests for todo preset

  - [ ] Create `tests/e2e/presets/todo.spec.ts`
  - [ ] Test homepage load and navigation
  - [ ] Test todo CRUD operations
  - [ ] Test API responses using `createTestClient()`
  - [ ] Add screenshot capture on failure

- [ ] Task 4.4: Create E2E tests for minimal preset

  - [ ] Create `tests/e2e/presets/minimal.spec.ts`
  - [ ] Test homepage load
  - [ ] Test basic todo operations
  - [ ] Verify minimal module set

- [ ] Task 4.5: Create E2E tests for ecommerce preset

  - [ ] Create `tests/e2e/presets/ecommerce.spec.ts`
  - [ ] Test homepage and product listing
  - [ ] Test order creation flow
  - [ ] Test merchant portal login and navigation

- [ ] Task 4.6: Create E2E tests for xbrowser-marketplace preset

  - [ ] Create `tests/e2e/presets/plugin.spec.ts`
  - [ ] Test plugin listing and search
  - [ ] Test plugin detail page
  - [ ] Test plugin CRUD (if authenticated)

- [ ] Task 4.7: Create E2E tests for fullstack-admin preset

  - [ ] Create `tests/e2e/presets/fullstack-admin.spec.ts`
  - [ ] Test admin portal login
  - [ ] Test user management page
  - [ ] Test system settings page
  - [ ] Test all admin CRUD operations

- [ ] Task 4.8: Create E2E tests for forum preset

  - [ ] Create `tests/e2e/presets/forum.spec.ts`
  - [ ] Test forum listing
  - [ ] Test thread creation and viewing
  - [ ] Test content moderation (if authenticated)

- [ ] Task 4.9: Create E2E tests for saas preset

  - [ ] Create `tests/e2e/presets/saas.spec.ts`
  - [ ] Test tenant admin portal login
  - [ ] Test user management (tenant-scoped)
  - [ ] Test subscription management
  - [ ] Verify tenant isolation

- [ ] Task 4.10: Update Playwright configuration

  - [ ] Update `template/playwright.config.ts` for shanbox tests
  - [ ] Configure browser path (system Chromium)
  - [ ] Configure parallel execution (3 workers, headless)
  - [ ] Configure screenshots and videos on failure
  - [ ] Add test reporters (JSON, HTML, list)

- [ ] Task 4.11: Run E2E tests locally
  - [ ] Run E2E tests against local dev server
  - [ ] Run E2E tests against shanbox URLs
  - [ ] Verify all tests pass
  - [ ] Check screenshot artifacts

---

## Phase 5: CI Integration

- [ ] Task 5.1: Add E2E test job to CI

  - [ ] Add `e2e-shanbox-tests` job to `.github/workflows/ci.yml`
  - [ ] Configure job to run after deployment
  - [ ] Configure job dependencies
  - [ ] Configure timeout and retry strategy

- [ ] Task 5.2: Configure test artifacts in CI

  - [ ] Upload Playwright reports (JSON, HTML)
  - [ ] Upload screenshots on failure
  - [ ] Upload test logs
  - [ ] Configure artifact retention (14 days)

- [ ] Task 5.3: Implement test result reporting

  - [ ] Create GitHub Actions step to parse test results
  - [ ] Create script to comment on PR with test results
  - [ ] Format test results with preset-level breakdown
  - [ ] Add failure details and screenshots links

- [ ] Task 5.4: Configure E2E test execution

  - [ ] Add E2E test runner to CI
  - [ ] Configure environment variables (test URLs, credentials)
  - [ ] Configure parallel execution in CI
  - [ ] Configure test timeout and retry

- [ ] Task 5.5: Test CI integration

  - [ ] Trigger CI workflow manually
  - [ ] Verify E2E tests run after deployment
  - [ ] Verify artifacts are uploaded
  - [ ] Verify PR comment is created

- [ ] Task 5.6: Update E2E test schedule
  - [ ] Add scheduled E2E tests (weekly)
  - [ ] Configure scheduled workflow in CI
  - [ ] Add Slack/email notifications on failure

---

## Phase 6: Documentation and Validation

- [ ] Task 6.1: Update project documentation

  - [ ] Update README.md with SaaS preset description
  - [ ] Update README.md with merchant portal description
  - [ ] Update README.md with E2E testing documentation
  - [ ] Create architecture diagrams for multi-tenant system

- [ ] Task 6.2: Create migration guides

  - [ ] Create guide for adding new HTML entries
  - [ ] Create guide for creating new admin portals
  - [ ] Create guide for adding E2E tests
  - [ ] Create guide for CI integration

- [ ] Task 6.3: Update CLAUDE.md rules

  - [ ] Add rules for multi-tenant development
  - [ ] Add rules for portal development
  - [ ] Add rules for E2E testing
  - [ ] Update architecture overview

- [ ] Task 6.4: Comprehensive testing

  - [ ] Run all unit tests
  - [ ] Run all integration tests
  - [ ] Run all E2E tests locally
  - [ ] Run CI pipeline end-to-end

- [ ] Task 6.5: Performance testing
  - [ ] Test multi-tenant query performance
  - [ ] Test E2E test execution time
  - [ ] Optimize slow queries
  - [ ] Optimize E2E test parallelization

---

## Task Dependencies

```
Phase 1 (Multi-tenant Infrastructure)
  ├─ Task 1.1 (DB Schema) ─┬─→ Task 1.2 (Middleware)
  │                      └─→ Task 1.3 (Service)
  │                       └─→ Task 1.4 (Routes)
  │                        └─→ Task 1.5 (Manifest)
  └─ Task 1.6 (RBAC) ────────┘

Phase 2 (SaaS Preset)
  ├─ Task 2.1 (Preset Config) ─┬─→ Task 2.2 (Portal Structure)
  │                           ├─→ Task 2.3 (Pages)
  │                           ├─→ Task 2.4 (Routes)
  │                           ├─→ Task 2.5 (HTML Entry)
  │                           └─→ Task 2.6 (Generators)
  └─ Phase 1 (depends on multi-tenant infra)

Phase 3 (Ecommerce Merchant)
  ├─ Task 3.1 (Portal Structure) ─┬─→ Task 3.2 (Pages)
  │                             ├─→ Task 3.3 (Routes)
  │                             ├─→ Task 3.4 (HTML Entry)
  │                             ├─→ Task 3.5 (Preset Update)
  │                             └─→ Task 3.6 (Generators)
  └─ Phase 2 (depends on SaaS patterns)

Phase 4 (E2E Testing)
  ├─ Task 4.1 (Test Strategy) ─┬─→ Task 4.2 (Test Utils)
  │                           ├─→ Task 4.3 (Todo Tests)
  │                           ├─→ Task 4.4 (Minimal Tests)
  │                           ├─→ Task 4.5 (Ecommerce Tests)
  │                           ├─→ Task 4.6 (Plugin Tests)
  │                           ├─→ Task 4.7 (Admin Tests)
  │                           ├─→ Task 4.8 (Forum Tests)
  │                           ├─→ Task 4.9 (SaaS Tests)
  │                           └─→ Task 4.10 (Playwright Config)
  └─ Task 4.11 (Run Locally)

Phase 5 (CI Integration)
  ├─ Task 5.1 (CI Job) ──────┬─→ Task 5.2 (Artifacts)
  │                         ├─→ Task 5.3 (Reporting)
  │                         ├─→ Task 5.4 (Execution)
  │                         ├─→ Task 5.5 (Test CI)
  │                         └─→ Task 5.6 (Schedule)
  └─ Phase 4 (depends on E2E tests)

Phase 6 (Documentation)
  ├─ Task 6.1 (Documentation)
  ├─ Task 6.2 (Migration Guides)
  ├─ Task 6.3 (Rules Update)
  ├─ Task 6.4 (Testing)
  └─ Task 6.5 (Performance)
  └─ Phases 1-5 (depends on implementation)
```

---

## 验收标准

1. **Multi-tenant Infrastructure**

   - [ ] Tenant table created with proper indexes
   - [ ] Tenant isolation middleware extracts and validates tenant_id
   - [ ] TenantService passes all unit and integration tests
   - [ ] Tenant routes are type-safe and validated
   - [ ] Module manifest validates successfully

2. **SaaS Preset**

   - [ ] Saas preset appears in CLI scaffold options
   - [ ] Tenant admin portal loads without errors
   - [ ] All tenant admin pages render correctly
   - [ ] Tenant admin routes respond correctly
   - [ ] Tenant isolation works (TenantAdmin sees only their data)

3. **Ecommerce Merchant Portal**

   - [ ] Merchant admin portal loads without errors
   - [ ] Merchant dashboard shows sales analytics
   - [ ] Product CRUD operations work
   - [ ] Order management works
   - [ ] Merchant routes are scoped correctly

4. **E2E Testing**

   - [ ] All preset E2E tests pass locally
   - [ ] All preset E2E tests pass on shanbox
   - [ ] Tests use `createTestClient()` for API calls
   - [ ] Screenshots captured on failure
   - [ ] Test coverage meets requirements (homepage, CRUD, API)

5. **CI Integration**

   - [ ] E2E tests run after deployment
   - [ ] Test artifacts uploaded correctly
   - [ ] PR comments created with test results
   - [ ] Scheduled tests run weekly
   - [ ] Failure notifications sent

6. **Documentation**

   - [ ] README updated with new features
   - [ ] Migration guides created
   - [ ] CLAUDE.md rules updated
   - [ ] Architecture diagrams created

7. **Performance**
   - [ ] Multi-tenant queries complete under 100ms
   - [ ] E2E tests complete under 10 minutes
   - [ ] CI E2E job completes under 15 minutes
   - [ ] No performance regressions detected
