# Native Robin Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native iPhone home, shared notification inbox, and account/help screen while preserving the existing authenticated product web flows.

**Architecture:** SwiftUI owns app navigation and renders native home/inbox/account views. An authenticated service uses the WKWebView cookie store to query each product's existing notification endpoint independently; tapping a row loads the product URL with its notification ID so the existing popup and acknowledgement flow remain authoritative. Product access is refreshed from Portal session data and existing Community access status.

**Tech Stack:** SwiftUI, WKWebView, URLSession, Node Netlify Functions, existing Supabase databases.

**Spec:** `docs/superpowers/specs/2026-11-27-native-robin-experience.md`

## Global Constraints

- Do not store or merge product accounts in the native app.
- Check authorization independently for each product; a failed product request must not hide other results.
- Do not expose full notification content in the aggregate inbox or push; load it in the authenticated product popup.
- Terms notices still require the existing explicit acknowledgement.
- Keep existing external-link and payment behavior.
- Reuse the website's Robin wordmark, product marks and brand colors in all native screens.
- Hide the duplicate web product-switcher bar inside `WKWebView`; the native Robin home remains the product selector.

## Review Focus

- Expired or absent Portal cookie: show sign-in and never display cached client identity. Test session failure.
- Product endpoint returns 401/403 or is unavailable: retain successful results from other products. Test partial results.
- Push opened before sign-in: remember only validated product and UUID notification ID, then navigate after authentication. Test allow-listed routes and reject malformed payloads.
- Terms notice opened from inbox: route to the existing popup, never acknowledge from native list. Test no acknowledgement request from row tap.
- User loses product membership: refresh entitlements before opening and omit that product. Test denied product route.

---

### Task 1: Define native navigation and product models

**Files:**
- Create: `apps/ios/Robin/RobinNavigation.swift`
- Create: `apps/ios/RobinTests/RobinNavigationTests.swift` (or add a test target only if the Xcode project supports it cleanly)
- Modify: `apps/ios/project.yml` only if a test target is required

- [x] Add focused coverage for product route allow-list, UUID validation and notice summary parsing.
- [x] Add product models, summary parsing and route validation.
- [x] Compile the app and test target for iOS Simulator.
- [ ] Complete `xcodebuild test`; Xcode's simulator test session stalled during result finalization.

### Task 2: Add authenticated native data service

**Files:**
- Create: `apps/ios/Robin/RobinService.swift`
- Modify: `apps/ios/Robin/PushRegistration.swift`
- Tests: `apps/ios/RobinTests/RobinServiceTests.swift` if supported

- [ ] Define injectable URLSession and cookie source.
- [x] Fetch Portal identity and each product's notifications independently with WKWebView cookies.
- [x] Convert each product response to a minimal summary: ID, title, type, created date, status, product.
- [x] Return partial results on per-product failures and sort newest first.
- [ ] Test partial failures and expiry handling before integrating.

### Task 3: Build the native shell

**Files:**
- Create: `apps/ios/Robin/RobinHomeView.swift`
- Create: `apps/ios/Robin/RobinInboxView.swift`
- Create: `apps/ios/Robin/RobinAccountView.swift`
- Modify: `apps/ios/Robin/ContentView.swift`
- Modify: `apps/ios/Robin/RobinApp.swift`

- [x] Replace the single full-screen WebView root with native Inicio, Avisos and Cuenta screens, branded tab bar and product logos.
- [x] Render only products verified for the signed-in account.
- [x] Preserve the existing WebView as the product destination and preserve its login/biometric bridge; use native Inicio instead of the duplicate web product switcher, with the Portal section bar pinned to the top.
- [x] Provide loading, empty, offline and expired-session states.
- [x] Add account/help rows for report problem, privacy policy, notification permission status and logout.
- [x] Build for simulator and the connected iPhone; install and launch on the iPhone.

### Task 4: Connect inbox navigation and push routing

**Files:**
- Modify: `apps/ios/Robin/RobinInboxView.swift`
- Modify: `apps/ios/Robin/ContentView.swift`
- Modify: `apps/ios/Robin/PushRegistration.swift`

- [x] Tapping a notice opens only its validated product route with `?notification=<uuid>`.
- [x] Keep acknowledgement in the existing portal popup; never mark viewed on native row tap.
- [x] Bring pending push navigation through sign-in and into the selected product.
- [ ] Verify regular and terms notice routing with a signed-in account and real notice.

### Task 5: Update guide and release checklist

**Files:**
- Modify: `apps/ios/README.md`
- Modify: `apps/ios/APP_STORE_READINESS.md`

- [x] Document native tabs, available product scope and review limitations.
- [x] Recheck simulator/device builds and device launch.
- [x] Mark unresolved account deletion, privacy and App Store 4.2 work as prerequisites, not completed work.
- [ ] Complete the simulator test run and account-backed notification flow verification.

