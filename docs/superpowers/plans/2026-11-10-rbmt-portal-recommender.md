# RBMT methodology in both student portals

Goal: Portal and Robin Jr use one server-only engine based on the current RBMT implementation, without changing RBMT or publishing.

Architecture: shared CommonJS package with the same catalogue, base score, bounded historical adjustments, open-response analysis, cross-area candidates, AI validation and fallback. Thin app adapters retain app authentication, configuration and storage. Normalize named subjects into the existing scoring dimensions; retain ranking and original answers for the AI. Explicit career determination adds a strong bounded signal, grounded in the student's words, distinct from curiosity and refusal.

Tasks:
- [x] Add failing behavioral checks for subject preferences, open text, history, explicit determination, output validation and cache refresh.
- [x] Port RBMT into a shared package and adapt old/new questionnaires without changing persisted user answers.
- [x] Connect anonymous RBMT history and each portal's existing adviser decisions, excluding the current student; gracefully fall back when history is unavailable.
- [x] Version stored recommendations and regenerate older caches; preserve current programme/origin eligibility rules and 10-result admin view.
- [x] Verify both app integrations, database read queries, all repository tests and function bundling. Keep RBMT unchanged; no push, deployment or live student data edits.

Constraints: no new database tables; no raw open responses in historical prompts; adviser rejections remain exclusions. History/model settings are server environment variables, with deployment configuration documented. Test inputs cover blank answers, accents/IB/A-level subject names, conflicting thumbs, negation, uncertain goals, unavailable careers, missing history and AI failure.

Validation: 422 repository tests pass; both Netlify functions bundle successfully with the shared code/catalogue included. Read-only history queries succeeded on Portal, Robin Jr and RBMT. Synthetic live AI checks returned ten unique valid programmes in each app and prioritised the explicitly chosen Aerospace Engineering programme. Review findings about mixed negation, third-person mentions and overlapping degree labels were fixed and covered by regression tests. RBMT Git status remains clean. No commits, push, deployment, production configuration changes or live student record edits.
