# API inventory

Generated from `netlify.toml` and static analysis of 66 Netlify Functions.
Scheduled/internal Functions without a redirect are listed with their direct function path. This is an
engineering inventory, not a substitute for runtime or legal review.

| Function | Method | Route | Auth | Role | Input | Validation | OK | Errors (static) | Tables (static) | Integrations |
|---|---|---|---|---|---|---|---|---|---|---|
| admin-assistant | POST | /api/admin/assistant | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, missing_messages, forbidden | career_templates, client_careers, documents, payments, users | Anthropic |
| admin-career-suggestions | GET/POST | /api/admin/career-suggestions | Session cookie | application admin | JSON body + query | origin, JSON, field checks | JSON | bad_origin, unauthorized, forbidden, missing_user_id, client_not_found, invalid_feedback | career_recommendation_feedback, users | Anthropic |
| admin-careers-assign | POST | /api/admin/careers/assign | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_fields, forbidden | career_templates, client_careers, documents, users | none |
| admin-careers-create | POST | /api/admin/careers | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_fields, forbidden, career_not_found | career_templates, client_careers, documents, users | none |
| admin-careers-delete | POST | /api/admin/careers/delete | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, missing_id, forbidden | career_templates, users | none |
| admin-chat | GET/POST | /api/admin/chat | Session cookie | application admin | JSON body + query | origin, JSON, field checks | JSON | bad_origin, unauthorized, forbidden, missing_user_id, client_not_found, empty_message | ai_chat_messages, ai_chat_state, notification_recipients, notifications, users | none |
| admin-client-assign | POST | /api/admin/clients/assign | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_user_id, forbidden, not_found | users, webhook_log | Google Sheets, Holded, Notion |
| admin-clients-all | GET | /api/admin/clients/all | Session cookie | application admin | none | method/auth only | JSON | unauthorized, forbidden | users | none |
| admin-clients-list | GET | /api/admin/clients | Session cookie | application admin | none | method/auth only | JSON | unauthorized, forbidden, portal_access_denied | users | none |
| admin-dashboard | GET | /api/admin/dashboard | Session cookie | application admin | none | method/auth only | JSON | unauthorized, forbidden, portal_access_denied | admin_tasks, bookings, documents, payments, users | Google Calendar/Meet |
| admin-developer-clients | GET/POST | /api/admin/developer-clients | Session cookie | application admin | JSON body + query | origin, JSON, field checks | JSON | bad_origin, unauthorized, developer_admin_required, invalid_update, user_not_found, unknown_column | users | none |
| admin-documents-add | POST | /api/admin/documents/add | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_fields, forbidden, user_not_found | documents, users | none |
| admin-documents-delete | POST | /api/admin/documents/delete | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, missing_id, forbidden | documents, users | none |
| admin-documents-review | POST | /api/admin/documents/review | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_params, forbidden | documents, users | none |
| admin-drive-health | GET | /api/admin/drive-health | Session cookie | application admin | none | field checks | JSON | unauthorized, forbidden, not_configured | users | Google Drive, Google Calendar/Meet |
| admin-drive-rename | GET/POST | /api/admin/drive-rename | Session cookie | application admin | JSON body + query | origin, JSON, field checks | JSON | bad_origin, unauthorized, forbidden, user_not_found, missing_target | users | Google Drive, Google Calendar/Meet, Notion |
| admin-drive-sync | GET/POST | /api/admin/drive-sync | Session cookie | application admin | JSON body + query | origin, JSON, field checks | JSON | bad_origin, unauthorized, forbidden, user_not_found, missing_target | users, webhook_log | Google Drive, Holded |
| admin-historial-add | POST | /api/admin/historial/add | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, missing_user_id, missing_raw_notes, forbidden, user_not_found | users | Anthropic |
| admin-integration-snapshot | GET | /api/admin/integration-snapshot | Session cookie | application admin | none | method/auth only | JSON | unauthorized, forbidden | payments, users, webhook_log | Revolut, Holded |
| admin-notifications | GET/POST | /api/admin/notifications | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | unauthorized, forbidden, bad_origin, missing_title, missing_content, no_recipients | notification_recipients, notifications, users | none |
| admin-payments-add | POST | /api/admin/payments/add | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_user_id, invalid_preset, missing_concept | payments, users, webhook_log | Google Sheets, Holded, Notion |
| admin-payments-delete | POST | /api/admin/payments/delete | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_params, forbidden, not_found | payments, users, webhook_log | Google Sheets, Holded, Notion |
| admin-payments-list | GET | /api/admin/payments | Session cookie | application admin | query | field checks | JSON | unauthorized, missing_user_id, forbidden, user_not_found | payments, users | none |
| admin-payments-set-amount | POST | /api/admin/payments/set-amount | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_params, invalid_amount, forbidden | payments, users, webhook_log | Google Sheets, Holded, Notion |
| admin-payments-set-carreras | POST | /api/admin/payments/set-carreras | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_params, forbidden, user_not_found | payments, users, webhook_log | Google Sheets, Holded, Notion |
| admin-payments-unlock | POST | /api/admin/payments/unlock | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_params, forbidden, user_not_found | payments, users, webhook_log | Resend/email |
| admin-phase-set | POST | /api/admin/phase | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_params, forbidden | users | none |
| admin-tasks | GET/POST | /api/admin/tasks | Session cookie | application admin | JSON body + query | origin, JSON, field checks | JSON | unauthorized, forbidden, bad_origin, missing_title, insert_failed, missing_id | admin_tasks, users | none |
| auth-change-password | POST | /api/auth/change-password | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_fields, weak_password, invalid_credentials | users | none |
| auth-login | POST | /api/auth/login | Public | none | JSON body | origin, JSON, field checks | JSON | bad_origin, invalid_json, missing_fields, invalid_credentials, ambiguous_identity | none detected | none |
| auth-logout | POST | /api/auth/logout | Public/internal | none | none | origin | JSON | bad_origin | none detected | none |
| birthday-notifications | SCHEDULE | cron: 0 6 * * * | Netlify schedule | application admin | none | method/auth only | JSON | not_found, birthday_notifications_failed | birthday_events, notification_recipients, notifications, users, webhook_log | Google Calendar/Meet, Resend/email |
| bookings-availability | GET | /api/bookings/availability | Session cookie | authenticated | query | method/auth only | JSON | unauthorized, user_not_found, no_admin_assigned | users | Google Calendar/Meet |
| bookings-create | POST | /api/bookings/create | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_start_at, invalid_duration, start_in_past, user_not_found | bookings, career_templates, client_careers, documents, payments, users, webhook_log | Google Calendar/Meet, Anthropic, Resend/email |
| bookings-list | GET | /api/bookings | Session cookie | application admin | query | method/auth only | JSON | unauthorized | bookings, users | none |
| careers-list | GET | /api/careers | Session cookie | application admin | query | field checks | JSON | unauthorized, invalid_user_id, forbidden | career_templates, client_careers, users | none |
| chat-ai | GET/POST | /api/chat | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, empty_message | ai_chat_messages, ai_chat_state, documents, users | Anthropic |
| chat-cleanup | SCHEDULE | cron: 0 3 * * * | Netlify schedule | provider/system | none | method/auth only | JSON | cleanup_failed | ai_chat_messages, ai_chat_state | none |
| crm-convert | POST | /api/internal/crm/convert | Provider secret/signature | none | JSON body + query | JSON, signature/secret, field checks | JSON | missing_secret_configuration, invalid_secret, invalid_json, parse_error, missing_lead_id, identity_collision | users, webhook_log | Google Drive, Google Sheets, Holded, Resend/email, Notion |
| documents-get | GET | /api/documents/get | Session cookie | application admin | query | ownership, field checks | JSON | unauthorized, missing_id, not_found, forbidden | documents, users | none |
| documents-list | GET | /api/documents<br>/api/admin/documents | Session cookie | application admin | query | field checks | JSON | unauthorized, forbidden | documents, users | none |
| documents-upload-ticket | POST | /api/documents/upload-ticket | Session cookie | application admin | JSON body | origin, JSON, ownership, field checks | JSON | bad_origin, unauthorized, invalid_json, not_found, forbidden, missing_user_id | documents, users | none |
| documents-upload | POST | /api/documents/upload | Session cookie | application admin | JSON body | origin, JSON, ownership, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_fields, not_found, forbidden | career_templates, documents, users, webhook_log | Google Drive, Resend/email |
| faqs | GET/POST | /api/faqs | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | unauthorized, bad_origin, forbidden, invalid_json, builtin_read_only, missing_id | portal_faqs, users | none |
| integration-retry | SCHEDULE | cron: */10 * * * * | Netlify schedule | provider/system | raw/JSON body | field checks | JSON | not_found | payments, users, webhook_log | Google Calendar/Meet, Google Sheets, Holded |
| invoice-pdf | GET | /api/invoice-pdf | Session cookie | authenticated | query | ownership, field checks | PDF | unauthorized, missing_payment_id, not_found, no_holded_invoice, pdf_unavailable, server_error | payments, users, webhook_log | Holded |
| me | GET | /api/me | Session cookie | application admin | none | method/auth only | JSON | unauthorized | users | none |
| meet-health | GET/POST | /api/meet/health | Provider secret/signature | none | query | signature/secret | JSON | server_error/none explicit | none detected | Google Calendar/Meet |
| meet-transcript-poll | SCHEDULE | cron: */15 * * * * | Netlify schedule | provider/system | none | method/auth only | JSON | not_found | bookings, processed_meet_docs, users, webhook_log | Google Drive, Google Calendar/Meet, Anthropic |
| meet-webhook | POST | /api/meet/webhook | Provider secret/signature | provider/system | raw/JSON body + query | signature/secret, field checks | JSON | invalid_json, invalid_pubsub_message, unknown_advisor | bookings, users, webhook_log | Google Drive, Google Calendar/Meet, Anthropic |
| notifications-ack | POST | /api/notifications/ack | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | unauthorized, bad_origin, missing_notification_id, not_found, update_failed | notification_recipients, notifications, users, webhook_log | Resend/email |
| notifications-list | GET | /api/notifications | Session cookie | authenticated | none | method/auth only | JSON | unauthorized | notification_recipients, notifications | none |
| notion-webhook | POST | /api/notion/webhook | Provider secret/signature | provider/system | JSON body + query | JSON, signature/secret, field checks | JSON | missing_secret_configuration, invalid_secret, invalid_json, parse_error, missing_lead_id, identity_collision | users, webhook_log | Google Drive, Google Sheets, Holded, Resend/email, Notion |
| onboarding-checkout | POST | /api/onboarding/checkout | Session cookie | authenticated | none | origin | JSON | bad_origin, unauthorized, payment_provider_not_configured, contract_not_signed, already_paid | payment_attempts, payments, users | Revolut |
| onboarding-contract | POST | /api/onboarding/contract | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_nombre_cliente, missing_dni_cliente, missing_signature | users, webhook_log | Revolut, Google Sheets, Holded, Resend/email, Notion |
| onboarding-dni-extract | POST | /api/onboarding/dni/extract | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_action | users | Revolut |
| onboarding-dni-save | POST | /api/onboarding/dni/save | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, missing_fields, invalid_birthdate, invalid_student_phone | users | Revolut, Google Drive, Google Calendar/Meet |
| onboarding-origin | POST | /api/onboarding/origin | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_origin, invalid_level, missing_pais | users | none |
| onboarding-profile | POST | /api/onboarding/profile | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, invalid_email, missing_intereses, invalid_intereses | users, webhook_log | Google Sheets, Holded, Notion |
| onboarding-state | GET | /api/onboarding/state | Session cookie | authenticated | none | method/auth only | JSON | unauthorized | users | none |
| payments-checkout | POST | /api/payments/checkout | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, payment_provider_not_configured, invalid_json, invalid_installment, not_found | payment_attempts, payments, users | Revolut |
| payments-list | GET | /api/payments | Session cookie | authenticated | none | method/auth only | JSON | unauthorized | payments, users | none |
| payments-verify | POST | /api/payments/verify | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, revolut_not_configured, not_found, invalid_payment_reference | payment_attempts, payments, users | Revolut |
| profile-avatar | POST | /api/profile/avatar | Session cookie | authenticated | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json | users | none |
| profile-lived-abroad | POST | /api/profile/lived-abroad | Session cookie | application admin | JSON body | origin, JSON, field checks | JSON | bad_origin, unauthorized, invalid_json, forbidden, locked, invalid_country | users | none |
| revolut-webhook | POST | /api/revolut/webhook | Provider secret/signature | provider/system | raw/JSON body | origin, signature/secret, field checks | HTTP response | server_error/none explicit | payment_attempts, payments, users, webhook_log | Revolut |

## Maintenance

Regenerate after adding/removing a Function or redirect:

```bash
node scripts/generate-api-inventory.js
```

Review the diff manually: auth/role and free-form validation are conservative static inferences.
