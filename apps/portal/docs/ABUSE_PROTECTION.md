# Rate limiting and abuse protection

ROBIN uses Netlify's code-based edge rate limiting rather than process-memory
counters or a database table. The native rules apply before the request reaches the
Netlify Function and return HTTP 429 when exceeded.

Official reference: https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/

## Rules

| Rule | Paths | Limit | Aggregation |
|---|---|---:|---|
| Identity | login and password change | 10 requests / 60 s | IP + domain |
| Expensive work | DNI OCR, chat, admin AI/history, document upload ticket/confirm, booking availability/create | 12 requests / 60 s | IP + domain |

The two-rule design fits the documented code-rule allowance of the lowest Netlify
plans. Limits are intentionally moderate because IP aggregation can group legitimate
users behind the same office/school network.

Provider webhooks and scheduled Functions are excluded. They already use signatures
or shared secrets, and an edge IP limit could interfere with provider retries. Admin
data/mutation endpoints remain authenticated and are not currently expensive enough
to consume one of the two basic-plan rules.

## Verification and operations

- Unit tests verify paths, thresholds and edge continuation.
- Syntax/lint gates include `netlify/edge-functions/*.mjs`.
- Netlify validates code-based rules during deploy post-processing. Operators must
  confirm both rules appear in the deploy log; an invalid rule may not fail deploy.
- Monitor HTTP 429 counts and support reports after release. If shared-network false
  positives appear, adjust thresholds in source and redeploy.
- Per-IP rules mitigate individual abuse but do not impose an absolute project-wide
  cost ceiling. Netlify documents domain-wide aggregation as an Enterprise feature.

No Supabase-backed counters, row writes or external cache were introduced.
