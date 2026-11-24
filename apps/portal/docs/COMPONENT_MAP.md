# Frontend component map

Generated from 49 focused frontend modules: 99 top-level functions/components.
Props, state, API calls and child components are static approximations and must be reviewed with behavioral changes.
Module sizes are UTF-8 bytes after normalizing line endings to LF for cross-platform reproducibility.

| Name | Module | Domain | Props/args | Local state | API calls | Child components | Line |
|---|---|---|---|---|---|---|---:|
| sendNativeAuthEvent | app.jsx | app/auth | payload | none | none | none | 42 |
| PortalRobin | app.jsx | app/auth | none | authState, onboardingOverride, active, subscriptionAccess, checkingSubscriptionAccess, subscriptionAccessResolved, entryNotice, reportOpen, introUserId, resetToken | apiLogin, apiLogout, apiMe, issueSsoTicket, onboardingState, paymentsVerify | SupportDialogs, ResetPasswordScreen, LoginScreen, CrossPortalNav, AdminPortal, OnboardingNavContext, Step, PortalShell | 46 |
| LoginScreen | app.jsx | app/auth | { onLogin } | email, password, error, loading, recoveryOpen, biometryName | none | LanguageSelector, RecoveryRequest | 385 |
| AdminPerfilAcademico | application/admin/academic.jsx | shared/application | { client, onRefresh } | none | none | AdminProfileEditor | 3 |
| AdminArrivalSummary | application/admin/AdminArrivalSummary.jsx | shared/application | { client, onNavigate } | none | none | Badge, Btn, Card, CardHeader, CardContent, AdminReservas | 9 |
| AdminCarrerasNew | application/admin/AdminCarrerasNew.jsx | shared/application | { client } | library, assigned, loading, error, cName, cUni, cCity, cLevel, cDocs, editingId | adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign | Card, CardHeader, Btn, CardContent, Field, Divider, CareerRequirementsTimeline | 10 |
| AdminChatAssistant | application/admin/AdminChatAssistant.jsx | shared/application | { user, activeClientId, clients, mascot } | mode, messages, draft, busy, error, notesOpen, notesText, notesUserId, notesTitle, notesBusy | adminAssistant, adminHistorialAdd | Btn | 8 |
| AdminDocumentosNew | application/admin/AdminDocumentosNew.jsx | shared/application | { client } | docs, loading, error, busyId, newName, newRequired, newTemplate | documentsGet, adminDocumentsList, adminDocumentsReview, adminDocumentsAdd, adminDocumentsDelete | Card, CardHeader, CardContent, Field, Btn, Badge | 8 |
| AdminPagos | application/admin/AdminPagos.jsx | shared/application | { client } | data, loading, error, busyId, facturaOpen, facturaPayment, now, xConcept, xAmount, xPreset | adminPaymentsList, adminPaymentsUnlock, adminPaymentsSetAmount, adminPaymentsSetCarreras, adminPaymentsAdd, adminPaymentsDelete | Card, CardHeader, CardContent, Btn, PaymentStatusBadge, Field, Factura | 13 |
| AdminReservas | application/admin/AdminReservas.jsx | shared/application | { client } | bookings, loading, error, busyId, refreshKey | bookingsList, bookingsCancel | Card, CardHeader, CardContent, Badge | 9 |
| ClientAvatar | application/admin/ClientAvatar.jsx | shared/application | { nombre, apellidos, size = "md" } | none | none | none | 4 |
| ClientPhaseBadge | application/admin/clientManagement.jsx | shared/application | { client } | background | none | Badge | 18 |
| FolderedClients | application/admin/clientManagement.jsx | shared/application | { clients, totalCount, onSelect } | data, selectedId, name, busy, error, dragOver | none | ClientAvatar, ClientPhaseBadge | 28 |
| AdminClientesList | application/admin/clientManagement.jsx | shared/application | { clients, totalCount, searchQ, onSearch, onSelect, loading, loadError, onOpenAssign } | none | none | Card, CardHeader, Badge, Btn, CardContent, FolderedClients | 74 |
| AssignClientModal | application/admin/clientManagement.jsx | shared/application | { adminEmail, list, loading, error, busyId, onAssign, onClose } | q | none | ClientAvatar, Badge, Btn | 114 |
| ConvertMentoria | application/admin/ConvertMentoria.jsx | shared/application | { client, onConverted } | open, targetType, busy, error | none | none | 4 |
| AdminDashboard | application/admin/dashboard.jsx | shared/application | { user, onOpenClient, onOpenAssign, onGotoTab } | loading, error, data, alertSort, taskTitle, taskBusy, taskComposerOpen, refreshKey, bookingBusyId | adminDashboard, adminTaskCreate, bookingsCancel | Card, CardContent, Btn, KpiCard, CardHeader, Badge, Row, Divider | 13 |
| AdminNotificaciones | application/admin/notifications.jsx | shared/application | { adminId, clients } | title, content, type, scope, selected, allClients, loadingAll, busy, feedback, error | adminListAllClients, adminNotificationsList, adminNotificationCreate | Badge, Card, CardHeader, CardContent, Field, TextareaField, Btn | 10 |
| errorMessage | application/admin/profile-editors.jsx | shared/application | error | none | none | none | 12 |
| EditField | application/admin/profile-editors.jsx | shared/application | {label,value,onChange,type='text',className=''} | none | none | none | 21 |
| AdminProfileEditor | application/admin/profile-editors.jsx | shared/application | {client,onRefresh,academicOnly=false,personalOnly=false,formOnly=false,onSaved,onCancel} | draft, busy, status | adminClientProfileSave | Card, CardHeader, CardContent, EditField, SubjectRanking, Btn | 22 |
| OnboardingQuestionnaire | application/admin/profile-editors.jsx | shared/application | {client,questionnaire,onRefresh} | expanded, editing, saved | none | Card, CardHeader, Btn, CardContent, AdminProfileEditor | 52 |
| NoteEditor | application/admin/profile-editors.jsx | shared/application | {note,onSave,busy} | text, editing | none | Btn | 71 |
| CommercialNotesEditor | application/admin/profile-editors.jsx | shared/application | {client,onRefresh} | notes, version, text, busy, status | adminClientNoteSave | Card, CardHeader, CardContent, NoteEditor, Btn | 76 |
| AdminPerfil | application/admin/profile.jsx | shared/application | { client, onRefresh } | sugg, suggLoading, suggErr, regening, feedbackBusy | adminCareerSuggestions, adminCareerSuggestionsRegenerate, adminCareerSuggestionFeedback | Card, CardHeader, CardContent, ConvertMentoria, Badge, AdminProfileEditor, CommercialNotesEditor, LivedAbroadCard, Btn, OnboardingQuestionnaire | 12 |
| formatBirthDate | application/admin/profile.jsx | shared/application | value | none | none | none | 244 |
| birthdayIsToday | application/admin/profile.jsx | shared/application | value | none | none | none | 251 |
| AdminEstadoFases | application/admin/progress.jsx | shared/application | { client, onChangedPhase } | phase, busy, error | adminPhaseSet | ClientAvatar, Card, CardHeader, CardContent | 10 |
| AdminChatIA | application/AdminChatIA.jsx | shared/application | { client } | messages, aiPaused, draft, loading, busy, error | adminChatList, adminChatSend, adminChatResume | Card, CardHeader, CardContent, Btn | 10 |
| normalizeAdminClient | application/AdminPortal.jsx | application/admin | apiClient, adminId | none | none | none | 72 |
| AdminPortal | application/AdminPortal.jsx | application/admin | { user } | data, mascot, searchQ, loadingClients, loadError, assignOpen, assignList, assignLoading, assignError, assignBusyId | adminListClients, adminListAllClients, adminAssignClient | AdminWorkspace, AdminDashboard, AdminClientesList, AdminArrivalSummary, AdminEstadoFases, AdminPerfil, AdminCarrerasNew, AdminDocumentosNew, AdminChatIA, AdminReservas | 105 |
| adminName | application/AdminWorkspace.jsx | shared/application | user | none | none | none | 28 |
| AdminWorkspace | application/AdminWorkspace.jsx | shared/application | { user, active, client, clients, loading, error, onNavigate, onSwitchClient, isDeveloper = false, children } | pickerOpen | none | Icon, ClientPicker | 34 |
| ClientPicker | application/AdminWorkspace.jsx | shared/application | { clients, selectedId, onSelect, onClose, returnRef } | query | none | none | 79 |
| PortalShell | application/ApplicationPortals.jsx | application/client | { user, clientName, active, setActive, onUserRefresh, onReportProblem } | profilePhoto, photoBusy, photoError, chatOpen, mascot, summary | documentsList, bookingsList, profileAvatarUpload | NotificationPopup, Icon, AnimatePresence, Estado, Perfil, CarrerasCliente, DocumentosCliente, Reservas, PagosCliente, FaqsPage | 52 |
| Reservas | application/BookingsPortal.jsx | shared/application | { reserveLabel = 'Reservar Meet', timeZone, bookingNotice = '' } = {} | serverBookings, loading, error, busy, cancellingId, refreshKey, lastCreated, avDays, avLoading, advisorName | bookingsList, bookingsCreate, bookingsCancel, bookingsAvailability | Card, CardHeader, CardContent, Btn, Badge | 12 |
| careerTimelineItems | application/careers/CareerRequirementsTimeline.jsx | shared/application | careers = [] | none | none | none | 8 |
| formatDeadline | application/careers/CareerRequirementsTimeline.jsx | shared/application | value | none | none | none | 25 |
| CareerRequirementsTimeline | application/careers/CareerRequirementsTimeline.jsx | shared/application | { careers = [], title = "Timeline de requerimientos" } | none | none | Card, CardHeader, CardContent, Icon, Badge | 32 |
| PagosCliente | application/ClientSections.jsx | application/payments | none | data, loading, loadError, facturaOpen, facturaPayment, payBusy | paymentsList, paymentsCheckout | Card, CardHeader, CardContent, PaymentStatusBadge, Btn, Factura | 18 |
| CarrerasCliente | application/ClientSections.jsx | application/careers | none | careers, loading, error | careersListMine | Card, CardHeader, CardContent, Badge, CareerRequirementsTimeline | 125 |
| DocumentosCliente | application/ClientSections.jsx | application/documents | none | docs, expandedGroups, careers, loading, error, careerError, uploadingId, documentsResult | careersListMine, documentsList, documentsGet, documentsUpload | Badge, Btn, Card, CardHeader, CardContent | 180 |
| CrossPortalNav | application/CrossPortalNav.jsx | shared/application | { current = "application", user = null, onLogout, onRefresh, onReportProblem, reportInSidebar = false, hasSubscriptionAccess = false, checkingSubscriptionAccess = false, entryNotice = "" } | notice, menuOpen | none | LanguageSelector | 13 |
| display | application/DeveloperClientsTable.jsx | shared/application | value | none | none | none | 6 |
| parseValue | application/DeveloperClientsTable.jsx | shared/application | text, original | none | none | none | 11 |
| DeveloperClientsTable | application/DeveloperClientsTable.jsx | shared/application | none | page, rows, total, pageSize, busy, error, editing | adminDeveloperClients, adminDeveloperClientUpdate | none | 25 |
| buildDefaultDocs | application/documents/document-utils.js | application/documents | level | none | none | none | 29 |
| statusLabel | application/documents/document-utils.js | application/documents | status | none | none | none | 47 |
| countRequiredDocumentsToUpload | application/documents/document-utils.js | application/documents | documents = [] | none | none | none | 54 |
| newCareerRequirement | application/documents/document-utils.js | application/documents | type = 'document' | none | none | none | 62 |
| normalizeCareerRequirement | application/documents/document-utils.js | application/documents | requirement = {} | none | none | none | 76 |
| FaqsPage | application/Faqs.jsx | shared/application | none | faqs | faqsList | Card, CardContent | 8 |
| AdminFaqManager | application/Faqs.jsx | shared/application | none | faqs | faqsList, adminFaqMutate | Btn, Card, CardHeader, CardContent, Field, TextareaField, Badge | 31 |
| OnboardingContract | application/onboarding/contract.jsx | application/onboarding | { user, onLogout, onDone } | nombreCliente, dniCliente, selectedExtras, agree, sigDataUrl, busy, error | contractSave | OnboardingShell, Hl, FieldReadOnly, Field, SignaturePad, Btn | 15 |
| renderContractBlock | application/onboarding/contract.jsx | application/onboarding | b, i, values | none | none | none | 233 |
| renderContractText | application/onboarding/contract.jsx | application/onboarding | text, values | none | none | Hl | 254 |
| Hl | application/onboarding/contract.jsx | application/onboarding | { children } | none | none | none | 264 |
| FieldReadOnly | application/onboarding/contract.jsx | application/onboarding | { label, value } | none | none | none | 272 |
| SignaturePad | application/onboarding/contract.jsx | application/onboarding | { onChange } | drawing, empty | none | none | 282 |
| OnboardingDNI | application/onboarding/dni.jsx | application/onboarding | { user, onLogout, onDone } | anverso, reverso, aPreview, rPreview, phase, manualEntry, error, busy, fields | dniExtract, dniSave | OnboardingShell, UploadSlot, Btn, Field | 10 |
| UploadSlot | application/onboarding/dni.jsx | application/onboarding | { label, preview, onPick } | none | none | none | 147 |
| OnboardingShell | application/onboarding/onboarding-shared.jsx | application/onboarding | { user, title, subtitle, question, questionMeta, questionHint, stepNumber, totalSteps, onLogout, fullscreen = false, conversation = false, children } | none | none | LanguageSelector | 10 |
| OnboardingOrigin | application/onboarding/origin.jsx | application/onboarding | { user, onLogout, onDone } | origin, level, pais, hasEu, screen, error, busy | originSave | OnboardingShell, Choice, Field, Btn | 9 |
| OnboardingPayment | application/onboarding/payment.jsx | application/onboarding | { user, onLogout, onDone } | busy, error, confirming | onboardingCheckout | OnboardingShell, Btn | 12 |
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
| paymentTitle | application/payments/payment-utils.jsx | application/payments | payment, total | none | none | none | 26 |
| StudentAssistant | application/PortalAssistant.jsx | shared/application | { open, onOpenChange, mascot, onOpenFaq } | none | none | ChatIA | 9 |
| ChatIA | application/PortalAssistant.jsx | shared/application | { active, mascot, onOpenFaq } | messages, aiPaused, draft, loading, sending, error | chatAiList, chatAiSend | none | 42 |
| Perfil | application/StudentProfile.jsx | shared/application | { user, clientName, profilePhoto, onPhotoChange, photoBusy, photoError, intereses, onUserRefresh } | none | none | Card, CardContent, Badge, LivedAbroadCard, ChangePasswordCard | 11 |
| ChangePasswordCard | application/StudentProfile.jsx | shared/application | none | open, current, next, confirm, busy, error, success | changePassword | Card, CardHeader, CardContent, Btn | 84 |
| LivedAbroadCard | application/StudentProfile.jsx | shared/application | { value, editable, onSaved, userId } | lived, country, other, busy, savedAt, error | livedAbroadSave | Card, CardHeader, CardContent, Field, Btn | 133 |
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
| RecoveryRequest | support/PasswordRecovery.jsx | shared/application | { onClose } | identifier, busy, sent, error | passwordResetRequest | Modal | 7 |
| ResetPasswordScreen | support/PasswordRecovery.jsx | shared/application | { token } | password, confirm, busy, done, error | passwordResetConfirm | LanguageSelector | 45 |
| Modal | support/SupportDialogs.jsx | shared/application | { title, onClose, children, className = "" } | none | none | none | 8 |
| SupportDialogs | support/SupportDialogs.jsx | shared/application | { user, reportOpen, onCloseReport, introOpen, onCloseIntro, onOpenReport } | kind, email, message, busy, sent, error, website | none | Modal | 23 |

## Modules

| Module | Bytes | Responsibility |
|---|---:|---|
| app.jsx | 20397 | composition root and authentication screens |
| application/admin/academic.jsx | 209 | focused frontend component module |
| application/admin/AdminArrivalSummary.jsx | 2776 | focused frontend component module |
| application/admin/AdminCarrerasNew.jsx | 13314 | focused frontend component module |
| application/admin/AdminChatAssistant.jsx | 9602 | focused frontend component module |
| application/admin/AdminDocumentosNew.jsx | 7224 | focused frontend component module |
| application/admin/AdminPagos.jsx | 16173 | focused frontend component module |
| application/admin/AdminReservas.jsx | 5868 | focused frontend component module |
| application/admin/ClientAvatar.jsx | 582 | focused frontend component module |
| application/admin/clientManagement.jsx | 12604 | focused frontend component module |
| application/admin/ConvertMentoria.jsx | 3042 | focused frontend component module |
| application/admin/dashboard.jsx | 20278 | focused frontend component module |
| application/admin/notifications.jsx | 13057 | focused frontend component module |
| application/admin/profile-editors.jsx | 14004 | focused frontend component module |
| application/admin/profile.jsx | 13701 | focused frontend component module |
| application/admin/progress.jsx | 3510 | focused frontend component module |
| application/AdminChatIA.jsx | 6040 | focused frontend component module |
| application/AdminPortal.jsx | 14342 | advisor portal and application administration |
| application/AdminWorkspace.jsx | 8192 | focused frontend component module |
| application/ApplicationPortals.jsx | 9672 | application client portal composition |
| application/BookingsPortal.jsx | 15221 | focused frontend component module |
| application/careers/CareerRequirementsTimeline.jsx | 3530 | focused frontend component module |
| application/ClientSections.jsx | 16855 | client payments, careers and documents |
| application/CrossPortalNav.jsx | 5440 | focused frontend component module |
| application/DeveloperClientsTable.jsx | 4387 | focused frontend component module |
| application/documents/document-utils.js | 3408 | document phases, defaults and status mapping |
| application/Faqs.jsx | 6588 | focused frontend component module |
| application/onboarding/contract.jsx | 15630 | application onboarding flow |
| application/onboarding/dni.jsx | 8744 | application onboarding flow |
| application/onboarding/onboarding-shared.jsx | 4248 | application onboarding flow |
| application/onboarding/OnboardingFlow.jsx | 336 | application onboarding flow |
| application/onboarding/origin.jsx | 5971 | application onboarding flow |
| application/onboarding/payment.jsx | 5737 | application onboarding flow |
| application/onboarding/profile-conversation.jsx | 2973 | application onboarding flow |
| application/onboarding/profile.jsx | 19554 | application onboarding flow |
| application/onboarding/questionnaire-fields.jsx | 5010 | application onboarding flow |
| application/onboarding/subject-ranking.jsx | 3931 | application onboarding flow |
| application/onboarding/thanks.jsx | 1322 | application onboarding flow |
| application/payments/InvoiceReceipt.jsx | 5286 | printable payment receipt |
| application/payments/payment-utils.jsx | 1068 | payment formatting and status UI |
| application/PortalAssistant.jsx | 8607 | focused frontend component module |
| application/StudentProfile.jsx | 12204 | focused frontend component module |
| application/StudentStatus.jsx | 4631 | focused frontend component module |
| client-utils.js | 2111 | browser-safe formatting, logging and image helpers |
| main.jsx | 1012 | focused frontend component module |
| shared/PortalWidgets.jsx | 6078 | widgets shared by both authenticated portals |
| support/PasswordRecovery.jsx | 4743 | focused frontend component module |
| support/SupportDialogs.jsx | 5581 | focused frontend component module |
| ui.jsx | 5113 | focused frontend component module |

Regenerate with `node scripts/generate-component-map.js`.
