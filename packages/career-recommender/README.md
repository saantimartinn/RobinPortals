# Shared student recommender

Portal del Alumno and Robin Jr use this server-only package. The starting implementation and the 229-programme catalogue come from RBMT; RBMT itself is unchanged. App adapters retain their own authentication, credentials, storage and eligibility rules.

## Ranking

The RBMT base score remains: interest area +35 (otherwise +6), personality up to +25, favourite subjects up to +20, disliked subjects down to −10, learning style up to +8 and each selected career value up to +3. RBMT's bounded adjustments remain: comparable historical feedback ±10 and informative open responses ±15. The final score is clamped to 0–100.

An additional explicit career decision adds up to +25 to matching programmes. It also allows that programme into the candidate list outside the initial interest area and prioritises it in the fallback. Curiosity, uncertainty and refusals do not receive this bonus. AI evidence must quote the student's actual answer and name the identified career. Adviser rejections always exclude a programme. No unavailable degree is invented.

Subject names, accents, common IB/A-level names and the ranked questionnaire are normalised into the original scoring dimensions. Duplicate names do not multiply a preference. Contradictory likes/dislikes for the same dimension cancel for the numeric score; the AI still receives the original answers and ordering. Other subjects remain visible to the AI.

## Existing profiles and history

The adapter reads current and legacy question labels; students need not repeat onboarding. It extracts career-relevant open questions and excludes school/location fields from the extra analysis. Historical prompts contain only matching signals, never student names, contact details or raw answers.

Existing portal adviser decisions are read from `career_recommendation_feedback`, excluding the current student and unrelated areas. RBMT student votes can additionally be read from its existing `recommendation_feedback` table. Failures to load history leave the recommender operational. No schema migration is required.

App environment variables (private, server only):

- `RBMT_SUPABASE_URL` and `RBMT_SUPABASE_SECRET_KEY`: the existing RBMT history source; read operations only.
- `RECOMMENDER_ANTHROPIC_MODEL`: defaults to RBMT's `claude-haiku-4-5-20251001`, independent of chat/OCR. Uses the app's existing `ANTHROPIC_API_KEY`.

Ignored local `.env` files are configured. Before production, transfer these variables through the existing site environment tooling (`PORTAL__...` and `ROBINJR__...`); no secrets are committed. Recommendations have an `engine_version`; older caches regenerate on the next eligible admin request. The existing international-origin restriction and ten-result administration view remain.

Run `npm test` from the repository root. Focused checks are in `apps/portal/test/rbmt-methodology.test.js`, `recommendation-history.test.js` and `career-recommendations-handler.test.js`; they exercise both app adapters.
