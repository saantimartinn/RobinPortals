# Frontend component map

Generated from 45 focused frontend modules: 86 top-level functions/components.
Props, state, API calls and child components are static approximations and must be reviewed with behavioral changes.
Module sizes are UTF-8 bytes after normalizing line endings to LF for cross-platform reproducibility.

| Name | Module | Domain | Props/args | Local state | API calls | Child components | Line |
|---|---|---|---|---|---|---|---:|
| PortalRobin | app.jsx | app/auth | none | authState, onboardingOverride, active, entryError | apiLogout, apiMe, exchangeApplicationSession, onboardingState, paymentsVerify | CrossPortalNav, AdminPortal, OnboardingNavContext, Step, PortalShell | 34 |
| AdminPerfilAcademico | application/admin/academic.jsx | shared/application | { client } | none | none | Card, CardHeader, CardContent, Badge | 8 |
| AdminCarrerasNew | application/admin/AdminCarrerasNew.jsx | shared/application | { client } | library, assigned, loading, error, formOpen, cName, cArea, cDescription, cSubjects, cRequirements | adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign | Card, CardHeader, Btn, CardContent, Field, TextareaField | 9 |
| AdminChatAssistant | application/admin/AdminChatAssistant.jsx | shared/application | { user, activeClientId, clients, mascot } | mode, messages, draft, busy, error, notesOpen, notesText, notesUserId, notesTitle, notesBusy | adminAssistant, adminHistorialAdd | Btn | 8 |
| AdminDocumentosNew | application/admin/AdminDocumentosNew.jsx | shared/application | { client } | docs, loading, error, busyId, newName, newDeadline, newRequired, newTemplate, deadlines | documentsGet, adminDocumentsList, adminDocumentsReview, adminDocumentsAdd, adminDocumentsDelete, adminDocumentsSetDeadline | Card, CardHeader, CardContent, Field, Btn, Badge | 8 |
| AdminPagos | application/admin/AdminPagos.jsx | shared/application | { client } | data, loading, error, busyId, facturaOpen, facturaPayment, now, xConcept, xAmount, xPreset | adminPaymentsList, adminPaymentsUnlock, adminPaymentsAdd, adminPaymentsDelete | Card, CardHeader, CardContent, PaymentStatusBadge, Btn, Field, Factura | 10 |
| AdminReservas | application/admin/AdminReservas.jsx | shared/application | { client } | bookings, loading, error | bookingsList | Card, CardHeader, CardContent, Badge | 9 |
| ClientAvatar | application/admin/ClientAvatar.jsx | shared/application | { nombre, apellidos, size = "md" } | none | none | none | 4 |
| FolderedClients | application/admin/clientManagement.jsx | shared/application | { clients, totalCount, onSelect } | data, selectedId, name, busy, error, dragOver | none | ClientAvatar, Badge | 11 |
| AdminClientesList | application/admin/clientManagement.jsx | shared/application | { clients, totalCount, searchQ, onSearch, onSelect, loading, loadError, onOpenAssign } | none | none | Card, CardHeader, Badge, Btn, CardContent, FolderedClients | 44 |
| AssignClientModal | application/admin/clientManagement.jsx | shared/application | { adminEmail, list, loading, error, busyId, onAssign, onClose } | q | none | ClientAvatar, Badge, Btn | 84 |
| AdminDashboard | application/admin/dashboard.jsx | shared/application | { user, onOpenClient, onOpenAssign, onGotoTab } | loading, error, data, alertSort, taskTitle, taskBusy, taskComposerOpen, refreshKey | adminDashboard, adminTaskCreate | Card, CardContent, Btn, KpiCard, CardHeader, Badge, Row, Divider | 12 |
| AdminNotificaciones | application/admin/notifications.jsx | shared/application | { adminId, clients } | title, content, type, scope, selected, allClients, loadingAll, busy, feedback, error | adminListAllClients, adminNotificationsList, adminNotificationCreate | Badge, Card, CardHeader, CardContent, Field, TextareaField, Btn | 10 |
| AdminPerfil | application/admin/profile.jsx | shared/application | { client, onRefresh } | sugg, suggLoading, suggErr, regening, feedbackBusy, showQ | adminCareerSuggestions, adminCareerSuggestionsRegenerate, adminCareerSuggestionFeedback | Card, CardHeader, CardContent, Badge, LivedAbroadCard, Btn | 9 |
| formatBirthDate | application/admin/profile.jsx | shared/application | value | none | none | none | 311 |
| birthdayIsToday | application/admin/profile.jsx | shared/application | value | none | none | none | 318 |
| AdminEstadoFases | application/admin/progress.jsx | shared/application | { client, onChangedPhase } | phase, busy, error | adminPhaseSet | ClientAvatar, Card, CardHeader, CardContent | 10 |
| AdminChatIA | application/AdminChatIA.jsx | shared/application | { client } | messages, aiPaused, draft, loading, busy, error | adminChatList, adminChatSend, adminChatResume | Card, CardHeader, CardContent, Btn | 10 |
| normalizeAdminClient | application/AdminPortal.jsx | application/admin | apiClient, adminId | none | none | none | 70 |
| AdminPortal | application/AdminPortal.jsx | application/admin | { user } | data, mascot, searchQ, loadingClients, loadError, assignOpen, assignList, assignLoading, assignError, assignBusyId | adminListClients, adminListAllClients, adminAssignClient | AdminWorkspace, AdminDashboard, AdminClientesList, AdminEstadoFases, AdminPerfil, AdminCarrerasNew, AdminDocumentosNew, AdminChatIA, AdminReservas, AdminPerfilAcademico | 103 |
| adminName | application/AdminWorkspace.jsx | shared/application | user | none | none | none | 26 |
| AdminWorkspace | application/AdminWorkspace.jsx | shared/application | { user, active, client, clients, loading, error, onNavigate, onSwitchClient, isDeveloper = false, children } | pickerOpen | none | Icon, ClientPicker | 32 |
| ClientPicker | application/AdminWorkspace.jsx | shared/application | { clients, selectedId, onSelect, onClose, returnRef } | query | none | none | 74 |
| PortalShell | application/ApplicationPortals.jsx | application/client | { user, clientName, onLogout, active, setActive, onUserRefresh } | profilePhoto, photoBusy, photoError, chatOpen, mascot, summary | documentsList, bookingsList, profileAvatarUpload | NotificationPopup, Icon, AnimatePresence, Estado, StudentPlanCalendar, Perfil, CarrerasCliente, DocumentosCliente, Reservas, PagosCliente | 52 |
| Reservas | application/BookingsPortal.jsx | shared/application | none | serverBookings, loading, error, busy, refreshKey, lastCreated, avDays, avLoading, advisorName, calendarConnected | bookingsList, bookingsCreate, bookingsAvailability | Card, CardHeader, CardContent, Btn, Badge | 10 |
| careerTimelineItems | application/careers/CareerRequirementsTimeline.jsx | shared/application | careers = [] | none | none | none | 9 |
| formatDeadline | application/careers/CareerRequirementsTimeline.jsx | shared/application | value | none | none | none | 26 |
| CareerRequirementsTimeline | application/careers/CareerRequirementsTimeline.jsx | shared/application | { careers = [], title = "Requisitos de carrera" } | none | none | Card, CardHeader, CardContent, Icon, Badge | 33 |
| PagosCliente | application/ClientSections.jsx | application/payments | none | data, loading, loadError, facturaOpen, facturaPayment, payBusy | paymentsList, paymentsCheckout | Card, CardHeader, CardContent, PaymentStatusBadge, Btn, Factura | 16 |
| CarrerasCliente | application/ClientSections.jsx | application/careers | none | careers, selectedCareer, loading, error | careersListMine | Card, CardHeader, CardContent, Badge | 125 |
| DocumentosCliente | application/ClientSections.jsx | application/documents | none | docs, expandedGroups, careers, loading, error, careerError, uploadingId, documentsResult | careersListMine, documentsList, documentsGet, documentsUpload | Badge, Btn, Card, CardHeader, CardContent | 218 |
| CrossPortalNav | application/CrossPortalNav.jsx | shared/application | { current = "robinjr", user = null, onLogout, onRefresh } | menuOpen | none | LanguageSelector | 12 |
| display | application/DeveloperClientsTable.jsx | shared/application | value | none | none | none | 6 |
| parseValue | application/DeveloperClientsTable.jsx | shared/application | text, original | none | none | none | 11 |
| DeveloperClientsTable | application/DeveloperClientsTable.jsx | shared/application | none | page, rows, total, pageSize, busy, error, editing | adminDeveloperClients, adminDeveloperClientUpdate | none | 25 |
| buildDefaultDocs | application/documents/document-utils.js | application/documents | level | none | none | none | 21 |
| statusLabel | application/documents/document-utils.js | application/documents | status | none | none | none | 39 |
| newCareerRequirement | application/documents/document-utils.js | application/documents | type = 'document' | none | none | none | 46 |
| normalizeCareerRequirement | application/documents/document-utils.js | application/documents | requirement = {} | none | none | none | 60 |
| FaqsPage | application/Faqs.jsx | shared/application | none | faqs | faqsList | Card, CardContent | 8 |
| AdminFaqManager | application/Faqs.jsx | shared/application | none | faqs | faqsList, adminFaqMutate | Btn, Card, CardHeader, CardContent, Field, TextareaField, Badge | 31 |
| OnboardingContract | application/onboarding/contract.jsx | application/onboarding | { user, onLogout, onDone } | nombreCliente, dniCliente, selectedExtras, agree, sigDataUrl, busy, error | contractSave | OnboardingShell, Hl, FieldReadOnly, Field, SignaturePad, Btn | 15 |
| renderContractBlock | application/onboarding/contract.jsx | application/onboarding | b, i, values | none | none | none | 238 |
| renderContractText | application/onboarding/contract.jsx | application/onboarding | text, values | none | none | Hl | 259 |
| Hl | application/onboarding/contract.jsx | application/onboarding | { children } | none | none | none | 269 |
| FieldReadOnly | application/onboarding/contract.jsx | application/onboarding | { label, value } | none | none | none | 277 |
| SignaturePad | application/onboarding/contract.jsx | application/onboarding | { onChange } | drawing, empty | none | none | 287 |
| OnboardingDNI | application/onboarding/dni.jsx | application/onboarding | { user, onLogout, onDone } | anverso, reverso, aPreview, rPreview, phase, manualEntry, error, busy, fields | dniExtract, dniSave | OnboardingShell, UploadSlot, Btn, Field | 10 |
| UploadSlot | application/onboarding/dni.jsx | application/onboarding | { label, preview, onPick } | none | none | none | 147 |
| OnboardingShell | application/onboarding/onboarding-shared.jsx | application/onboarding | { user, title, subtitle, question, questionMeta, questionHint, stepNumber, totalSteps = STEPS.length, onLogout, fullscreen = false, conversation = false, children } | none | none | LanguageSelector | 10 |
| OnboardingOrigin | application/onboarding/origin.jsx | application/onboarding | { user, onLogout, onDone } | origin, level, pais, hasEu, screen, error, busy | originSave | OnboardingShell, Choice, Field, Btn | 9 |
| OnboardingPayment | application/onboarding/payment.jsx | application/onboarding | { user, onLogout, onDone } | busy, error, confirming | onboardingCheckout | OnboardingShell, Btn | 11 |
| ProfileConversation | application/onboarding/profile-conversation.jsx | application/onboarding | { history, question, hint, meta, blockTitle, sectionIntro, containerRef, minimumHeight, children } | historyOpen | none | none | 5 |
| OnboardingProfile | application/onboarding/profile.jsx | application/onboarding | { user, onLogout, onDone } | email, intereses, answers, academicSystem, academicSubjects, screen, error, busy, history, profileSaved | profileSave | OnboardingThanks, OnboardingShell, ProfileConversation, Field, QuestionField, SubjectRanking, Btn | 27 |
| initQuestionnaireAnswers | application/onboarding/questionnaire-fields.jsx | application/onboarding | none | none | none | none | 8 |
| qOptLabel | application/onboarding/questionnaire-fields.jsx | application/onboarding | options, v | none | none | none | 17 |
| qFmtSlider | application/onboarding/questionnaire-fields.jsx | application/onboarding | def, val | none | none | none | 23 |
| QuestionField | application/onboarding/questionnaire-fields.jsx | application/onboarding | { def, value, onChange, hideLabel = false, academicSystem } | none | none | SubjectRanking, QSlider, QChoiceGrid | 29 |
| QSlider | application/onboarding/questionnaire-fields.jsx | application/onboarding | { label, value, min, max, step, left, right, suffix, onChange } | none | none | none | 58 |
| QChoiceGrid | application/onboarding/questionnaire-fields.jsx | application/onboarding | { options, value, multi, max, onChange } | none | none | none | 75 |
| SubjectRanking | application/onboarding/subject-ranking.jsx | application/onboarding | { value, onChange, system } | name, error, announcement | none | none | 9 |
| OnboardingThanks | application/onboarding/thanks.jsx | application/onboarding | { user, onLogout, onDone } | none | none | OnboardingShell, Btn | 7 |
| Factura | application/payments/InvoiceReceipt.jsx | application/payments | { open, onClose, user, payment } | none | none | Btn | 10 |
| eur | application/payments/payment-utils.jsx | application/payments | value | none | none | none | 6 |
| daysBetween | application/payments/payment-utils.jsx | application/payments | startIso, endIso | none | none | none | 13 |
| PaymentStatusBadge | application/payments/payment-utils.jsx | application/payments | { status } | none | none | Badge | 19 |
| paymentTitle | application/payments/payment-utils.jsx | application/payments | payment, total, isNewRobinJr = false | none | none | none | 26 |
| StudentAssistant | application/PortalAssistant.jsx | shared/application | { open, onOpenChange, mascot, onOpenFaq } | none | none | ChatIA | 9 |
| ChatIA | application/PortalAssistant.jsx | shared/application | { active, mascot, onOpenFaq } | messages, aiPaused, draft, loading, sending, error | chatAiList, chatAiSend | none | 42 |
| makePlanItems | application/StudentPlanCalendar.jsx | shared/application | bookings, documents | none | none | none | 13 |
| formatSelectedDate | application/StudentPlanCalendar.jsx | shared/application | value | none | none | none | 39 |
| StudentPlanCalendar | application/StudentPlanCalendar.jsx | shared/application | none | showSessionsNotice, items, loading, error, month, selectedDate | bookingsList, documentsList | Card, CardHeader, CardContent, Icon, Badge | 45 |
| Perfil | application/StudentProfile.jsx | shared/application | { user, clientName, profilePhoto, onPhotoChange, photoBusy, photoError, intereses, onUserRefresh } | none | none | Card, CardContent, Badge, LivedAbroadCard, ChangePasswordCard | 11 |
| ChangePasswordCard | application/StudentProfile.jsx | shared/application | none | open, current, next, confirm, busy, error, success | changePassword | Card, CardHeader, CardContent, Btn | 83 |
| LivedAbroadCard | application/StudentProfile.jsx | shared/application | { value, editable, onSaved, userId } | lived, country, other, busy, savedAt, error | livedAbroadSave | Card, CardHeader, CardContent, Field, Btn | 131 |
| Estado | application/StudentStatus.jsx | shared/application | { step, onNavigate, docsPendingCount, bookingsCount } | none | none | Icon, Card, CardHeader, CardContent | 9 |
| reportClientError | client-utils.js | shared/application | operation, error | none | none | none | 3 |
| formatDateTime | client-utils.js | shared/application | value, options | none | none | none | 11 |
| formatTime | client-utils.js | shared/application | date | none | none | none | 15 |
| formatDate | client-utils.js | shared/application | d | none | none | none | 23 |
| formatMoney | client-utils.js | shared/application | amount, currency | none | none | none | 29 |
| resizeImageFile | client-utils.js | shared/application | file, max = 256 | none | none | none | 36 |
| KpiCard | shared/PortalWidgets.jsx | shared/application | { icon: Icon, label, value, sub, tone = "navy" } | none | none | Icon | 11 |
| Row | shared/PortalWidgets.jsx | shared/application | { label, value, tone = "slate" } | none | none | none | 30 |
| BirthdayConfetti | shared/PortalWidgets.jsx | shared/application | none | none | none | none | 43 |
| NotificationPopup | shared/PortalWidgets.jsx | shared/application | none | queue, idx, busy, loaded | notificationAck, notificationsPending | BirthdayConfetti, Btn | 61 |

## Modules

| Module | Bytes | Responsibility |
|---|---:|---|
| app.jsx | 7738 | composition root and authentication screens |
| application/admin/academic.jsx | 3165 | focused frontend component module |
| application/admin/AdminCarrerasNew.jsx | 11234 | focused frontend component module |
| application/admin/AdminChatAssistant.jsx | 9602 | focused frontend component module |
| application/admin/AdminDocumentosNew.jsx | 9149 | focused frontend component module |
| application/admin/AdminPagos.jsx | 13260 | focused frontend component module |
| application/admin/AdminReservas.jsx | 4211 | focused frontend component module |
| application/admin/ClientAvatar.jsx | 582 | focused frontend component module |
| application/admin/clientManagement.jsx | 11675 | focused frontend component module |
| application/admin/dashboard.jsx | 18395 | focused frontend component module |
| application/admin/notifications.jsx | 13057 | focused frontend component module |
| application/admin/profile.jsx | 16478 | focused frontend component module |
| application/admin/progress.jsx | 3510 | focused frontend component module |
| application/AdminChatIA.jsx | 6040 | focused frontend component module |
| application/AdminPortal.jsx | 13878 | advisor portal and application administration |
| application/AdminWorkspace.jsx | 7764 | focused frontend component module |
| application/ApplicationPortals.jsx | 9799 | application client portal composition |
| application/BookingsPortal.jsx | 10470 | focused frontend component module |
| application/careers/CareerRequirementsTimeline.jsx | 3574 | legacy module; not mounted in the active Robin Jr portal |
| application/ClientSections.jsx | 20335 | client payments, careers and documents |
| application/CrossPortalNav.jsx | 3510 | focused frontend component module |
| application/DeveloperClientsTable.jsx | 4387 | focused frontend component module |
| application/documents/document-utils.js | 2277 | document phases, defaults and status mapping |
| application/Faqs.jsx | 6588 | focused frontend component module |
| application/onboarding/contract.jsx | 15689 | application onboarding flow |
| application/onboarding/dni.jsx | 8569 | application onboarding flow |
| application/onboarding/onboarding-shared.jsx | 4038 | application onboarding flow |
| application/onboarding/OnboardingFlow.jsx | 336 | application onboarding flow |
| application/onboarding/origin.jsx | 5939 | application onboarding flow |
| application/onboarding/payment.jsx | 5094 | application onboarding flow |
| application/onboarding/profile-conversation.jsx | 2973 | application onboarding flow |
| application/onboarding/profile.jsx | 19554 | application onboarding flow |
| application/onboarding/questionnaire-fields.jsx | 5010 | application onboarding flow |
| application/onboarding/subject-ranking.jsx | 3933 | application onboarding flow |
| application/onboarding/thanks.jsx | 1322 | application onboarding flow |
| application/payments/InvoiceReceipt.jsx | 5019 | printable payment receipt |
| application/payments/payment-utils.jsx | 1538 | payment formatting and status UI |
| application/PortalAssistant.jsx | 8607 | focused frontend component module |
| application/StudentPlanCalendar.jsx | 10338 | focused frontend component module |
| application/StudentProfile.jsx | 11905 | focused frontend component module |
| application/StudentStatus.jsx | 4632 | focused frontend component module |
| client-utils.js | 2111 | browser-safe formatting, logging and image helpers |
| main.jsx | 755 | focused frontend component module |
| shared/PortalWidgets.jsx | 6078 | widgets shared by both authenticated portals |
| ui.jsx | 5113 | focused frontend component module |

Regenerate with `node scripts/generate-component-map.js`.
