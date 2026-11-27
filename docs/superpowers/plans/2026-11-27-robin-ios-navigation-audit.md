# Robin iOS Navigation Audit Implementation Plan

> **For agentic workers:** Execute this plan natively in the current session. Keep each task scoped and verify the result on the connected iPhone.

**Goal:** Remove duplicate admin and student navigation in Robin iOS and make every primary route reachable through one clear app shell.

**Architecture:** Keep the native Robin toolbar and bottom navigation as the app shell. The existing portals remain embedded for complex workflows; hide duplicated global chrome inside the native app and preserve section navigation that is still required. This first pass audits and repairs navigation; it does not claim that every portal screen has already been rewritten in SwiftUI.

**Tech Stack:** SwiftUI, WKWebView, existing React admin shell, injected native-app script.

**Spec:** User request in this conversation; preserve Robin branding and the working student dashboard.

## Global Constraints

- Keep one global product selector and one logout action in native admin mode.
- Keep one section navigation path in each role; do not hide routes needed to reach admin sections.
- Keep the student bottom tabs as the primary navigation.
- Preserve product authentication, RobinJr SSO, notification links, and logout cleanup.
- Do not add or run automated tests unless requested; use iOS build and device verification.

## Review Focus

- Admin global web chrome must not duplicate the native product selector or logout.
- Admin section links must remain reachable after hiding the web header.
- Student home quick actions must not repeat the bottom tab destinations.
- Student product WebViews must retain their own in-product section navigation.
- Switching products and logging out must continue to work with an admin session.

---

### Task 1: Admin navigation shell

**Files:** `apps/ios/Robin/ContentView.swift`

- [x] Detect the admin React shell by its `.mobile-admin-nav` element and hide its duplicate `.top` header in the WebView.
- [x] Report admin-shell detection to SwiftUI so the native toolbar does not depend on a particular URL.
- [x] Preserve the admin bottom tabs and section drawer; they own within-admin navigation.
- [x] Confirm the native toolbar still exposes admin home, CRM, all three products, reload, and logout.
- [x] Disable WebView's automatic safe-area inset; the old inset left an empty strip between the native toolbar and the portal content.
- [x] Hide the duplicated Robin/Admin branding inside the admin home when the native toolbar is present.

### Task 2: Portal admin navigation

**Files:** `apps/portal/portal-source/src/application/admin-portal.css`

- [x] Reflow the global admin sections into a compact, wrapping mobile bar so Notifications and FAQs are not clipped off-screen.
- [x] Use the Robin soft background for the active section, matching the native student tab style.

### Task 3: Student navigation shell

**Files:** `apps/ios/Robin/RobinHomeView.swift`

- [x] Remove header bell/account shortcuts that duplicate the persistent `Avisos` and `Cuenta` tabs.
- [x] Preserve product cards, notice summary, and support action.
- [x] Apply the same active-tab surface to the student tab bar.

### Task 4: Device verification

**Files:** no additional files.

- [x] Build the Robin iOS target.
- [x] Install and launch on the connected iPhone.
- [ ] Inspect the latest build on the iPhone. The device locked after the latest install; retry after it is unlocked. Student live-state inspection also requires a student account.
