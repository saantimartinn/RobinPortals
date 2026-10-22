# AI data-use inventory

The code uses Anthropic as an external processor. No statement here asserts GDPR or
other legal compliance. Confirm the current DPA, region/transfer mechanism, API data
retention/training settings, subprocessor list and deletion support with legal/privacy.

| Flow | Personal data sent | Why | Current minimization | Open action |
|---|---|---|---|---|
| DNI OCR (`onboarding-dni-extract`) | Full DNI/passport image | Extract identity fields | Browser uploads to private Storage with a short-lived ticket; backend verifies the object and does not intentionally log the image | Add explicit pre-upload notice/consent decision and assess whether local/manual OCR is required |
| Career suggestions | Questionnaire, interests and profile signals | Rank suitable programmes | Candidate catalogue is non-personal; result is human-reviewable | Document profiling logic and ensure advisor/user can challenge recommendations |
| Admin assistant/chat | Summarised client/account/application context and conversation | Operational assistance | Message count and lengths are bounded | Reduce multi-client context to the selected client whenever possible |
| Application chat | User conversation plus relevant portal context | User assistance | Recent context is bounded; application chat has 7-day cleanup | Confirm notice and prevent accidental secret/document submission |
| Booking advisor briefing | Identity, phase, payment/document counts, careers and meeting history | Prepare advisor call | Uses counts for documents/payments but still includes identity/history | Remove name/lead ID from prompt unless the model needs them |
| Meet summary | Full transcript/notes and prior compiled history | Produce structured meeting history | Transcript previews removed from logs | Confirm participant notice/consent and define source/summary retention |
| Admin meeting-history addition | Notes and existing history | Merge new meeting note | Scoped to one client | Require human confirmation before replacing canonical history |

## Rules

- Do not add prompts, CV text, documents, transcripts, names, emails or provider bodies
  to logs or error messages.
- Prefer counts, enums and internal IDs in operational telemetry.
- Send the minimum client context required for the specific result.
- Keep a human in the loop for academic recommendations and consequential decisions.
- Never infer sensitive traits beyond the explicit service purpose.
- A new AI flow requires an update to this file and the privacy notice review.
