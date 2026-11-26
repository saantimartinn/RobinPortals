# iOS Admin Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional iPhone push delivery and scheduling to the existing notifications panels in Portal, Robin Jr, and The Robin Plan.

**Architecture:** Each product owns its notifications and scheduled sends. Shared Node code signs and sends APNs requests. The iOS shell registers its APNs token against each product endpoint using the existing authenticated session. Push delivery is an extra channel; the current popup remains authoritative.

**Tech Stack:** SwiftUI, UserNotifications, Netlify Functions, Node 22, Supabase Postgres, APNs HTTP/2.

**Spec:** `docs/superpowers/specs/2026-11-26-ios-admin-push-design.md`

## Global Constraints

- Product admins may address only their own product's customers.
- Scheduled times are selected in Europe/Madrid and stored in UTC.
- No private APNs key or Supabase service credential in client code or Git.
- A push is never proof of popup reading or terms acceptance.

## Review Focus

- Expired or reassigned token: old account must not receive new pushes.
- Duplicate dispatch: one notification per token even if worker retries.
- Missed schedule: sends after due time, never before.
- Invalid recipient IDs: reject rather than sending to another product/customer.
- APNs unavailable: retain popup and show push failure.

---

### Task 1: Native registration and shared APNs transport

**Files:** `apps/ios/Robin/RobinApp.swift`, `apps/ios/Robin/ContentView.swift`, `apps/ios/project.yml`, `packages/notifications/apns.cjs`, tests under `site/test/`.

**Interfaces:** Native app obtains token and registers with authenticated product endpoints; `sendPush({token, title, body, product, notificationId, environment})` sends a single alert and returns provider status.

- [ ] Write failing tests for APNs payload, authorization header, and failed token responses.
- [ ] Run focused tests and confirm failure.
- [ ] Implement native permission/token lifecycle and shared APNs sender.
- [ ] Run focused tests and confirm success.
- [ ] Commit.

### Task 2: Product-owned registration, scheduling and dispatch

**Files:** migrations in each product, server modules and functions in each product, app `netlify.toml`, generated root `netlify.toml`, tests in each product.

**Interfaces:** Authenticated token registration; `createNotification({title, content, recipients, scheduledAt})`; scheduled worker claims due sends and calls `sendPush` once per eligible token.

- [ ] Write failing tests for identity checks, audience selection, timezone, cancellation, and duplicate dispatch.
- [ ] Run focused tests and confirm failure.
- [ ] Create migration with Supabase CLI and implement functions; preserve current popup data flow.
- [ ] Run focused tests and confirm success.
- [ ] Regenerate root Netlify config, run repository tests, and commit.

### Task 3: Extend the three existing admin panels

**Files:** Portal and Robin Jr `application/admin/notifications.jsx`, Community `AdminSubNotifications.jsx`, matching API clients and tests.

**Interfaces:** Each panel offers individual selection, all product clients, installed-app clients, send now, schedule, pending list and cancel.

- [ ] Write failing UI behavior tests for each product's audience and schedule controls.
- [ ] Run focused tests and confirm failure.
- [ ] Implement panel controls and API calls.
- [ ] Run focused tests, full `npm test`, and iOS build; commit.
