# Holded Reconciliation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline tasks and the assigned independent timezone worker for non-financial surfaces. Steps use checkbox syntax.

**Goal:** Reconcile portal revenue to Holded and use Spain's calendar consistently.

**Architecture:** Normalize sales documents and manual ledger adjustments into signed activity rows. Shared Madrid calendar helpers keep stored instants intact while fixing reporting, display and query boundaries.

**Tech Stack:** CommonJS, React, Intl, node:test, Holded APIs.

**Spec:** ../specs/2026-11-11-holded-reconciliation-design.md

## Global Constraints
- No external accounting writes; retain existing pending changes.
- Europe/Madrid is the business timezone; use actual VAT ledger amounts.
- Never publish silently truncated or incomplete financial sources.

## Review Focus
- A credit note returned positive by Holded must subtract exactly once.
- Document-linked ledger entries must never duplicate invoices or tickets.
- Failed or incomplete ledger pagination must not produce a reconciled total.
- January/November boundaries and DST must assign each record to one Spanish day.
- Manual adjustments must not become customer receivables.

### Task 1: Shared Spanish calendar
Files: packages/time/madrid.cjs; site/test/madrid-time.test.cjs; financial period/date consumers.
- [x] Write midnight/DST tests; observe failure.
- [x] Implement dateKey(value), calendarDate(value), dayStart(key), addCalendarDays(key, days).
- [x] Apply to financial comparisons, query boundaries and invoice dates; run tests.

### Task 2: Signed document and ledger reconciliation
Files: admin/lib/holded/analytics.js, admin/lib/finance/revenue.js, admin/lib/finance/holded.js, admin snapshot/finance handlers and tests.
- [x] Test invoice + receipt - credit note + manual ledger, pagination and no double count.
- [x] Add listSalesDocuments and cached, complete ledger loading; normalize manual70x revenue and matching477 VAT.
- [x] Integrate signed activity into totals, charts and detailed rows; verify live2026 total99734.51.

### Task 3: Detailed report and operational Spanish dates
Files: admin report/integration types; worker-owned booking/contract/assistant date consumers and tests.
- [x] Label documents and adjustments, with document count separate from adjustment count and explicit net/VAT/gross reconciliation.
- [x] Fix audited nonfinancial date surfaces and DST booking enumeration.
- [x] Run admin tests, root tests, four frontend builds, visual report checks and final independent review.
