# Checklist - SaaS Multi-tenant Preset & E2E Testing Infrastructure

## Multi-tenant Infrastructure

### Database Schema

- [ ] `tenants` table created with all required fields (id, name, slug, status, plan, settings, created_at, updated_at)
- [ ] `tenant_id` foreign key added to all relevant tables (users, todos, orders, etc.)
- [ ] Indexes created on `tenant_id` columns for query performance
- [ ] Migration script tested and validated
- [ ] Database constraints verified (unique slug, valid status values)

### Tenant Isolation Middleware

- [ ] `tenant-isolation.ts` middleware created in `src/server/middleware/`
- [ ] Tenant extraction from request (header, JWT claim, or subdomain) works correctly
- [ ] Tenant stored in Hono context (`c.var.tenant`)
- [ ] Tenant validation logic rejects invalid tenant_id
- [ ] Unit tests pass for middleware (success and failure cases)

### Tenant Service

- [ ] `tenant-service.ts` created with all CRUD methods
- [ ] `createTenant()` validates input and generates unique slug
- [ ] `getTenant()`, `getTenantById()`, `getTenantBySlug()` return correct data
- [ ] `updateTenant()`, `deleteTenant()` work correctly with permissions
- [ ] Unit tests pass for all service methods

### Tenant Routes

- [ ] `tenant-routes.ts` created with SuperAdmin CRUD routes
- [ ] Request/response schemas defined using Zod
- [ ] Routes protected with SuperAdmin permission
- [ ] Integration tests pass using `createTestClient()`
- [ ] Error handling works correctly (404, 403, 400)

### Module Manifest

- [ ] `module.ts` created for tenant module
- [ ] Dependencies declared correctly (auth, permission)
- [ ] Routes registered (admin, standalone)
- [ ] Shared schemas and DB schemas declared
- [ ] `npm run validate:modules` passes

### Role-Based Access Control

- [ ] Roles extended: SUPER_ADMIN, TENANT_ADMIN, TENANT_USER
- [ ] Permission system supports tenant-scoped permissions
- [ ] Permission middleware enforces tenant isolation
- [ ] Tests verify TenantAdmin cannot access other tenant data
- [ ] Tests verify SuperAdmin can access all tenants

## SaaS Preset

### Preset Configuration

- [ ] `saas` preset added to `modules.config.ts`
- [ ] Preset includes all required modules (auth, permission, admin, notifications, todos, file, content, tenant)
- [ ] Dependency graph is valid
- [ ] Preset description is accurate

### Tenant Admin Portal Structure

- [ ] `src/tenant/` directory created
- [ ] `App.tsx` created with routes configured
- [ ] `main.tsx` entry point created
- [ ] `layouts/` directory created with Layout, Sidebar, Header components
- [ ] `pages/` directory created with placeholder components
- [ ] `stores/` directory created with tenantStore.ts

### Tenant Admin Pages

- [ ] DashboardPage displays tenant statistics (user count, plan status, etc.)
- [ ] UsersPage lists all tenant users
- [ ] UsersPage supports CRUD operations for tenant users
- [ ] SubscriptionPage displays current plan and usage
- [ ] SubscriptionPage supports plan upgrades/downgrades
- [ ] SettingsPage displays and updates tenant settings

### Tenant Admin Routes

- [ ] `tenant-admin-routes.ts` created with user management routes
- [ ] User management routes scoped to tenant
- [ ] Subscription management routes created
- [ ] Tenant settings routes created
- [ ] Request/response schemas defined
- [ ] Integration tests pass

### Tenant HTML Entry

- [ ] `tenant.html` created with proper meta tags
- [ ] Entry point points to `/src/tenant/main.tsx`
- [ ] `vite.config.ts` updated to include tenant entry
- [ ] Path aliases configured for `@tenant`
- [ ] Build succeeds with all three entries (main, admin, tenant)

### Generators Update

- [ ] `file-filter.ts` includes tenant files
- [ ] `template-generator.ts` scaffolds tenant portal correctly
- [ ] `package-json.ts` handles saas dependencies
- [ ] Scaffolding saas preset produces working app

## Ecommerce Merchant Portal

### Merchant Portal Structure

- [ ] `src/merchant/` directory created
- [ ] `App.tsx` created with routes configured
- [ ] `main.tsx` entry point created
- [ ] `layouts/` directory created with Layout, Sidebar, Header components
- [ ] `pages/` directory created with placeholder components
- [ ] `stores/` directory created with merchantStore.ts

### Merchant Admin Pages

- [ ] DashboardPage displays sales analytics (revenue, orders, etc.)
- [ ] ProductsPage lists all products created by merchant
- [ ] ProductsPage supports CRUD operations for products
- [ ] OrdersPage lists all orders for merchant's products
- [ ] OrdersPage supports updating order status
- [ ] Navigation works correctly between pages

### Merchant Routes

- [ ] `merchant-routes.ts` created with product CRUD routes
- [ ] Product routes scoped to merchant
- [ ] Order management routes created
- [ ] Merchant analytics routes created
- [ ] Request/response schemas defined
- [ ] Integration tests pass

### Merchant HTML Entry

- [ ] `merchant.html` created with proper meta tags
- [ ] Entry point points to `/src/merchant/main.tsx`
- [ ] `vite.config.ts` updated to include merchant entry
- [ ] Path aliases configured for `@merchant`
- [ ] Build succeeds with all entries (main, admin, merchant)

### Ecommerce Preset Update

- [ ] Ecommerce preset description updated
- [ ] Merchant portal documented
- [ ] Scaffolding ecommerce preset includes merchant portal
- [ ] Generators updated to handle merchant files

## E2E Testing Infrastructure

### Test Strategy

- [ ] Test coverage matrix documented (preset x pages x scenarios)
- [ ] Test data generation strategy defined
- [ ] Test timeout and retry strategy defined
- [ ] Test parallelization planned

### Test Utilities

- [ ] `test-helpers.ts` created with common functions (login, navigation, etc.)
- [ ] `api-client.ts` created wrapping Hono RPC client
- [ ] `data-generator.ts` created for random test data
- [ ] `presets.ts` config created with preset URLs and configs
- [ ] All utilities tested and working

### Todo Preset Tests

- [ ] Homepage loads without errors
- [ ] Navigation between pages works
- [ ] Todo CRUD operations work (create, read, update, delete)
- [ ] API responses are correct using `createTestClient()`
- [ ] Screenshots captured on failure
- [ ] Test passes on https://todo.shanbox.19930810.xyz:8443

### Minimal Preset Tests

- [ ] Homepage loads without errors
- [ ] Basic todo operations work
- [ ] Minimal module set verified
- [ ] API responses are correct
- [ ] Test passes on https://minimal.shanbox.19930810.xyz:8443

### Ecommerce Preset Tests

- [ ] Homepage loads without errors
- [ ] Product listing page works
- [ ] Order creation flow works
- [ ] Merchant portal login works
- [ ] Merchant portal navigation works
- [ ] Test passes on https://shop.shanbox.19930810.xyz:8443

### Xbrowser-Marketplace Preset Tests

- [ ] Homepage loads without errors
- [ ] Plugin listing and search work
- [ ] Plugin detail page works
- [ ] Plugin CRUD operations work (if authenticated)
- [ ] Test passes on https://plugin.shanbox.19930810.xyz:8443

### Fullstack-Admin Preset Tests

- [ ] Homepage loads without errors
- [ ] Admin portal login works
- [ ] User management page works
- [ ] System settings page works
- [ ] All admin CRUD operations work
- [ ] Test passes on https://fullstack-admin.shanbox.19930810.xyz:8443

### Forum Preset Tests

- [ ] Homepage loads without errors
- [ ] Forum listing works
- [ ] Thread creation works
- [ ] Thread viewing works
- [ ] Content moderation works (if authenticated)
- [ ] Test passes on https://forum.shanbox.19930810.xyz:8443

### SaaS Preset Tests

- [ ] Homepage loads without errors
- [ ] Tenant admin portal login works
- [ ] User management works (tenant-scoped)
- [ ] Subscription management works
- [ ] Tenant isolation verified (cannot access other tenant data)
- [ ] Test passes (if deployed)

### Playwright Configuration

- [ ] Browser path configured (system Chromium at `/Applications/Chromium.app/Contents/MacOS/Chromium`)
- [ ] Headless mode enabled
- [ ] Parallel execution configured (3 workers)
- [ ] Screenshots and videos configured on failure
- [ ] Test reporters configured (JSON, HTML, list)
- [ ] Test timeout configured (30s per test)

### Local E2E Execution

- [ ] E2E tests run against local dev server
- [ ] E2E tests run against shanbox URLs
- [ ] All tests pass
- [ ] Screenshot artifacts generated

## CI Integration

### CI Job Configuration

- [ ] `e2e-shanbox-tests` job added to `.github/workflows/ci.yml`
- [ ] Job configured to run after deployment jobs
- [ ] Job dependencies configured correctly
- [ ] Timeout and retry strategy configured

### Test Artifacts

- [ ] Playwright reports uploaded (JSON, HTML)
- [ ] Screenshots uploaded on failure
- [ ] Test logs uploaded
- [ ] Artifact retention configured (14 days)

### Test Result Reporting

- [ ] Test results parsed correctly
- [ ] PR comment created with test results
- [ ] Results formatted with preset-level breakdown
- [ ] Failure details and screenshots links included

### E2E Test Execution

- [ ] E2E test runner configured in CI
- [ ] Environment variables configured (test URLs, credentials)
- [ ] Parallel execution configured in CI
- [ ] Test timeout and retry configured

### CI Integration Testing

- [ ] CI workflow triggered manually
- [ ] E2E tests run after deployment
- [ ] Artifacts uploaded correctly
- [ ] PR comment created correctly

### Scheduled Tests

- [ ] Scheduled E2E tests configured (weekly)
- [ ] Scheduled workflow in CI
- [ ] Slack/email notifications configured on failure

## Documentation

### README Updates

- [ ] SaaS preset described in README
- [ ] Merchant portal described in README
- [ ] E2E testing documented in README
- [ ] Architecture diagrams created and included

### Migration Guides

- [ ] Guide for adding new HTML entries created
- [ ] Guide for creating new admin portals created
- [ ] Guide for adding E2E tests created
- [ ] Guide for CI integration created

### CLAUDE.md Updates

- [ ] Multi-tenant development rules added
- [ ] Portal development rules added
- [ ] E2E testing rules added
- [ ] Architecture overview updated

## Comprehensive Testing

### Unit Tests

- [ ] All unit tests pass
- [ ] Coverage meets requirements (>80%)
- [ ] No test failures or errors

### Integration Tests

- [ ] All integration tests pass
- [ ] Coverage meets requirements
- [ ] No test failures or errors

### E2E Tests

- [ ] All E2E tests pass locally
- [ ] All E2E tests pass on shanbox
- [ ] No test failures or errors
- [ ] Screenshot artifacts generated

### CI Pipeline

- [ ] CI pipeline runs successfully
- [ ] All jobs complete
- [ ] No failures or errors
- [ ] Artifacts uploaded

## Performance Testing

### Database Performance

- [ ] Multi-tenant queries complete under 100ms
- [ ] Indexes verified for performance
- [ ] No slow queries detected

### E2E Test Performance

- [ ] E2E tests complete under 10 minutes
- [ ] Parallel execution optimized
- [ ] No flaky tests

### CI Job Performance

- [ ] CI E2E job completes under 15 minutes
- [ ] Job timeout configured appropriately
- [ ] Resource usage optimized

### Performance Regressions

- [ ] No performance regressions detected
- [ ] Baseline performance metrics established
- [ ] Performance monitoring in place

## Final Validation

### Scaffold Testing

- [ ] All presets scaffold correctly
- [ ] Scaffolded apps build successfully
- [ ] Scaffolded apps run without errors
- [ ] Scaffolded apps pass all tests

### Deployment Testing

- [ ] SaaS preset deploys successfully
- [ ] Tenant admin portal works in production
- [ ] Merchant portal works in production
- [ ] E2E tests run against production

### User Acceptance

- [ ] SuperAdmin can manage tenants
- [ ] TenantAdmin can manage their tenant
- [ ] TenantUser can access tenant data
- [ ] Merchant can manage their products and orders

### Documentation Review

- [ ] All documentation reviewed and approved
- [ ] Migration guides tested and verified
- [ ] README is accurate and up-to-date
- [ ] CLAUDE.md rules are clear and comprehensive
