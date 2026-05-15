# SaaS Multi-tenant Preset & E2E Testing Infrastructure

## Why

The current `create-biomimic-app` CLI tool generates 7 presets with 2 HTML entries (client, admin), but lacks:

1. **Multi-tenant architecture** - Critical for SaaS applications with tenant isolation
2. **Merchant/Tenant admin portals** - Separate from platform admin for ecommerce/SaaS
3. **Comprehensive E2E testing** - Current tests are local-only, not testing deployed presets on shanbox
4. **CI integration for E2E** - No automated testing after deployment to production environments

This spec addresses these gaps by:

- Adding a new `saas` preset with multi-tenant support
- Adding `merchant.html` (ecommerce) and `tenant.html` (saas) entries
- Creating E2E tests that run against deployed presets on shanbox
- Integrating E2E tests into GitHub CI pipeline

## What Changes

### 1. Multi-tenant Infrastructure

- **DB Schema**: Add `tenants` table with `id`, `name`, `slug`, `status`, `plan`, `settings`
- **Middleware**: `tenant-isolation` middleware to extract tenant_id from request
- **Service**: TenantService for CRUD operations, tenant validation
- **Context**: TenantContext to store current tenant during request lifecycle

### 2. SaaS Preset

- **Modules**: auth, permission, admin, notifications, todos, file, content
- **Roles**: SuperAdmin (platform admin), TenantAdmin (tenant admin), TenantUser (tenant member)
- **Entry**: `tenant.html` for tenant admin portal
- **Pages**: User management, Subscription management, Tenant settings
- **Routes**:
  - `/api/tenants/*` - SuperAdmin only
  - `/api/tenant/*` - TenantAdmin scoped routes

### 3. Ecommerce Merchant Portal

- **Entry**: `merchant.html` for ecommerce merchants
- **Pages**: Product management, Order management, Dashboard
- **Routes**:
  - `/api/merchant/products/*` - Product CRUD (merchant-scoped)
  - `/api/merchant/orders/*` - Order management (merchant-scoped)
  - `/api/merchant/dashboard/*` - Merchant analytics

### 4. E2E Testing Infrastructure

- **Test Framework**: Playwright with 8 existing specs
- **Test Strategy**:
  - Test every page of every deployed preset on shanbox
  - Use Hono RPC `createTestClient()` for API testing
  - Screenshots on failure
  - Test coverage: homepage, CRUD operations, API responses
- **Test URLs**:
  - todo: https://todo.shanbox.19930810.xyz:8443
  - minimal: https://minimal.shanbox.19930810.xyz:8443
  - shop: https://shop.shanbox.19930810.xyz:8443
  - plugin: https://plugin.shanbox.19930810.xyz:8443
  - fullstack-admin: https://fullstack-admin.shanbox.19930810.xyz:8443
  - forum: https://forum.shanbox.19930810.xyz:8443

### 5. CI Integration

- **New Job**: `e2e-shanbox-tests` in `.github/workflows/ci.yml`
- **Dependencies**: Runs after deployment jobs
- **Artifacts**: Screenshots, test reports
- **Failure Reporting**: Comment on PR with test results

## Impact

- **Affected specs**: None (new features)
- **Affected code**:
  - `template/modules.config.ts` - Add `saas` preset
  - `template/src/server/db/schema/` - Add `tenants` schema
  - `template/src/server/middleware/` - Add `tenant-isolation.ts`
  - `template/src/server/module-tenant/` - New tenant management module
  - `template/src/merchant/` - New merchant admin portal
  - `template/src/tenant/` - New tenant admin portal
  - `template/index.html`, `template/admin.html` - No changes
  - `template/merchant.html` - New merchant entry
  - `template/tenant.html` - New tenant entry
  - `template/vite.config.ts` - Add merchant, tenant entries
  - `tests/e2e/` - Add shanbox E2E tests
  - `.github/workflows/ci.yml` - Add E2E job
  - `src/generators/` - Update for new entries and module

## ADDED Requirements

### Requirement: Multi-tenant Architecture

System SHALL support multi-tenant architecture with complete data isolation between tenants.

#### Scenario: Tenant Isolation

- **WHEN** a TenantAdmin performs any operation
- **THEN** the system SHALL only return data belonging to their tenant
- **AND** all database queries SHALL be scoped by `tenant_id`

#### Scenario: SuperAdmin Access

- **WHEN** a SuperAdmin accesses `/api/tenants`
- **THEN** the system SHALL return all tenants
- **AND** the system SHALL allow creating, updating, and deleting tenants

### Requirement: Tenant Admin Portal

System SHALL provide a tenant admin portal accessible via `/admin/tenant/*` routes.

#### Scenario: Tenant Admin Login

- **WHEN** a TenantAdmin logs in to tenant.html
- **THEN** the system SHALL redirect to `/admin/tenant/dashboard`
- **AND** the system SHALL load tenant-specific data

#### Scenario: User Management

- **WHEN** a TenantAdmin accesses `/admin/tenant/users`
- **THEN** the system SHALL list all users in the tenant
- **AND** the system SHALL allow creating, updating, deleting tenant users

#### Scenario: Subscription Management

- **WHEN** a TenantAdmin accesses `/admin/tenant/subscription`
- **THEN** the system SHALL display current plan and usage
- **AND** the system SHALL allow upgrading/downgrading plans

### Requirement: Merchant Admin Portal

System SHALL provide a merchant admin portal for ecommerce preset.

#### Scenario: Merchant Dashboard

- **WHEN** a merchant logs in to merchant.html
- **THEN** the system SHALL display sales analytics
- **AND** the system SHALL show recent orders

#### Scenario: Product Management

- **WHEN** a merchant accesses `/admin/merchant/products`
- **THEN** the system SHALL list all products created by the merchant
- **AND** the system SHALL allow CRUD operations on products

#### Scenario: Order Management

- **WHEN** a merchant accesses `/admin/merchant/orders`
- **THEN** the system SHALL list all orders for merchant's products
- **AND** the system SHALL allow updating order status

### Requirement: E2E Testing

System SHALL provide comprehensive E2E testing for all deployed presets.

#### Scenario: Test Homepage Load

- **WHEN** E2E tests run for a preset
- **THEN** the system SHALL verify homepage loads without errors
- **AND** the system SHALL verify API endpoints respond correctly

#### Scenario: Test CRUD Operations

- **WHEN** E2E tests perform CRUD operations
- **THEN** the system SHALL use Hono RPC `createTestClient()`
- **AND** the system SHALL verify data persistence across requests

#### Scenario: Test Failure Handling

- **WHEN** an E2E test fails
- **THEN** the system SHALL capture a screenshot
- **AND** the system SHALL save test logs
- **AND** the system SHALL report failure details

### Requirement: CI Integration

System SHALL integrate E2E tests into GitHub CI pipeline.

#### Scenario: Post-Deployment Testing

- **WHEN** deployment to shanbox completes
- **THEN** the system SHALL trigger E2E tests
- **AND** the system SHALL test all deployed presets

#### Scenario: Test Results Reporting

- **WHEN** E2E tests complete
- **THEN** the system SHALL upload test artifacts
- **AND** the system SHALL comment on PR with results
- **AND** the system SHALL fail the job if any test fails

## MODIFIED Requirements

None - all changes are new features.

## REMOVED Requirements

None.
