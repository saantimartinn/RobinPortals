# Frontend component map

Generated from 44 focused frontend modules: 90 top-level functions/components.
Props, state, API calls and child components are static approximations and must be reviewed with behavioral changes.
Module sizes are UTF-8 bytes after normalizing line endings to LF for cross-platform reproducibility.

| Name | Module | Domain | Props/args | Local state | API calls | Child components | Line |
|---|---|---|---|---|---|---|---:|
| nextOnboardingStep | app.jsx | app/auth | user | none | none | none | 36 |
| sendNativeAuthEvent | app.jsx | app/auth | payload | none | none | none | 46 |
| PortalRobin | app.jsx | app/auth | none | authState, onboardingOverride, active, subscriptionAccess, checkingSubscriptionAccess, subscriptionAccessResolved, entryNotice, reportOpen, introOpen, resetToken | apiLogin, apiLogout, apiMe, issueSsoTicket, onboardingState, paymentsVerify | SupportDialogs, ResetPasswordScreen, LoginScreen, CrossPortalNav, AdminPortal, OnboardingNavContext, Step, PortalShell | 50 |
| LoginScreen | app.jsx | app/auth | { onLogin } | email, password, error, loading, recoveryOpen, biometryName | none | RecoveryRequest | 364 |
| AdminPerfilAcademico | application/admin/academic.jsx | shared/application | { client } | none | none | Card, CardHeader, CardContent, Badge | 8 |
| AdminCarrerasNew | application/admin/AdminCarrerasNew.jsx | shared/application | { client } | library, assigned, loading, error, cName, cUni, cCity, cLevel, cDocs, editingId | adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign | Card, CardHeader, Btn, CardContent, Field, Divider, CareerRequirementsTimeline | 10 |
| AdminChatAssistant | application/admin/AdminChatAssistant.jsx | shared/application | { user, activeClientId, clients, mascot } | mode, messages, draft, busy, error, notesOpen, notesText, notesUserId, notesTitle, notesBusy | adminAssistant, adminHistorialAdd | Btn | 8 |
| AdminDocumentosNew | application/admin/AdminDocumentosNew.jsx | shared/application | { client } | docs, loading, error, busyId, newName, newRequired, newTemplate | documentsGet, adminDocumentsList, adminDocumentsReview, adminDocumentsAdd, adminDocumentsDelete | Card, CardHeader, CardContent, Field, Btn, Badge | 8 |
| AdminPagos | application/admin/AdminPagos.jsx | shared/application | { client } | data, loading, error, busyId, facturaOpen, facturaPayment, now, xConcept, xAmount, xPreset | adminPaymentsList, adminPaymentsUnlock, adminPaymentsSetAmount, adminPaymentsSetCarreras, adminPaymentsAdd, adminPaymentsDelete | Card, CardHeader, CardContent, Btn, PaymentStatusBadge, Field, Factura | 13 |
| AdminReservas | application/admin/AdminReservas.jsx | shared/application | { client } | bookings, loading, error, busyId, refreshKey | bookingsList, bookingsCancel | Card, CardHeader, CardContent, Badge | 8 |
| ClientAvatar | application/admin/ClientAvatar.jsx | shared/application | { nombre, apellidos, size = "md" } | none | none | none | 4 |
| FolderedClients | application/admin/clientManagement.jsx | shared/application | { clients, totalCount, onSelect, onConverted } | data, selectedId, name, busy, error, dragOver | none | ClientAvatar, Badge, ConvertMentoria | 12 |
| AdminClientesList | application/admin/clientManagement.jsx | shared/application | { clients, totalCount, searchQ, onSearch, onSelect, onConverted, loading, loadError, onOpenAssign } | none | none | Card, CardHeader, Badge, Btn, CardContent, FolderedClients | 46 |
| AssignClientModal | application/admin/clientManagement.jsx | shared/application | { adminEmail, list, loading, error, busyId, onAssign, onClose } | q | none | ClientAvatar, Badge, Btn | 86 |
| ConvertMentoria | application/admin/ConvertMentoria.jsx | shared/application | { client, onConverted } | open, targetType, busy, error | none | none | 4 |
| AdminDashboard | application/admin/dashboard.jsx | shared/application | { user, onOpenClient, onOpenAssign, onGotoTab } | loading, error, data, alertSort, taskTitle, taskBusy, taskComposerOpen, refreshKey, bookingBusyId | adminDashboard, adminTaskCreate, bookingsCancel | Card, CardContent, Btn, KpiCard, CardHeader, Badge, Row, Divider | 11 |
| AdminNotificaciones | application/admin/notifications.jsx | shared/application | { adminId, clients } | title, content, type, scope, selected, allClients, loadingAll, busy, feedback, error | adminListAllClients, adminNotificationsList, adminNotificationCreate | Badge, Card, CardHeader, CardContent, Field, TextareaField, Btn | 10 |
| AdminPerfil | application/admin/profile.jsx | shared/application | { client, onRefresh } | sugg, suggLoading, suggErr, regening, feedbackBusy, showQ | adminCareerSuggestions, adminCareerSuggestionsRegenerate, adminCareerSuggestionFeedback | Card, CardHeader, CardContent, ConvertMentoria, Badge, LivedAbroadCard, Btn | 10 |
| formatBirthDate | application/admin/profile.jsx | shared/application | value | none | none | none | 319 |
| birthdayIsToday | application/admin/profile.jsx | shared/application | value | none | none | none | 326 |
| AdminEstadoFases | application/admin/progress.jsx | shared/application | { client, onChangedPhase } | phase, busy, error | adminPhaseSet | ClientAvatar, Card, CardHeader, CardContent | 10 |
| AdminChatIA | application/AdminChatIA.jsx | shared/application | { client } | messages, aiPaused, draft, loading, busy, error | adminChatList, adminChatSend, adminChatResume | Card, CardHeader, CardContent, Btn | 10 |
| normalizeAdminClient | application/AdminPortal.jsx | application/admin | apiClient, adminId | none | none | none | 70 |
| AdminPortal | application/AdminPortal.jsx | application/admin | { user } | data, mascot, searchQ, loadingClients, loadError, assignOpen, assignList, assignLoading, assignError, assignBusyId | adminListClients, adminListAllClients, adminAssignClient | AdminWorkspace, AdminDashboard, AdminClientesList, AdminEstadoFases, AdminPerfil, AdminCarrerasNew, AdminDocumentosNew, AdminChatIA, AdminReservas, AdminPerfilAcademico | 103 |
| adminName | application/AdminWorkspace.jsx | shared/application | user | none | none | none | 26 |
| AdminWorkspace | application/AdminWorkspace.jsx | shared/application | { user, active, client, clients, loading, error, onNavigate, onSwitchClient, isDeveloper = false, children } | pickerOpen | none | Icon, ClientPicker | 32 |
| ClientPicker | application/AdminWorkspace.jsx | shared/application | { clients, selectedId, onSelect, onClose, returnRef } | query | none | none | 74 |
| PortalShell | application/ApplicationPortals.jsx | application/client | { user, clientName, active, setActive, onUserRefresh } | profilePhoto, photoBusy, photoError, chatOpen, mascot, summary | documentsList, bookingsList, profileAvatarUpload | NotificationPopup, Icon, AnimatePresence, Estado, Perfil, CarrerasCliente, DocumentosCliente, Reservas, PagosCliente, FaqsPage | 50 |
| Reservas | application/BookingsPortal.jsx | shared/application | none | serverBookings, loading, error, busy, cancellingId, refreshKey, lastCreated, avDays, avLoading, advisorName | bookingsList, bookingsCreate, bookingsCancel, bookingsAvailability | Card, CardHeader, CardContent, Btn, Badge | 8 |
| careerTimelineItems | application/careers/CareerRequirementsTimeline.jsx | shared/application | careers = [] | none | none | none | 7 |
| formatDeadline | application/careers/CareerRequirementsTimeline.jsx | shared/application | value | none | none | none | 24 |
| CareerRequirementsTimeline | application/careers/CareerRequirementsTimeline.jsx | shared/application | { careers = [], title = "Timeline de requerimientos" } | none | none | Card, CardHeader, CardContent, Icon, Badge | 31 |
| PagosCliente | application/ClientSections.jsx | application/payments | none | data, loading, loadError, facturaOpen, facturaPayment, payBusy | paymentsList, paymentsCheckout | Card, CardHeader, CardContent, PaymentStatusBadge, Btn, Factura | 16 |
| CarrerasCliente | application/ClientSections.jsx | application/careers | none | careers, loading, error | careersListMine | Card, CardHeader, CardContent, Badge, CareerRequirementsTimeline | 123 |
| DocumentosCliente | application/ClientSections.jsx | application/documents | none | docs, careers, loading, error, careerError, uploadingId, documentsResult | careersListMine, documentsList, documentsGet, documentsUpload | Badge, Btn, Card, CardHeader, CardContent | 180 |
| CrossPortalNav | application/CrossPortalNav.jsx | shared/application | { current = "application", user = null, onLogout, onRefresh, onReportProblem, hasSubscriptionAccess = false, checkingSubscriptionAccess = false, entryNotice = "" } | notice | none | none | 12 |
| display | application/DeveloperClientsTable.jsx | shared/application | value | none | none | none | 6 |
| parseValue | application/DeveloperClientsTable.jsx | shared/application | text, original | none | none | none | 11 |
| DeveloperClientsTable | application/DeveloperClientsTable.jsx | shared/application | none | page, rows, total, pageSize, busy, error, editing | adminDeveloperClients, adminDeveloperClientUpdate | none | 25 |
| buildDefaultDocs | application/documents/document-utils.js | application/documents | level | none | none | none | 29 |
| statusLabel | application/documents/document-utils.js | application/documents | status | none | none | none | 47 |
| normalizeDocumentName | application/documents/document-utils.js | application/documents | value | none | none | none | 54 |
| groupStudentDocumentsByCareer | application/documents/document-utils.js | application/documents | documents = [], careers = [] | none | none | none | 63 |
| newCareerRequirement | application/documents/document-utils.js | application/documents | type = 'document' | none | none | none | 95 |
| normalizeCareerRequirement | application/documents/document-utils.js | application/documents | requirement = {} | none | none | none | 109 |
| FaqsPage | application/Faqs.jsx | shared/application | none | faqs | faqsList | Card, CardContent | 7 |
| AdminFaqManager | application/Faqs.jsx | shared/application | none | faqs | faqsList, adminFaqMutate | Btn, Card, CardHeader, CardContent, Field, TextareaField, Badge | 29 |
| OnboardingContract | application/onboarding/contract.jsx | application/onboarding | { user, onLogout, onDone } | nombreCliente, dniCliente, selectedExtras, agree, sigDataUrl, busy, error | contractSave | OnboardingShell, Hl, FieldReadOnly, Field, SignaturePad, Btn | 14 |
| renderContractBlock | application/onboarding/contract.jsx | application/onboarding | b, i, values | none | none | none | 236 |
| renderContractText | application/onboarding/contract.jsx | application/onboarding | text, values | none | none | Hl | 257 |
| Hl | application/onboarding/contract.jsx | application/onboarding | { children } | none | none | none | 267 |
| FieldReadOnly | application/onboarding/contract.jsx | application/onboarding | { label, value } | none | none | none | 275 |
| SignaturePad | application/onboarding/contract.jsx | application/onboarding | { onChange } | drawing, empty | none | none | 284 |
| OnboardingDNI | application/onboarding/dni.jsx | application/onboarding | { user, onLogout, onDone } | anverso, reverso, aPreview, rPreview, phase, manualEntry, error, busy, fields | dniExtract, dniSave | OnboardingShell, UploadSlot, Btn, Field | 9 |
| UploadSlot | application/onboarding/dni.jsx | application/onboarding | { label, preview, onPick } | none | none | none | 145 |
| OnboardingShell | application/onboarding/onboarding-shared.jsx | application/onboarding | { user, title, subtitle, stepNumber, totalSteps = STEPS.length, onLogout, fullscreen = false, children } | none | none | none | 12 |
| SpainFlag | application/onboarding/origin.jsx | application/onboarding | { className } | none | none | none | 11 |
| OnboardingOrigin | application/onboarding/origin.jsx | application/onboarding | { user, onLogout, onDone } | origin, level, pais, hasEu, screen, error, busy | originSave | Ic, OnboardingShell, Choice, Field, Btn | 20 |
| OnboardingPayment | application/onboarding/payment.jsx | application/onboarding | { user, onLogout, onDone } | busy, error, confirming | onboardingCheckout | OnboardingShell, Btn | 10 |
| OnboardingProfile | application/onboarding/profile.jsx | application/onboarding | { user, onLogout, onDone } | email, intereses, answers, academicSystem, academicSubjects, screen, error, busy | profileSave | OnboardingShell, Field, QuestionField, Btn | 15 |
| initQuestionnaireAnswers | application/onboarding/questionnaire-fields.jsx | application/onboarding | none | none | none | none | 6 |
| qOptLabel | application/onboarding/questionnaire-fields.jsx | application/onboarding | options, v | none | none | none | 15 |
| qFmtSlider | application/onboarding/questionnaire-fields.jsx | application/onboarding | def, val | none | none | none | 21 |
| QuestionField | application/onboarding/questionnaire-fields.jsx | application/onboarding | { def, value, onChange } | none | none | QSlider, QChoiceGrid | 27 |
| QSlider | application/onboarding/questionnaire-fields.jsx | application/onboarding | { value, min, max, step, left, right, suffix, onChange } | none | none | none | 54 |
| QChoiceGrid | application/onboarding/questionnaire-fields.jsx | application/onboarding | { options, value, multi, max, onChange } | none | none | none | 70 |
| Factura | application/payments/InvoiceReceipt.jsx | application/payments | { open, onClose, user, payment } | none | none | Btn | 9 |
| eur | application/payments/payment-utils.jsx | application/payments | value | none | none | none | 5 |
| daysBetween | application/payments/payment-utils.jsx | application/payments | startIso, endIso | none | none | none | 12 |
| PaymentStatusBadge | application/payments/payment-utils.jsx | application/payments | { status } | none | none | Badge | 18 |
| paymentTitle | application/payments/payment-utils.jsx | application/payments | payment, total | none | none | none | 24 |
| StudentAssistant | application/PortalAssistant.jsx | shared/application | { open, onOpenChange, mascot, onOpenFaq } | none | none | ChatIA | 8 |
| ChatIA | application/PortalAssistant.jsx | shared/application | { active, mascot, onOpenFaq } | messages, aiPaused, draft, loading, sending, error | chatAiList, chatAiSend | none | 40 |
| Perfil | application/StudentProfile.jsx | shared/application | { user, clientName, profilePhoto, onPhotoChange, photoBusy, photoError, intereses, onUserRefresh } | none | none | Card, CardContent, Badge, LivedAbroadCard, ChangePasswordCard | 10 |
| ChangePasswordCard | application/StudentProfile.jsx | shared/application | none | open, current, next, confirm, busy, error, success | changePassword | Card, CardHeader, CardContent, Btn | 82 |
| LivedAbroadCard | application/StudentProfile.jsx | shared/application | { value, editable, onSaved, userId } | lived, country, other, busy, savedAt, error | livedAbroadSave | Card, CardHeader, CardContent, Field, Btn | 133 |
| Estado | application/StudentStatus.jsx | shared/application | { step, onNavigate, docsPendingCount, bookingsCount } | none | none | Icon, Card, CardHeader, CardContent | 8 |
| reportClientError | client-utils.js | shared/application | operation, error | none | none | none | 2 |
| formatTime | client-utils.js | shared/application | date | none | none | none | 10 |
| formatDate | client-utils.js | shared/application | d | none | none | none | 18 |
| formatMoney | client-utils.js | shared/application | amount, currency | none | none | none | 24 |
| resizeImageFile | client-utils.js | shared/application | file, max = 256 | none | none | none | 31 |
| KpiCard | shared/PortalWidgets.jsx | shared/application | { icon: Icon, label, value, sub, tone = "navy" } | none | none | Icon | 10 |
| Row | shared/PortalWidgets.jsx | shared/application | { label, value, tone = "slate" } | none | none | none | 28 |
| BirthdayConfetti | shared/PortalWidgets.jsx | shared/application | none | none | none | none | 40 |
| NotificationPopup | shared/PortalWidgets.jsx | shared/application | none | queue, idx, busy, loaded | notificationAck, notificationsPending | BirthdayConfetti, Btn | 58 |
| RecoveryRequest | support/PasswordRecovery.jsx | shared/application | { onClose } | identifier, busy, sent, error | passwordResetRequest | Modal | 6 |
| ResetPasswordScreen | support/PasswordRecovery.jsx | shared/application | { token } | password, confirm, busy, done, error | passwordResetConfirm | none | 44 |
| Modal | support/SupportDialogs.jsx | shared/application | { title, onClose, children, className = "" } | none | none | none | 7 |
| SupportDialogs | support/SupportDialogs.jsx | shared/application | { user, reportOpen, onCloseReport, introOpen, onCloseIntro, onOpenReport } | kind, email, message, busy, sent, error, website | none | Modal | 21 |

## Modules

| Module | Bytes | Responsibility |
|---|---:|---|
| app.jsx | 18718 | composition root and authentication screens |
| application/admin/academic.jsx | 3165 | focused frontend component module |
| application/admin/AdminCarrerasNew.jsx | 13314 | focused frontend component module |
| application/admin/AdminChatAssistant.jsx | 9615 | focused frontend component module |
| application/admin/AdminDocumentosNew.jsx | 7224 | focused frontend component module |
| application/admin/AdminPagos.jsx | 15714 | focused frontend component module |
| application/admin/AdminReservas.jsx | 5912 | focused frontend component module |
| application/admin/ClientAvatar.jsx | 582 | focused frontend component module |
| application/admin/clientManagement.jsx | 11856 | focused frontend component module |
| application/admin/ConvertMentoria.jsx | 3042 | focused frontend component module |
| application/admin/dashboard.jsx | 20185 | focused frontend component module |
| application/admin/notifications.jsx | 13057 | focused frontend component module |
| application/admin/profile.jsx | 17100 | focused frontend component module |
| application/admin/progress.jsx | 3510 | focused frontend component module |
| application/AdminChatIA.jsx | 6040 | focused frontend component module |
| application/AdminPortal.jsx | 13923 | advisor portal and application administration |
| application/AdminWorkspace.jsx | 7764 | focused frontend component module |
| application/ApplicationPortals.jsx | 9490 | application client portal composition |
| application/BookingsPortal.jsx | 11407 | focused frontend component module |
| application/careers/CareerRequirementsTimeline.jsx | 3405 | focused frontend component module |
| application/ClientSections.jsx | 15109 | client payments, careers and documents |
| application/CrossPortalNav.jsx | 3965 | focused frontend component module |
| application/DeveloperClientsTable.jsx | 4387 | focused frontend component module |
| application/documents/document-utils.js | 4635 | document phases, defaults and status mapping |
| application/Faqs.jsx | 6436 | focused frontend component module |
| application/onboarding/contract.jsx | 15243 | application onboarding flow |
| application/onboarding/dni.jsx | 8828 | application onboarding flow |
| application/onboarding/onboarding-shared.jsx | 3663 | application onboarding flow |
| application/onboarding/OnboardingFlow.jsx | 336 | application onboarding flow |
| application/onboarding/origin.jsx | 7338 | application onboarding flow |
| application/onboarding/payment.jsx | 4734 | application onboarding flow |
| application/onboarding/profile.jsx | 16009 | application onboarding flow |
| application/onboarding/questionnaire-fields.jsx | 4509 | application onboarding flow |
| application/payments/InvoiceReceipt.jsx | 4801 | printable payment receipt |
| application/payments/payment-utils.jsx | 934 | payment formatting and status UI |
| application/PortalAssistant.jsx | 8385 | focused frontend component module |
| application/StudentProfile.jsx | 11853 | focused frontend component module |
| application/StudentStatus.jsx | 4476 | focused frontend component module |
| client-utils.js | 1934 | browser-safe formatting, logging and image helpers |
| main.jsx | 962 | focused frontend component module |
| shared/PortalWidgets.jsx | 5956 | widgets shared by both authenticated portals |
| support/PasswordRecovery.jsx | 4467 | focused frontend component module |
| support/SupportDialogs.jsx | 5338 | focused frontend component module |
| ui.jsx | 4908 | focused frontend component module |

Regenerate with `node scripts/generate-component-map.js`.
