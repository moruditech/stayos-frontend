# StayOS Frontend — Technical Documentation
## Version 1.0.0
### Next.js 14 · Vite 5 · TypeScript 5.6 · pnpm Workspaces / Turborepo

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Monorepo & Apps](#3-monorepo--apps)
4. [Project Structure](#4-project-structure)
5. [Environment Configuration](#5-environment-configuration)
6. [Architecture](#6-architecture)
7. [Enforced Package Boundaries](#7-enforced-package-boundaries)
8. [Session & Permissions](#8-session--permissions)
9. [API Layer](#9-api-layer)
10. [Real-Time Communication](#10-real-time-communication)
11. [Design System](#11-design-system)
12. [Component Library](#12-component-library)
13. [Screens — Property Operations Portal](#13-screens--property-operations-portal)
14. [Other Apps — Screen Summary](#14-other-apps--screen-summary)
15. [Data Rules and Constraints](#15-data-rules-and-constraints)
16. [Backend API Surface](#16-backend-api-surface)
17. [Incomplete and Not-Yet-Implemented](#17-incomplete-and-not-yet-implemented)
18. [Getting Started](#18-getting-started)

---

## 1. Project Overview

StayOS is a multi-tenant property management platform for hotels,
guesthouses, and student/long-term housing, built for the South African
market (ZAR currency formatting; PSIRA and immigration-register
references appear in backend-adjacent logic). The frontend is a
monorepo of six applications sharing one design system, one typed API
client, and one permission model.

Each app serves a different audience:

- **`customer`** — guests and tenants search, book, and manage stays or
  leases.
- **`property`** — property staff run day-to-day operations at a single
  property.
- **`owners`** — property owners oversee their portfolio and can enter a
  property's operational portal directly.
- **`agency`** — management companies oversee a portfolio of properties
  under a mandate.
- **`admin`** — internal staff administer the platform.
- **`public`** — marketing, search, and signup.

All six import the same six shared packages (`ui`, `api-client`, `auth`,
`validators`, `constants`, `types`). A change to a shared type,
permission string, or design token reaches every app through normal
package resolution, without being duplicated per app.

---

## 2. Technology Stack

| Category | Package | Notes |
|---|---|---|
| Framework (4 apps) | Next.js 14 (App Router) | `customer`, `property`, `owners`, `public` |
| Framework (2 apps) | Vite 5 + `react-router-dom` | `admin`, `agency` — no server runtime |
| Language | TypeScript 5.6 | Strict mode repo-wide |
| Data fetching | `@tanstack/react-query` ^5.56 | Per-domain query-key factories |
| Forms | `react-hook-form` ^7.53 + `@hookform/resolvers` | |
| Validation | `zod` ^3.23 | Shared via `@stayos/validators` |
| Realtime | `socket.io-client` | Wrapped in `@stayos/ui/realtime` |
| Icons | `lucide-react` | |
| JWT decoding | `jwt-decode` | Import restricted to `@stayos/auth` by lint rule |
| Build orchestration | Turborepo ^2.1 | |
| Package manager | pnpm ^9.7 (workspaces) | |
| Linting | ESLint 8 + `eslint-plugin-boundaries` | Enforces the package dependency graph |

---

## 3. Monorepo & Apps

| App | Package | Stack | Dev port | Route groups |
|---|---|---|---|---|
| `public` | `@stayos/app-public` | Next.js | 3000 | flat (`/search`, `/property/[slug]`, `/signup/*`, `/legal/*`, ...) |
| `customer` | `@stayos/app-customer` | Next.js | 3001 | `(auth)`, `(portal)` |
| `property` | `@stayos/app-property` | Next.js | 3002 | `(auth)`, `(portal)` |
| `owners` | `@stayos/app-owners` | Next.js | 3003 | `(auth)`, `(portal)` |
| `agency` | `@stayos/app-agency` | Vite SPA | 3004 | `react-router-dom`, lazy-loaded pages |
| `admin` | `@stayos/app-admin` | Vite SPA | 3005 | `react-router-dom`, lazy-loaded pages |

`admin` and `agency` are the only apps without a Next.js server, which
determines how each one handles authentication — see §8.2.

---

## 4. Project Structure

```
stayos-frontend/
├── pnpm-workspace.yaml            packages: apps/*, packages/*
├── turbo.json                     build/dev/lint/typecheck/test pipeline
├── tsconfig.base.json             shared strict compiler options
├── .eslintrc.json                 package boundary + import restriction rules
│
├── apps/
│   ├── public/
│   │   └── src/app/               services, legal, search, property/[slug],
│   │                               signup/{property,agency}, pricing, about, contact
│   ├── customer/
│   │   └── src/app/
│   │       ├── (auth)/            login, forgot/reset-password, verify-email,
│   │       │                       oauth callback
│   │       └── (portal)/          bookings, leases, applications, invoices,
│   │                               payments, loyalty, reviews, complaints,
│   │                               wishlist, accommodation, profile, settings
│   ├── property/
│   │   └── src/app/
│   │       ├── (auth)/            login
│   │       └── (portal)/          dashboard, bookings, rooms, pricing, folios,
│   │                               housekeeping, maintenance, hr, roster,
│   │                               procurement, expenses, pettycash, access,
│   │                               channels, promotions, reports, chat,
│   │                               onboarding, settings, support
│   ├── owners/
│   │   └── src/app/
│   │       ├── (auth)/            login, register, forgot/reset-password
│   │       └── (portal)/          properties, properties/new, properties/[id],
│   │                               mandates, profile, support
│   ├── agency/
│   │   └── src/pages/             Login, Dashboard, Profile, Portfolio, Mandates,
│   │                               Properties, Staff, Statements, Billing,
│   │                               Analytics, Onboarding, Support
│   └── admin/
│       └── src/pages/             Login, Dashboard, Tenants, Agencies, Analytics,
│                                   Revenue, Subscriptions, Users, Plans, Coupons,
│                                   Referrals, Vetting, Support, Moderation, AuditLogs
│
└── packages/
    ├── types/          src/          shared TS types, no internal deps
    ├── constants/      src/          roles, permission strings, scopes
    ├── validators/     src/          zod schemas
    ├── api-client/     src/
    │   ├── client.ts                 request wrapper, token injection, refresh queue
    │   └── domains/                  one file per backend module (see §9.2)
    ├── auth/           src/
    │   ├── SessionProvider.tsx       session bootstrap, refresh, context
    │   ├── permissions.ts            resolvePermissions/hasPermission
    │   ├── token-store.ts            in-memory + opt-in localStorage token slots
    │   ├── decode.ts                 JWT decode/expiry (internal only)
    │   ├── agency-context.ts
    │   ├── marker-cookie.ts
    │   └── logout.ts
    └── ui/             src/
        ├── design-tokens.css         single source of truth for all visual tokens
        ├── primitives.tsx            Modal, ConfirmDialog, Toast, SkeletonLoader, ...
        ├── patterns.tsx              PageHeader, StatCard, Panel, ActivityFeed, ...
        ├── gates/                    RoleGate.tsx, PlanGate.tsx
        ├── realtime/                 SocketProvider, useSocketEvent, useEmit
        ├── DataTable.tsx, FileUpload.tsx, MandateBanner.tsx, PiiField.tsx, ...
        └── ForgotPasswordPage.tsx, ResetPasswordPage.tsx, MfaStep.tsx
```

**Naming conventions:** Next.js route folders use kebab-case per App
Router convention. React SPA pages (`admin`, `agency`) are PascalCase
with a `Page` suffix. Shared package source files are camelCase, or
PascalCase for anything exporting a component.

---

## 5. Environment Configuration

| Variable | Used by | Scope | Purpose |
|---|---|---|---|
| `API_URL` | `property`, `owners`, `customer`, `public` | Server-only | Backend origin. The Next.js rewrite proxies `/api/v1/*` to this URL, keeping the refresh-token cookie same-origin. |
| `NEXT_PUBLIC_API_URL` | `property`, `owners`, `customer`, `public` | Client | Leave unset. Setting it makes the client bundle call the API directly and skip the proxy, which breaks the cookie's same-origin assumption (§15.1). |
| `VITE_API_URL` | `admin`, `agency` | Client (build-time) | Backend origin, called directly — these apps have no server to proxy through. |

Create a local env file per app (e.g. `apps/property/.env.local`) and
set the variables above before running `dev`.

---

## 6. Architecture

### 6.1 Why Next.js *and* Vite in one monorepo

`customer`, `property`, `owners`, and `public` run a Next.js server and
use it to proxy `/api/v1/*` to the backend, keeping the refresh-token
cookie same-origin. `admin` and `agency` are internal tools deployed as
static SPAs with no server of their own — for those two, the refresh
token is sent explicitly and kept in `localStorage` instead of relying
on a cross-site cookie (§8.2).

### 6.2 Breaking the auth ↔ api-client circular dependency

`@stayos/api-client` needs the current session token on every request
but cannot import `@stayos/auth` directly, because `@stayos/auth` calls
into `api-client` during session bootstrap (`api.tenants.getMe()`) —
importing both ways would create a cycle.

This is solved with getter injection. `SessionProvider` registers
`setTokenGetter()`, `setTenantIdGetter()`, and `setRefreshCallback()`
with `api-client` at runtime, and `api-client` calls out through those
function references instead of an import. For the same reason,
`api-client` reads the JWT `exp` claim itself rather than importing
`@stayos/auth`'s decoder, and `SessionProvider` resolves its own need
for `api.tenants.getMe()` with a dynamic `import('@stayos/api-client')`
inside `buildSession()`, not a top-level one.

### 6.3 Owner/Agency → Property token exchange ("enter property")

The Owner Portal and Agency Portal can drop a user directly into the
Property Operations Portal without re-authentication:

1. The current owner/agency-scoped token is retained in a separate
   `ownerToken` slot (`token-store.ts`) for the return trip.
2. `POST /owner/properties/:id/enter` (or the agency equivalent) is
   called.
3. The active token is swapped to the tenant-scoped token the call
   returns.
4. The session is rebuilt from the new token — `accessMode` and
   `mandateId` now reflect the property.
5. The user is routed into the Property Operations Portal, which
   bootstraps from the refresh cookie the backend rotated on entry. No
   token is placed in a URL at any point.

The returned token's `accessMode` is `operational` when there's no
active mandate, or `read_only` when an active management mandate exists
(the backend sets this).

### 6.4 Session bootstrap sequence

On mount, `SessionProvider`:

1. Calls `doRefresh()`, racing an 8-second timeout so a cold-starting
   backend can't hold the app on a blank screen — a timeout is treated
   as a refresh failure, same as any other.
2. Decodes the resulting access token and calls `resolvePermissions()`
   against the role plus any per-user granted/denied permission
   overrides.
3. If the token's `scope` is `tenant`, fetches `api.tenants.getMe()` to
   resolve the tenant's enabled plan features for `PlanGate`. A failed
   fetch is non-fatal — plan-gated features stay locked until it
   resolves.
4. Publishes the resulting `Session` object via context.

---

## 7. Enforced Package Boundaries

Dependency direction between packages is enforced at lint time via
`eslint-plugin-boundaries`:

```
apps/*      → ui, api-client, auth, validators, types, constants
ui          → auth, constants, types
api-client  → types, constants
auth        → types, constants
validators  → types, constants
types       → (nothing)
constants   → (nothing)
```

Two `no-restricted-imports` rules apply repo-wide:

- **No deep imports.** Import only a package's public entry point —
  never `@stayos/*/src/*` or `@stayos/*/dist/*`.
- **`jwt-decode` is restricted to `@stayos/auth`.** An override in
  `.eslintrc.json` permits it only inside `packages/auth/src/**`.

---

## 8. Session & Permissions

### 8.1 Token storage

Two in-memory-only slots, defined in `token-store.ts`:

- `activeToken` — attached to every API request. For owner sessions,
  starts as the owner token and is replaced by a tenant-scoped token on
  property entry (§6.3).
- `ownerToken` — retained across property entry/exit so an owner can
  return to the property picker without re-authenticating. Never read by
  `api-client`.

Neither uses `localStorage`/`sessionStorage` by default.

### 8.2 The two auth exceptions

- **Custom-domain Owner Portal:** on a white-label domain, the refresh
  token is read from `sessionStorage` instead of the HttpOnly cookie.
- **`admin` / `agency` (`useStoredRefreshToken`):** the refresh token is
  sent explicitly in the request body and persisted to `localStorage`.
  These are static SPAs on a different domain than the API with no
  server to make the cookie first-party — the HttpOnly cookie would be
  cross-site and dropped by third-party-cookie blocking regardless of
  `SameSite`. This trades cookie security for availability: the token
  becomes readable by any JS on the page, so an XSS bug can lift it
  directly. `customer` and `property` never take this path. The durable
  fix is putting frontend and API on the same registrable domain so the
  cookie can be first-party — treat `useStoredRefreshToken` as a
  deployment-constraint workaround, not a pattern to reach for
  elsewhere.

### 8.3 Permission evaluation

`@stayos/auth`'s `resolvePermissions(role, grantedPermissions,
deniedPermissions)` and `hasPermission()` implement the same
wildcard/namespace permission logic the backend enforces (`ns:*`
wildcards, a special-cased `property:*`, per-user granted/denied
overrides layered on the role's base set). `RoleGate` and `PlanGate` in
`@stayos/ui` consume this to conditionally render UI.

This logic is mirrored by hand from the backend, not generated from a
shared source. When a permission rule changes on the backend, update
`resolvePermissions`/`hasPermission` in the same change.

---

## 9. API Layer

### 9.1 Client

`packages/api-client/src/client.ts` exports the request wrapper every
domain file uses:

- Token attachment via the injected token getter (§6.2).
- A shared in-flight refresh guard — `api-client` and `SessionProvider`
  coordinate through one `refreshPromise`, so concurrent requests
  hitting a near-expiry token trigger exactly one refresh call.
- Errors normalized to `ApiError` (`code`, `fields`, `requestId`,
  `status`) so every app narrows `catch` blocks the same way.
- `NO_RETRY_CODES` (`TOKEN_REVOKED`, `TOKEN_INVALID`) skip the
  refresh-and-retry path — these are unrecoverable sessions, not
  transient expiry.

### 9.2 Domain Files

One file per backend module, each exporting a flat set of typed
functions:

| File | Functions |
|---|---|
| `auth.ts` | `login`, `refresh`, `logout`, `register`, `verifyEmail`, `forgotPassword`, `resetPassword`, `mfaVerify`, `googleLoginUrl` |
| `bookings.ts` | `list`, `get`, `create`, `createPublic`, `update`, `reschedule`, `cancel`, `noShow`, `listMine`, `getFolio` |
| `rooms.ts` | `list`, `create`, `getAvailability`, `getStatusBoard`, `getCalendarMatrix`, `updateStatus`, `block`/`unblock`, `enableIcalExport`, `uploadImage` |
| `folios.ts` | `get`, `getBalance`, `postCharge`, `voidCharge`, `settle`, `getPdfUrl`, `getBookingInvoices` |
| `housekeeping.ts` | `listTasks`, `createTask`, `updateStatus`, `inspectTask`, `requestReClean`, `getLostFound`, `getAnalytics` |
| `maintenance.ts` | `listWorkOrders`, `createWorkOrder`, `assignWorkOrder`, `closeWorkOrder`, `listAssets`, `listSchedules`, `runScheduleNow`, `getAnalytics` |
| `property-ops.ts` | Rate plans, dynamic pricing, subscriptions/plans, access/visitors, access codes, roster/shifts/timeclock, HR profiles/disciplinary, expenses, petty cash floats, procurement (suppliers/stock/POs/vendor contracts), reports (revenue/occupancy/finance/night-audit/student-financial), channels (staff chat DMs, iCal connect/sync), staff permission updates |
| `tenants.ts` | `getMe`, `updateMe`, `getDashboard`, `getOnboarding`, `getSubscription` |
| `agency.ts` | `getMe`, `getPortfolio`, `getAnalytics`, mandates CRUD, `enterProperty`, staff CRUD, billing/statements |
| `owner.ts` | `register`, property CRUD, mandates CRUD, `enterProperty` |
| `customer.ts` | Property search, bookings, applications, leases, invoices, payments, loyalty, complaints, wishlist, reviews, notifications, data export/account deletion |
| `platform.ts` | Tenants, agencies, subscriptions, revenue, users, plans, coupons, referrals, audit logs |
| `onboarding.ts` | `getPending`, `getAdminDetail`, `reviewDocument`, `approve`, `reject`, `requestDocs`, `flag` |

`property-ops.ts` spans many backend modules in one file by design — it
maps to the breadth of the Property Operations Portal, not to a single
backend module boundary the way the other files do. Don't use it as a
template when adding a new domain file.

---

## 10. Real-Time Communication

`@stayos/ui/realtime` wraps Socket.IO. `SocketProvider` owns the
connection, `useSocketEvent` subscribes a component to a named event for
its lifetime, and `useEmit` sends events. The connection follows session
state: it opens once authenticated and closes on logout/unmount.

---

## 11. Design System

All visual tokens live in `packages/ui/src/design-tokens.css` — one
`:root` block every app imports rather than redefining its own. Keep it
that way: per-app duplication is how `property` previously drifted out
of sync and shipped without `--shadow-xl`. App-specific layout tokens
(`--sidebar-width`, `--header-height`, `--content-max`,
`--page-padding-x`) stay local to each app's `globals.css`, since those
genuinely vary per portal.

### 11.1 Color

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#1B4D3E` | Brand — deep green |
| `--color-primary-hover` | `#163D31` | |
| `--color-primary-light` | `#E8F2EE` | Tinted containers |
| `--color-accent` | `#C8A84B` | Gold — loyalty, highlights |
| `--color-bg` | `#F7F6F3` | Page background — warm off-white |
| `--color-surface` | `#FFFFFF` | Cards, modals, inputs |
| `--color-text-primary` | `#1A1A1A` | |
| `--color-text-secondary` | `#6B6860` | |
| `--color-success` / `--color-success-bg` | `#1B7A4A` / `#E6F4EC` | |
| `--color-warning` / `--color-warning-bg` | `#B45309` / `#FEF3C7` | |
| `--color-error` / `--color-error-bg` | `#C0392B` / `#FDECEA` | |
| `--color-info` / `--color-info-bg` | `#1E5FA8` / `#EBF2FB` | |

### 11.2 Typography

- Sans: `Inter` (UI text) — `--font-sans`
- Serif: `Playfair Display` (display/marketing use) — `--font-serif`
- Type scale: `--text-xs` (12px) through `--text-6xl` (60px)
- Weights: `--font-normal` (400) through `--font-bold` (700)

### 11.3 Spacing, Radius, Shadow

- Spacing: 4px base unit, `--space-1` (4px) through `--space-24` (96px)
- Radius: `--radius-sm` (6px) through `--radius-full` (9999px)
- Shadow: `--shadow-xs` through `--shadow-xl`
- Transitions: `--transition-fast` (150ms) / `--transition-base` (200ms)
  / `--transition-slow` (300ms)

---

## 12. Component Library

`@stayos/ui` exports two tiers:

**Primitives** (`primitives.tsx`) — `Modal`, `ConfirmDialog`, `useToast`
/ `ToastStack`, `SkeletonLoader`, `EmptyState`, `StatusBadge`,
`ReadOnlyField`, `Pagination`, `CopyButton`, `DownloadButton`.

**Patterns** (`patterns.tsx`) — composite, dashboard-oriented components
built on the primitives: `PageHeader`, `StatCard` (6 semantic tone
variants), `Panel`, `LinkArrow`, `InsightList`, `ActivityFeed`,
`AlertList`, `RankList`, `QuickActionsBar`, `EmptyBlock`, `LoadingBlock`.

Standalone: `DataTable`, `FileUpload`, `MandateBanner`, `PiiField`,
`GoogleIcon`, `InlineError`, `MfaStep`, `ConsentGate`,
`ForgotPasswordPage`, `ResetPasswordPage`, plus the access gates
`RoleGate` and `PlanGate` (`gates/`).

---

## 13. Screens — Property Operations Portal

The largest and most operationally central app in the monorepo (35
pages).

| Area | Pages |
|---|---|
| Dashboard | `dashboard` |
| Front desk | `bookings`, `bookings/new`, `bookings/[id]`, `rooms`, `rooms/calendar` |
| Pricing | `pricing/rate-plans` |
| Folios | `folios/[id]` |
| Housekeeping | `housekeeping`, `housekeeping/tasks/new`, `housekeeping/tasks/[id]` |
| Maintenance | `maintenance/work-orders`, `maintenance/work-orders/[id]`, `maintenance/assets`, `maintenance/schedules` |
| Team & HR | `hr`, `hr/profiles/[staffId]`, `roster` |
| Communication | `chat` |
| Finance & admin | `expenses`, `pettycash/floats`, `reports` |
| Procurement | `procurement/suppliers`, `procurement/purchase-orders`, `procurement/stock-items`, `procurement/vendor-contracts` |
| Access | `access/visitors` |
| Channels | `channels` (OTA/iCal) |
| Promotions | `promotions` |
| Settings | `settings/property`, `settings/staff`, `settings/staff/[id]`, `settings/subscription` |
| Support & onboarding | `support`, `onboarding` |

Navigation (`src/lib/nav-config.ts`) filters at render time against
`session.permissions` and `session.features`. Plan-gated items are
hidden rather than shown-locked — a locked sidebar link is more
confusing than an absent one.

---

## 14. Other Apps — Screen Summary

| App | Pages |
|---|---|
| `customer` | Dashboard (stay/student search widget), Accommodation search + detail + book/apply, Bookings, Leases, Applications, Invoices, Payments (+ methods, +all), Loyalty, Reviews, Complaints, Wishlist, Notifications, Profile (+ communication-prefs, data-export, delete-account, password), Settings, Support |
| `owners` | Properties list, Properties/new, Property detail (with **Enter Property**, §6.3), Mandates, Profile, Support |
| `agency` | Dashboard, Profile, Portfolio, Mandates, Properties, Staff, Statements, Billing, Analytics, Onboarding, Support |
| `admin` | Dashboard, Tenants, Agencies, Analytics, Revenue, Subscriptions, Users, Plans, Coupons, Referrals, Vetting, Support, Moderation, Audit Logs |
| `public` | Home/search, Property detail (`/property/[slug]`), Search, Services, Pricing, Signup (property / agency), About, Contact, Help, Legal (terms, privacy), Login |

`customer` supports two product modes in one app — short-stay bookings
and long-term/student leases — reflected in its route structure
(`bookings/` alongside `leases/` and `applications/`) and its
dashboard's tabbed search widget (`Stays` vs `Student`).

---

## 15. Data Rules and Constraints

### 15.1 Never set `NEXT_PUBLIC_API_URL` alongside `API_URL`

Set only one per Next.js app. `API_URL` drives the `/api/v1/*` rewrite
proxy that keeps the refresh cookie same-origin; setting
`NEXT_PUBLIC_API_URL` too makes the client bundle bypass the proxy and
call the API cross-origin, breaking the cookie's `SameSite` assumptions.

### 15.2 `useStoredRefreshToken` is not a general-purpose flag

It exists because `admin` and `agency` are static SPAs on a different
origin than the API. Don't enable it on `customer` or `property` to
simplify auth locally — it trades cookie security (HttpOnly, not
readable by page JS) for one that is.

### 15.3 Permission logic is duplicated, not shared

Update `resolvePermissions`/`hasPermission` in `@stayos/auth` in the
same change as any backend permission rule change. There is no
automated sync and no build-time check that catches drift.

### 15.4 No deep package imports

`@stayos/*/src/*` imports are an ESLint error. Import a package's
declared public entry point.

### 15.5 `property-ops.ts` is intentionally not domain-pure

It spans many unrelated backend modules (pricing, HR, procurement,
reports, access, channels) because it serves the Property Operations
Portal's breadth. Don't copy its structure when adding a new domain
file elsewhere — the other domain files map one-to-one to a backend
module, and that's the pattern to follow.

### 15.6 Monetary values

Currency formatting throughout uses ZAR. Check `formatCurrency`-style
helpers already in use in a given app before adding a new one.

---

## 16. Backend API Surface

### 16.1 Bookings

| Function | Purpose |
|---|---|
| `list` / `get` | List/fetch bookings for the current tenant |
| `create` / `createPublic` | Staff-side vs guest-facing booking creation |
| `reschedule` / `cancel` / `noShow` | Booking status transitions |
| `listMine` / `getMine` | Guest's own bookings |
| `getFolio` | The folio attached to a booking |

### 16.2 Rooms

| Function | Purpose |
|---|---|
| `getAvailability` | Availability search |
| `getStatusBoard` | Housekeeping/front-desk room status view |
| `getCalendarMatrix` | Calendar-style booking grid |
| `block` / `unblock` | Take a room out of / back into inventory |
| `enableIcalExport` / `regenerateIcalFeed` | OTA/channel sync |

### 16.3 Property Ops (selected)

| Function | Purpose |
|---|---|
| `getDynamicRules` / `updateDynamicRules` | Rate-plan pricing rules |
| `clockIn` / `clockOut` / `getTimeclockEntries` | Roster time clock |
| `giveBiometricConsent` / `withdrawBiometricConsent` | Time clock biometric consent |
| `probationReview` / `listDisciplinary` | HR staff lifecycle |
| `reconcileFloat` | Petty cash float reconciliation |
| `getNightAudit` | End-of-day financial reconciliation |
| `sync` / `disconnect` (channels) | OTA/iCal channel connection lifecycle |

---

## 17. Incomplete and Not-Yet-Implemented

### 17.1 Reports (Property app)

The Reports hub links to eight report types (Occupancy, Bookings,
Revenue, Finance, Housekeeping, Maintenance, Night Audit, Student
Financials) plus an Export flow. The backend endpoints for all of them
work. None of the eight destination pages are built yet — building them
is the next step for this section, not a design decision to revisit.

### 17.2 Several "create new" actions have no destination page

Rooms ("Add room"), Procurement Purchase Orders ("New order"),
Procurement Suppliers ("Add supplier"), Pricing ("Dynamic rules"), and HR
("Timesheets") link to routes with no page built yet. The backend
endpoints for all of them exist and work.

### 17.3 Card payments, live map tracking, push notifications

Not covered in this pass of the codebase study — check with the
relevant app owner before assuming these are or aren't implemented.

---

## 18. Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

### Installation

```bash
git clone <this-repo>
cd stayos-frontend
pnpm install
```

### Running an app

```bash
pnpm --filter public dev        # http://localhost:3000
pnpm --filter customer dev      # http://localhost:3001
pnpm --filter property dev      # http://localhost:3002
pnpm --filter owners dev        # http://localhost:3003
pnpm --filter agency dev        # http://localhost:3004
pnpm --filter admin dev         # http://localhost:3005
```

Run every app at once from the repo root:

```bash
pnpm dev
```

### Connecting to the backend

For `customer`, `property`, `owners`, `public`: set `API_URL` and leave
`NEXT_PUBLIC_API_URL` unset (§15.1). For `admin` and `agency`: set
`VITE_API_URL`.

### Other root scripts

```bash
pnpm build       # turbo run build — all apps + packages
pnpm lint        # turbo run lint
pnpm typecheck   # turbo run typecheck
pnpm test        # turbo run test
pnpm clean       # turbo run clean && rm -rf node_modules
```

Scope any script to one workspace: `pnpm --filter <app-or-package> <script>`.

---

*StayOS Frontend v1.0.0 — Next.js 14 · Vite 5 · TypeScript 5.6 · pnpm/Turborepo*
