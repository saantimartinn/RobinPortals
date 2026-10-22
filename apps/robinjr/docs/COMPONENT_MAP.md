# Frontend component map

Generated from 42 focused frontend modules: 84 top-level functions/components.
Props, state, API calls and child components are static approximations and must be reviewed with behavioral changes.
Module sizes are UTF-8 bytes after normalizing line endings to LF for cross-platform reproducibility.

| Name | Module | Domain | Props/args | Local state | API calls | Child components | Line |
|---|---|---|---|---|---|---|---:|
| nextOnboardingStep | app.jsx | app/auth | user | none | none | none | 29 |
| PortalRobin | app.jsx | app/auth | none | authState, active, selectedPortal | apiLogin, apiLogout, apiMe, onboardingState, paymentsVerify | PortalSelector, LoginScreen, CrossPortalNav, AdminPortal, OnboardingOrigin, OnboardingDNI, OnboardingContract, OnboardingPayment, OnboardingProfile, PortalShell | 39 |
| AuthShell | app.jsx | app/auth | { children } | none | none | none | 171 |
| PortalSelector | app.jsx | app/auth | { onSelectPortal } | none | none | AuthShell, Icon | 227 |
| LoginScreen | app.jsx | app/auth | { onLogin, onBack } | email, password, error, loading | none | AuthShell, Field, Btn | 267 |
| AdminPerfilAcademico | application/admin/academic.jsx | shared/application | { client } | none | none | Card, CardHeader, CardContent, Badge | 8 |
| AdminCarrerasNew | application/admin/AdminCarrerasNew.jsx | shared/application | { client } | library, assigned, loading, error, formOpen, cName, cArea, cDescription, cSubjects, cRequirements | adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign | Card, CardHeader, Btn, CardContent, Field, TextareaField | 9 |
| AdminChatAssistant | application/admin/AdminChatAssistant.jsx | shared/application | { user, activeClientId, clients, mascot } | mode, messages, draft, busy, error, notesOpen, notesText, notesUserId, notesTitle, notesBusy | adminAssistant, adminHistorialAdd | Btn | 8 |
| AdminDocumentosNew | application/admin/AdminDocumentosNew.jsx | shared/application | { client } | docs, loading, error, busyId, newName, newDeadline, newRequired, newTemplate, deadlines | documentsGet, adminDocumentsList, adminDocumentsReview, adminDocumentsAdd, adminDocumentsDelete, adminDocumentsSetDeadline | Card, CardHeader, CardContent, Field, Btn, Badge | 8 |
| AdminPagos | application/admin/AdminPagos.jsx | shared/application | { client } | data, loading, error, busyId, facturaOpen, facturaPayment, now, xConcept, xAmount, xPreset | adminPaymentsList, adminPaymentsUnlock, adminPaymentsAdd, adminPaymentsDelete | Card, CardHeader, CardContent, PaymentStatusBadge, Btn, Field, Factura | 10 |
| AdminReservas | application/admin/AdminReservas.jsx | shared/application | { client } | bookings, loading, error | bookingsList | Card, CardHeader, CardContent, Badge | 8 |
| ClientAvatar | application/admin/ClientAvatar.jsx | shared/application | { nombre, apellidos, size = "md" } | none | none | none | 4 |
| AdminClientesList | application/admin/clientManagement.jsx | shared/application | { clients, totalCount, searchQ, onSearch, onSelect, loading, loadError, onOpenAssign } | none | none | Card, CardHeader, Badge, Btn, CardContent, ClientAvatar | 8 |
| AssignClientModal | application/admin/clientManagement.jsx | shared/application | { adminEmail, list, loading, error, busyId, onAssign, onClose } | q | none | ClientAvatar, Badge, Btn | 76 |
| AdminDashboard | application/admin/dashboard.jsx | shared/application | { user, onOpenClient, onOpenAssign, onGotoTab } | loading, error, data, alertSort, taskTitle, taskBusy, taskComposerOpen, refreshKey | adminDashboard, adminTaskCreate | Card, CardContent, Btn, KpiCard, CardHeader, Badge, Row, Divider | 11 |
| AdminNotificaciones | application/admin/notifications.jsx | shared/application | { adminId, clients } | title, content, type, scope, selected, allClients, loadingAll, busy, feedback, error | adminListAllClients, adminNotificationsList, adminNotificationCreate | Badge, Card, CardHeader, CardContent, Field, TextareaField, Btn | 10 |
| AdminPerfil | application/admin/profile.jsx | shared/application | { client, onRefresh } | sugg, suggLoading, suggErr, regening, feedbackBusy, showQ | adminCareerSuggestions, adminCareerSuggestionsRegenerate, adminCareerSuggestionFeedback | Card, CardHeader, CardContent, Badge, LivedAbroadCard, Btn | 9 |
| formatBirthDate | application/admin/profile.jsx | shared/application | value | none | none | none | 300 |
| birthdayIsToday | application/admin/profile.jsx | shared/application | value | none | none | none | 307 |
| AdminEstadoFases | application/admin/progress.jsx | shared/application | { client, onChangedPhase } | phase, busy, error | adminPhaseSet | ClientAvatar, Card, CardHeader, CardContent | 10 |
| AdminChatIA | application/AdminChatIA.jsx | shared/application | { client } | messages, aiPaused, draft, loading, busy, error | adminChatList, adminChatSend, adminChatResume | Card, CardHeader, CardContent, Btn | 10 |
| normalizeAdminClient | application/AdminPortal.jsx | application/admin | apiClient, adminId | none | none | none | 70 |
| AdminPortal | application/AdminPortal.jsx | application/admin | { user } | data, mascot, searchQ, loadingClients, loadError, assignOpen, assignList, assignLoading, assignError, assignBusyId | adminListClients, adminListAllClients, adminAssignClient | AdminWorkspace, AdminDashboard, AdminClientesList, AdminEstadoFases, AdminPerfil, AdminCarrerasNew, AdminDocumentosNew, AdminChatIA, AdminReservas, AdminPerfilAcademico | 103 |
| AdminWorkspace | application/AdminWorkspace.jsx | shared/application | { active, client, clients, loading, error, onNavigate, onSwitchClient, isDeveloper = false, children } | pickerOpen | none | Icon, ClientPicker | 25 |
| ClientPicker | application/AdminWorkspace.jsx | shared/application | { clients, selectedId, onSelect, onClose, returnRef } | query | none | none | 66 |
| PortalShell | application/ApplicationPortals.jsx | application/client | { user, clientName, onLogout, active, setActive, onUserRefresh } | profilePhoto, photoBusy, photoError, chatOpen, mascot, summary | documentsList, bookingsList, profileAvatarUpload | NotificationPopup, Icon, AnimatePresence, Estado, StudentPlanCalendar, Perfil, CarrerasCliente, DocumentosCliente, Reservas, PagosCliente | 53 |
| Reservas | application/BookingsPortal.jsx | shared/application | none | serverBookings, loading, error, busy, refreshKey, lastCreated, avDays, avLoading, advisorName, calendarConnected | bookingsList, bookingsCreate, bookingsAvailability | Card, CardHeader, CardContent, Btn, Badge | 8 |
| careerTimelineItems | application/careers/CareerRequirementsTimeline.jsx | shared/application | careers = [] | none | none | none | 8 |
| formatDeadline | application/careers/CareerRequirementsTimeline.jsx | shared/application | value | none | none | none | 25 |
| CareerRequirementsTimeline | application/careers/CareerRequirementsTimeline.jsx | shared/application | { careers = [], title = "Requisitos de carrera" } | none | none | Card, CardHeader, CardContent, Icon, Badge | 32 |
| PagosCliente | application/ClientSections.jsx | application/payments | none | data, loading, loadError, facturaOpen, facturaPayment, payBusy | paymentsList, paymentsCheckout | Card, CardHeader, CardContent, PaymentStatusBadge, Btn, Factura | 14 |
| CarrerasCliente | application/ClientSections.jsx | application/careers | none | careers, selectedCareer, loading, error | careersListMine | Card, CardHeader, CardContent, Badge | 123 |
| DocumentosCliente | application/ClientSections.jsx | application/documents | none | docs, loading, error, uploadingId | documentsList, documentsGet, documentsUpload | Badge, Btn, Card, CardHeader, CardContent | 218 |
| CrossPortalNav | application/CrossPortalNav.jsx | shared/application | { current = "application", user = null, onLogout, onRefresh } | none | none | none | 17 |
| display | application/DeveloperClientsTable.jsx | shared/application | value | none | none | none | 6 |
| parseValue | application/DeveloperClientsTable.jsx | shared/application | text, original | none | none | none | 11 |
| DeveloperClientsTable | application/DeveloperClientsTable.jsx | shared/application | none | page, rows, total, pageSize, busy, error, editing | adminDeveloperClients, adminDeveloperClientUpdate | none | 25 |
| buildDefaultDocs | application/documents/document-utils.js | application/documents | level | none | none | none | 21 |
| statusLabel | application/documents/document-utils.js | application/documents | status | none | none | none | 39 |
| newCareerRequirement | application/documents/document-utils.js | application/documents | type = 'document' | none | none | none | 46 |
| normalizeCareerRequirement | application/documents/document-utils.js | application/documents | requirement = {} | none | none | none | 60 |
| FaqsPage | application/Faqs.jsx | shared/application | none | faqs | faqsList | Card, CardContent | 7 |
| AdminFaqManager | application/Faqs.jsx | shared/application | none | faqs | faqsList, adminFaqMutate | Btn, Card, CardHeader, CardContent, Field, TextareaField, Badge | 29 |
| OnboardingContract | application/onboarding/contract.jsx | application/onboarding | { user, onLogout, onDone } | nombreCliente, dniCliente, selectedExtras, agree, sigDataUrl, busy, error | contractSave | OnboardingShell, Hl, FieldReadOnly, Field, SignaturePad, Btn | 14 |
| renderContractBlock | application/onboarding/contract.jsx | application/onboarding | b, i, values | none | none | none | 235 |
| renderContractText | application/onboarding/contract.jsx | application/onboarding | text, values | none | none | Hl | 256 |
| Hl | application/onboarding/contract.jsx | application/onboarding | { children } | none | none | none | 266 |
| FieldReadOnly | application/onboarding/contract.jsx | application/onboarding | { label, value } | none | none | none | 274 |
| SignaturePad | application/onboarding/contract.jsx | application/onboarding | { onChange } | drawing, empty | none | none | 283 |
| OnboardingDNI | application/onboarding/dni.jsx | application/onboarding | { user, onLogout, onDone } | anverso, reverso, aPreview, rPreview, phase, error, busy, fields | dniExtract, dniSave | OnboardingShell, UploadSlot, Btn, Field | 9 |
| UploadSlot | application/onboarding/dni.jsx | application/onboarding | { label, preview, onPick } | none | none | none | 142 |
| OnboardingShell | application/onboarding/onboarding-shared.jsx | application/onboarding | { title, subtitle, stepNumber, totalSteps = 5, icon, onLogout, children } | none | none | Stepper | 6 |
| Stepper | application/onboarding/onboarding-shared.jsx | application/onboarding | { current, total = 3 } | none | none | none | 58 |
| OnboardingOrigin | application/onboarding/origin.jsx | application/onboarding | { user, onLogout, onDone } | origin, level, pais, hasEu, screen, error, busy | originSave | Ic, OnboardingShell, Choice, Field, Btn | 9 |
| OnboardingPayment | application/onboarding/payment.jsx | application/onboarding | { user, onLogout, onDone } | busy, error, confirming | onboardingCheckout | OnboardingShell, Btn | 10 |
| OnboardingProfile | application/onboarding/profile.jsx | application/onboarding | { user, onLogout, onDone } | email, intereses, answers, academicSystem, academicSubjects, screen, error, busy | profileSave | OnboardingShell, Field, QuestionField, Btn | 14 |
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
| makePlanItems | application/StudentPlanCalendar.jsx | shared/application | bookings, documents | none | none | none | 12 |
| formatSelectedDate | application/StudentPlanCalendar.jsx | shared/application | value | none | none | none | 38 |
| StudentPlanCalendar | application/StudentPlanCalendar.jsx | shared/application | none | items, loading, error, month, selectedDate | bookingsList, documentsList | Card, CardHeader, CardContent, Icon, Badge | 44 |
| Perfil | application/StudentProfile.jsx | shared/application | { user, clientName, profilePhoto, onPhotoChange, photoBusy, photoError, intereses, onUserRefresh } | none | none | Card, CardContent, Badge, LivedAbroadCard | 10 |
| LivedAbroadCard | application/StudentProfile.jsx | shared/application | { value, editable, onSaved, userId } | lived, country, other, busy, savedAt, error | livedAbroadSave | Card, CardHeader, CardContent, Field, Btn | 80 |
| Estado | application/StudentStatus.jsx | shared/application | { step, onNavigate, docsPendingCount, bookingsCount } | none | none | Icon, Card, CardHeader, CardContent | 8 |
| reportClientError | client-utils.js | shared/application | operation, error | none | none | none | 2 |
| formatTime | client-utils.js | shared/application | date | none | none | none | 10 |
| formatDate | client-utils.js | shared/application | d | none | none | none | 18 |
| formatMoney | client-utils.js | shared/application | amount, currency | none | none | none | 24 |
| resizeImageFile | client-utils.js | shared/application | file, max = 256 | none | none | none | 31 |
| KpiCard | shared/PortalWidgets.jsx | shared/application | { icon: Icon, label, value, sub, tone = "navy" } | none | none | Icon | 10 |
| Row | shared/PortalWidgets.jsx | shared/application | { label, value, tone = "slate" } | none | none | none | 26 |
| BirthdayConfetti | shared/PortalWidgets.jsx | shared/application | none | none | none | none | 38 |
| NotificationPopup | shared/PortalWidgets.jsx | shared/application | none | queue, idx, busy, loaded | notificationAck, notificationsPending | BirthdayConfetti, Btn | 56 |

## Modules

| Module | Bytes | Responsibility |
|---|---:|---|
| app.jsx | 13975 | composition root and authentication screens |
| application/admin/academic.jsx | 3165 | focused frontend component module |
| application/admin/AdminCarrerasNew.jsx | 11234 | focused frontend component module |
| application/admin/AdminChatAssistant.jsx | 9695 | focused frontend component module |
| application/admin/AdminDocumentosNew.jsx | 9172 | focused frontend component module |
| application/admin/AdminPagos.jsx | 11643 | focused frontend component module |
| application/admin/AdminReservas.jsx | 4255 | focused frontend component module |
| application/admin/ClientAvatar.jsx | 626 | focused frontend component module |
| application/admin/clientManagement.jsx | 7465 | focused frontend component module |
| application/admin/dashboard.jsx | 18436 | focused frontend component module |
| application/admin/notifications.jsx | 13099 | focused frontend component module |
| application/admin/profile.jsx | 15737 | focused frontend component module |
| application/admin/progress.jsx | 3570 | focused frontend component module |
| application/AdminChatIA.jsx | 6036 | focused frontend component module |
| application/AdminPortal.jsx | 13867 | advisor portal and application administration |
| application/AdminWorkspace.jsx | 7350 | focused frontend component module |
| application/ApplicationPortals.jsx | 10515 | application client portal composition |
| application/BookingsPortal.jsx | 10006 | focused frontend component module |
| application/careers/CareerRequirementsTimeline.jsx | 3439 | legacy module; not mounted in the active Robin Jr portal |
| application/ClientSections.jsx | 17083 | client payments, careers and documents |
| application/CrossPortalNav.jsx | 2311 | focused frontend component module |
| application/DeveloperClientsTable.jsx | 4387 | focused frontend component module |
| application/documents/document-utils.js | 2113 | document phases, defaults and status mapping |
| application/Faqs.jsx | 6480 | focused frontend component module |
| application/onboarding/contract.jsx | 15012 | application onboarding flow |
| application/onboarding/dni.jsx | 7994 | application onboarding flow |
| application/onboarding/onboarding-shared.jsx | 4203 | application onboarding flow |
| application/onboarding/OnboardingFlow.jsx | 336 | application onboarding flow |
| application/onboarding/origin.jsx | 6512 | application onboarding flow |
| application/onboarding/payment.jsx | 4322 | application onboarding flow |
| application/onboarding/profile.jsx | 15899 | application onboarding flow |
| application/onboarding/questionnaire-fields.jsx | 4421 | application onboarding flow |
| application/payments/InvoiceReceipt.jsx | 4873 | printable payment receipt |
| application/payments/payment-utils.jsx | 1200 | payment formatting and status UI |
| application/PortalAssistant.jsx | 8381 | focused frontend component module |
| application/StudentPlanCalendar.jsx | 8715 | focused frontend component module |
| application/StudentProfile.jsx | 8728 | focused frontend component module |
| application/StudentStatus.jsx | 4466 | focused frontend component module |
| client-utils.js | 1934 | browser-safe formatting, logging and image helpers |
| main.jsx | 311 | focused frontend component module |
| shared/PortalWidgets.jsx | 6138 | widgets shared by both authenticated portals |
| ui.jsx | 5117 | focused frontend component module |

Regenerate with `node scripts/generate-component-map.js`.
