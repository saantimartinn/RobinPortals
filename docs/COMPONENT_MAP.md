# Frontend component map

Generated from 41 focused frontend modules: 81 top-level functions/components.
Props, state, API calls and child components are static approximations and must be reviewed with behavioral changes.
Module sizes are UTF-8 bytes after normalizing line endings to LF for cross-platform reproducibility.

| Name | Module | Domain | Props/args | Local state | API calls | Child components | Line |
|---|---|---|---|---|---|---|---:|
| nextOnboardingStep | app.jsx | app/auth | user | none | none | none | 28 |
| PortalRobin | app.jsx | app/auth | none | authState, active, selectedPortal | apiLogin, apiLogout, apiMe, onboardingState, paymentsVerify | PortalSelector, LoginScreen, CrossPortalNav, AdminPortal, OnboardingOrigin, OnboardingDNI, OnboardingContract, OnboardingPayment, OnboardingProfile, PortalShell | 38 |
| AuthShell | app.jsx | app/auth | { children } | none | none | none | 170 |
| PortalSelector | app.jsx | app/auth | { onSelectPortal } | none | none | AuthShell, Icon | 226 |
| LoginScreen | app.jsx | app/auth | { onLogin, onBack } | email, password, error, loading | none | AuthShell, Field, Btn | 266 |
| AdminPerfilAcademico | application/admin/academic.jsx | shared/application | { client } | none | none | Card, CardHeader, CardContent, Badge | 7 |
| AdminCarrerasNew | application/admin/AdminCarrerasNew.jsx | shared/application | { client } | library, assigned, loading, error, cName, cUni, cCity, cLevel, cDocs, editingId | adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign | Card, CardHeader, Btn, CardContent, Field, Divider, CareerRequirementsTimeline | 9 |
| AdminChatAssistant | application/admin/AdminChatAssistant.jsx | shared/application | { user, activeClientId, clients, mascot } | mode, messages, draft, busy, error, notesOpen, notesText, notesUserId, notesTitle, notesBusy | adminAssistant, adminHistorialAdd | Btn | 7 |
| AdminDocumentosNew | application/admin/AdminDocumentosNew.jsx | shared/application | { client } | docs, loading, error, busyId, newName, newRequired, newTemplate | documentsGet, adminDocumentsList, adminDocumentsReview, adminDocumentsAdd, adminDocumentsDelete | Card, CardHeader, CardContent, Field, Btn, Badge | 7 |
| AdminPagos | application/admin/AdminPagos.jsx | shared/application | { client } | data, loading, error, busyId, facturaOpen, facturaPayment, now, xConcept, xAmount, xPreset | adminPaymentsList, adminPaymentsUnlock, adminPaymentsSetAmount, adminPaymentsSetCarreras, adminPaymentsAdd, adminPaymentsDelete | Card, CardHeader, CardContent, Btn, PaymentStatusBadge, Field, Factura | 12 |
| AdminReservas | application/admin/AdminReservas.jsx | shared/application | { client } | bookings, loading, error | bookingsList | Card, CardHeader, CardContent, Badge | 7 |
| ClientAvatar | application/admin/ClientAvatar.jsx | shared/application | { nombre, apellidos, size = "md" } | none | none | none | 3 |
| AdminClientesList | application/admin/clientManagement.jsx | shared/application | { clients, totalCount, searchQ, onSearch, onSelect, loading, loadError, onOpenAssign } | none | none | Card, CardHeader, Badge, Btn, CardContent, ClientAvatar | 7 |
| AssignClientModal | application/admin/clientManagement.jsx | shared/application | { adminEmail, list, loading, error, busyId, onAssign, onClose } | q | none | ClientAvatar, Badge, Btn | 75 |
| AdminDashboard | application/admin/dashboard.jsx | shared/application | { user, onOpenClient, onOpenAssign, onGotoTab } | loading, error, data, alertSort, taskTitle, taskBusy, taskComposerOpen, refreshKey | adminDashboard, adminTaskCreate | Card, CardContent, Btn, KpiCard, CardHeader, Badge, Row, Divider | 10 |
| AdminNotificaciones | application/admin/notifications.jsx | shared/application | { adminId, clients } | title, content, type, scope, selected, allClients, loadingAll, busy, feedback, error | adminListAllClients, adminNotificationsList, adminNotificationCreate | Badge, Card, CardHeader, CardContent, Field, TextareaField, Btn | 9 |
| AdminPerfil | application/admin/profile.jsx | shared/application | { client, onRefresh } | sugg, suggLoading, suggErr, regening, feedbackBusy, showQ | adminCareerSuggestions, adminCareerSuggestionsRegenerate, adminCareerSuggestionFeedback | Card, CardHeader, CardContent, Badge, LivedAbroadCard, Btn | 8 |
| formatBirthDate | application/admin/profile.jsx | shared/application | value | none | none | none | 299 |
| birthdayIsToday | application/admin/profile.jsx | shared/application | value | none | none | none | 306 |
| AdminEstadoFases | application/admin/progress.jsx | shared/application | { client, onChangedPhase } | phase, busy, error | adminPhaseSet | ClientAvatar, Card, CardHeader, CardContent | 9 |
| AdminChatIA | application/AdminChatIA.jsx | shared/application | { client } | messages, aiPaused, draft, loading, busy, error | adminChatList, adminChatSend, adminChatResume | Card, CardHeader, CardContent, Btn | 9 |
| normalizeAdminClient | application/AdminPortal.jsx | application/admin | apiClient, adminId | none | none | none | 69 |
| AdminPortal | application/AdminPortal.jsx | application/admin | { user } | data, mascot, searchQ, loadingClients, loadError, assignOpen, assignList, assignLoading, assignError, assignBusyId | adminListClients, adminListAllClients, adminAssignClient | AdminWorkspace, AdminDashboard, AdminClientesList, AdminEstadoFases, AdminPerfil, AdminCarrerasNew, AdminDocumentosNew, AdminChatIA, AdminReservas, AdminPerfilAcademico | 102 |
| AdminWorkspace | application/AdminWorkspace.jsx | shared/application | { active, client, clients, loading, error, onNavigate, onSwitchClient, isDeveloper = false, children } | pickerOpen | none | Icon, ClientPicker | 24 |
| ClientPicker | application/AdminWorkspace.jsx | shared/application | { clients, selectedId, onSelect, onClose, returnRef } | query | none | none | 65 |
| PortalShell | application/ApplicationPortals.jsx | application/client | { user, clientName, onLogout, active, setActive, onUserRefresh } | profilePhoto, photoBusy, photoError, chatOpen, mascot, summary | documentsList, bookingsList, profileAvatarUpload | NotificationPopup, Icon, AnimatePresence, Estado, Perfil, CarrerasCliente, DocumentosCliente, Reservas, PagosCliente, FaqsPage | 50 |
| Reservas | application/BookingsPortal.jsx | shared/application | none | serverBookings, loading, error, busy, refreshKey, lastCreated, avDays, avLoading, advisorName, calendarConnected | bookingsList, bookingsCreate, bookingsAvailability | Card, CardHeader, CardContent, Btn, Badge | 7 |
| careerTimelineItems | application/careers/CareerRequirementsTimeline.jsx | shared/application | careers = [] | none | none | none | 6 |
| formatDeadline | application/careers/CareerRequirementsTimeline.jsx | shared/application | value | none | none | none | 23 |
| CareerRequirementsTimeline | application/careers/CareerRequirementsTimeline.jsx | shared/application | { careers = [], title = "Timeline de requerimientos" } | none | none | Card, CardHeader, CardContent, Icon, Badge | 30 |
| PagosCliente | application/ClientSections.jsx | application/payments | none | data, loading, loadError, facturaOpen, facturaPayment, payBusy | paymentsList, paymentsCheckout | Card, CardHeader, CardContent, PaymentStatusBadge, Btn, Factura | 14 |
| CarrerasCliente | application/ClientSections.jsx | application/careers | none | careers, loading, error | careersListMine | Card, CardHeader, CardContent, Badge, CareerRequirementsTimeline | 121 |
| DocumentosCliente | application/ClientSections.jsx | application/documents | none | docs, loading, error, uploadingId | documentsList, documentsGet, documentsUpload | Badge, Btn, Card, CardHeader, CardContent | 178 |
| CrossPortalNav | application/CrossPortalNav.jsx | shared/application | { current = "application", user = null, onLogout, onRefresh } | none | none | none | 16 |
| display | application/DeveloperClientsTable.jsx | shared/application | value | none | none | none | 5 |
| parseValue | application/DeveloperClientsTable.jsx | shared/application | text, original | none | none | none | 10 |
| DeveloperClientsTable | application/DeveloperClientsTable.jsx | shared/application | none | page, rows, total, pageSize, busy, error, editing | adminDeveloperClients, adminDeveloperClientUpdate | none | 24 |
| buildDefaultDocs | application/documents/document-utils.js | application/documents | level | none | none | none | 28 |
| statusLabel | application/documents/document-utils.js | application/documents | status | none | none | none | 46 |
| newCareerRequirement | application/documents/document-utils.js | application/documents | type = 'document' | none | none | none | 53 |
| normalizeCareerRequirement | application/documents/document-utils.js | application/documents | requirement = {} | none | none | none | 67 |
| FaqsPage | application/Faqs.jsx | shared/application | none | faqs | faqsList | Card, CardContent | 6 |
| AdminFaqManager | application/Faqs.jsx | shared/application | none | faqs | faqsList, adminFaqMutate | Btn, Card, CardHeader, CardContent, Field, TextareaField, Badge | 28 |
| OnboardingContract | application/onboarding/contract.jsx | application/onboarding | { user, onLogout, onDone } | nombreCliente, dniCliente, selectedExtras, agree, sigDataUrl, busy, error | contractSave | OnboardingShell, Hl, FieldReadOnly, Field, SignaturePad, Btn | 13 |
| renderContractBlock | application/onboarding/contract.jsx | application/onboarding | b, i, values | none | none | none | 234 |
| renderContractText | application/onboarding/contract.jsx | application/onboarding | text, values | none | none | Hl | 255 |
| Hl | application/onboarding/contract.jsx | application/onboarding | { children } | none | none | none | 265 |
| FieldReadOnly | application/onboarding/contract.jsx | application/onboarding | { label, value } | none | none | none | 273 |
| SignaturePad | application/onboarding/contract.jsx | application/onboarding | { onChange } | drawing, empty | none | none | 282 |
| OnboardingDNI | application/onboarding/dni.jsx | application/onboarding | { user, onLogout, onDone } | anverso, reverso, aPreview, rPreview, phase, error, busy, fields | dniExtract, dniSave | OnboardingShell, UploadSlot, Btn, Field | 8 |
| UploadSlot | application/onboarding/dni.jsx | application/onboarding | { label, preview, onPick } | none | none | none | 141 |
| OnboardingShell | application/onboarding/onboarding-shared.jsx | application/onboarding | { title, subtitle, stepNumber, totalSteps = 5, icon, onLogout, children } | none | none | Stepper | 5 |
| Stepper | application/onboarding/onboarding-shared.jsx | application/onboarding | { current, total = 3 } | none | none | none | 57 |
| OnboardingOrigin | application/onboarding/origin.jsx | application/onboarding | { user, onLogout, onDone } | origin, level, pais, hasEu, screen, error, busy | originSave | Ic, OnboardingShell, Choice, Field, Btn | 8 |
| OnboardingPayment | application/onboarding/payment.jsx | application/onboarding | { user, onLogout, onDone } | busy, error, confirming | onboardingCheckout | OnboardingShell, Btn | 9 |
| OnboardingProfile | application/onboarding/profile.jsx | application/onboarding | { user, onLogout, onDone } | email, intereses, answers, academicSystem, academicSubjects, screen, error, busy | profileSave | OnboardingShell, Field, QuestionField, Btn | 13 |
| initQuestionnaireAnswers | application/onboarding/questionnaire-fields.jsx | application/onboarding | none | none | none | none | 5 |
| qOptLabel | application/onboarding/questionnaire-fields.jsx | application/onboarding | options, v | none | none | none | 14 |
| qFmtSlider | application/onboarding/questionnaire-fields.jsx | application/onboarding | def, val | none | none | none | 20 |
| QuestionField | application/onboarding/questionnaire-fields.jsx | application/onboarding | { def, value, onChange } | none | none | QSlider, QChoiceGrid | 26 |
| QSlider | application/onboarding/questionnaire-fields.jsx | application/onboarding | { value, min, max, step, left, right, suffix, onChange } | none | none | none | 53 |
| QChoiceGrid | application/onboarding/questionnaire-fields.jsx | application/onboarding | { options, value, multi, max, onChange } | none | none | none | 69 |
| Factura | application/payments/InvoiceReceipt.jsx | application/payments | { open, onClose, user, payment } | none | none | Btn | 8 |
| eur | application/payments/payment-utils.jsx | application/payments | value | none | none | none | 4 |
| daysBetween | application/payments/payment-utils.jsx | application/payments | startIso, endIso | none | none | none | 11 |
| PaymentStatusBadge | application/payments/payment-utils.jsx | application/payments | { status } | none | none | Badge | 17 |
| paymentTitle | application/payments/payment-utils.jsx | application/payments | payment, total | none | none | none | 23 |
| StudentAssistant | application/PortalAssistant.jsx | shared/application | { open, onOpenChange, mascot, onOpenFaq } | none | none | ChatIA | 7 |
| ChatIA | application/PortalAssistant.jsx | shared/application | { active, mascot, onOpenFaq } | messages, aiPaused, draft, loading, sending, error | chatAiList, chatAiSend | none | 39 |
| Perfil | application/StudentProfile.jsx | shared/application | { user, clientName, profilePhoto, onPhotoChange, photoBusy, photoError, intereses, onUserRefresh } | none | none | Card, CardContent, Badge, LivedAbroadCard | 9 |
| LivedAbroadCard | application/StudentProfile.jsx | shared/application | { value, editable, onSaved, userId } | lived, country, other, busy, savedAt, error | livedAbroadSave | Card, CardHeader, CardContent, Field, Btn | 79 |
| Estado | application/StudentStatus.jsx | shared/application | { step, onNavigate, docsPendingCount, bookingsCount } | none | none | Icon, Card, CardHeader, CardContent | 7 |
| reportClientError | client-utils.js | shared/application | operation, error | none | none | none | 1 |
| formatTime | client-utils.js | shared/application | date | none | none | none | 9 |
| formatDate | client-utils.js | shared/application | d | none | none | none | 17 |
| formatMoney | client-utils.js | shared/application | amount, currency | none | none | none | 23 |
| resizeImageFile | client-utils.js | shared/application | file, max = 256 | none | none | none | 30 |
| KpiCard | shared/PortalWidgets.jsx | shared/application | { icon: Icon, label, value, sub, tone = "navy" } | none | none | Icon | 9 |
| Row | shared/PortalWidgets.jsx | shared/application | { label, value, tone = "slate" } | none | none | none | 25 |
| BirthdayConfetti | shared/PortalWidgets.jsx | shared/application | none | none | none | none | 37 |
| NotificationPopup | shared/PortalWidgets.jsx | shared/application | none | queue, idx, busy, loaded | notificationAck, notificationsPending | BirthdayConfetti, Btn | 55 |

## Modules

| Module | Bytes | Responsibility |
|---|---:|---|
| app.jsx | 13902 | composition root and authentication screens |
| application/admin/academic.jsx | 3091 | focused frontend component module |
| application/admin/AdminCarrerasNew.jsx | 13267 | focused frontend component module |
| application/admin/AdminChatAssistant.jsx | 9609 | focused frontend component module |
| application/admin/AdminDocumentosNew.jsx | 7161 | focused frontend component module |
| application/admin/AdminPagos.jsx | 15480 | focused frontend component module |
| application/admin/AdminReservas.jsx | 4175 | focused frontend component module |
| application/admin/ClientAvatar.jsx | 547 | focused frontend component module |
| application/admin/clientManagement.jsx | 7382 | focused frontend component module |
| application/admin/dashboard.jsx | 18361 | focused frontend component module |
| application/admin/notifications.jsx | 13020 | focused frontend component module |
| application/admin/profile.jsx | 15664 | focused frontend component module |
| application/admin/progress.jsx | 3496 | focused frontend component module |
| application/AdminChatIA.jsx | 5939 | focused frontend component module |
| application/AdminPortal.jsx | 13771 | advisor portal and application administration |
| application/AdminWorkspace.jsx | 7251 | focused frontend component module |
| application/ApplicationPortals.jsx | 9972 | application client portal composition |
| application/BookingsPortal.jsx | 9752 | focused frontend component module |
| application/careers/CareerRequirementsTimeline.jsx | 3283 | focused frontend component module |
| application/ClientSections.jsx | 13474 | client payments, careers and documents |
| application/CrossPortalNav.jsx | 2211 | focused frontend component module |
| application/DeveloperClientsTable.jsx | 4280 | focused frontend component module |
| application/documents/document-utils.js | 2918 | document phases, defaults and status mapping |
| application/Faqs.jsx | 6392 | focused frontend component module |
| application/onboarding/contract.jsx | 14930 | application onboarding flow |
| application/onboarding/dni.jsx | 7917 | application onboarding flow |
| application/onboarding/onboarding-shared.jsx | 4112 | application onboarding flow |
| application/onboarding/OnboardingFlow.jsx | 247 | application onboarding flow |
| application/onboarding/origin.jsx | 6432 | application onboarding flow |
| application/onboarding/payment.jsx | 4241 | application onboarding flow |
| application/onboarding/profile.jsx | 15818 | application onboarding flow |
| application/onboarding/questionnaire-fields.jsx | 4327 | application onboarding flow |
| application/payments/InvoiceReceipt.jsx | 4774 | printable payment receipt |
| application/payments/payment-utils.jsx | 837 | payment formatting and status UI |
| application/PortalAssistant.jsx | 8281 | focused frontend component module |
| application/StudentProfile.jsx | 8629 | focused frontend component module |
| application/StudentStatus.jsx | 4368 | focused frontend component module |
| client-utils.js | 1873 | browser-safe formatting, logging and image helpers |
| main.jsx | 239 | focused frontend component module |
| shared/PortalWidgets.jsx | 6069 | widgets shared by both authenticated portals |
| ui.jsx | 5066 | focused frontend component module |

Regenerate with `node scripts/generate-component-map.js`.
