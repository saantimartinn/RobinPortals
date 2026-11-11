# Holded reconciliation and Spanish calendar

The portal must reproduce Holded's posted revenue: valid sales invoices, sales receipts, signed credit notes, and manual income ledger entries. Linked document ledger entries must not be counted twice. The present 2026 reconciliation is 99,430.49 invoices + 5,284.06 receipts - 954.55 credit notes - 4,025.49 manual revenue = 99,734.51 EUR. Manual VAT is -845.34 EUR; no VAT rate may be inferred for an adjustment.

Document and adjustment rows must explain net, VAT and gross totals. Accounting adjustments are not customer debts or collections. Errors fetching a required source must not silently publish a partial financial total. Existing documents in Holded, including T260007, are read-only.

Calendar dates and reporting boundaries use Europe/Madrid, including DST. Persisted instants remain UTC. Finance periods retain their existing calendar-label representation and July fiscal-year convention; comparisons convert instants to Madrid calendar days. Query timestamps use actual Madrid midnight. Contract dates, bookings and assistant business dates must use the same Spanish calendar.

Existing pending Meta filters and sales-detail work must be retained. Changes must be tested with refunds, cancellations, duplicated linked ledger entries, incomplete pagination, midnight year/month boundaries, summer/winter offsets and DST booking enumeration.
