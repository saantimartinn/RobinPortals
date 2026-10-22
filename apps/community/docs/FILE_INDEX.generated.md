# Índice generado de archivos

Generado con `npm run docs:generate`. El mapa técnico mantenido está en `docs/FILE_MAP.md`. Las funciones/exportaciones listadas se detectan estáticamente por nombre; revisa el archivo fuente para argumentos, efectos y semántica.

| Archivo | Responsabilidad | Funciones/exportaciones detectadas |
|---|---|---|
| [.env.example](../.env.example) | Configuración, herramienta o prueba | — |
| [.gitattributes](../.gitattributes) | Configuración, herramienta o prueba | — |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | Configuración, herramienta o prueba | — |
| [.gitignore](../.gitignore) | Configuración, herramienta o prueba | — |
| [.nvmrc](../.nvmrc) | Configuración, herramienta o prueba | — |
| [backend/functions/auth-change-password.js](../backend/functions/auth-change-password.js) | Handler HTTP: auth-change-password | handler |
| [backend/functions/auth-login.js](../backend/functions/auth-login.js) | Handler HTTP: auth-login | handler |
| [backend/functions/auth-logout.js](../backend/functions/auth-logout.js) | Handler HTTP: auth-logout | handler |
| [backend/functions/auth-sso.js](../backend/functions/auth-sso.js) | Handler HTTP: auth-sso | findSubscriber, handler |
| [backend/functions/challenges.js](../backend/functions/challenges.js) | Handler HTTP: challenges | handler |
| [backend/functions/community-events-list.js](../backend/functions/community-events-list.js) | Handler HTTP: community-events-list | handler |
| [backend/functions/community-rsvp.js](../backend/functions/community-rsvp.js) | Handler HTTP: community-rsvp | handler, notifyFriendsOfRsvp |
| [backend/functions/discount-validate.js](../backend/functions/discount-validate.js) | Handler HTTP: discount-validate | handler |
| [backend/functions/faqs.js](../backend/functions/faqs.js) | Handler HTTP: faqs | handler |
| [backend/functions/me.js](../backend/functions/me.js) | Handler HTTP: me | handler |
| [backend/functions/messages.js](../backend/functions/messages.js) | Handler HTTP: messages | handler |
| [backend/functions/notifications-ack.js](../backend/functions/notifications-ack.js) | Handler HTTP: notifications-ack | handler |
| [backend/functions/notifications-list.js](../backend/functions/notifications-list.js) | Handler HTTP: notifications-list | handler |
| [backend/functions/partner-logo-upload.js](../backend/functions/partner-logo-upload.js) | Handler HTTP: partner-logo-upload | _test, handler |
| [backend/functions/partners-list.js](../backend/functions/partners-list.js) | Handler HTTP: partners-list | handler |
| [backend/functions/service-requests.js](../backend/functions/service-requests.js) | Handler HTTP: service-requests | escapeHtml, handler |
| [backend/functions/social.js](../backend/functions/social.js) | Handler HTTP: social | handler |
| [backend/functions/stripe-webhook.js](../backend/functions/stripe-webhook.js) | Handler HTTP: stripe-webhook | handler |
| [backend/functions/sub-admin-data.js](../backend/functions/sub-admin-data.js) | Handler HTTP: sub-admin-data | handler |
| [backend/functions/sub-admin-database.js](../backend/functions/sub-admin-database.js) | Handler HTTP: sub-admin-database | handler, requireDeveloper |
| [backend/functions/sub-admin-mutate.js](../backend/functions/sub-admin-mutate.js) | Handler HTTP: sub-admin-mutate | bumpDays, handler, normDuration, pick |
| [backend/functions/subscriber-cv-ai.js](../backend/functions/subscriber-cv-ai.js) | Handler HTTP: subscriber-cv-ai | docxToText, handler, stripDataUrl |
| [backend/functions/subscriber-profile-update.js](../backend/functions/subscriber-profile-update.js) | Handler HTTP: subscriber-profile-update | handler |
| [backend/functions/subscriber-signup.js](../backend/functions/subscriber-signup.js) | Handler HTTP: subscriber-signup | handler, isValidEmail |
| [backend/functions/subscription-checkout.js](../backend/functions/subscription-checkout.js) | Handler HTTP: subscription-checkout | handler |
| [backend/functions/subscription-plans.js](../backend/functions/subscription-plans.js) | Handler HTTP: subscription-plans | handler, withDiscount |
| [backend/functions/subscription-portal.js](../backend/functions/subscription-portal.js) | Handler HTTP: subscription-portal | handler |
| [backend/lib/anthropic-chat.js](../backend/lib/anthropic-chat.js) | Servicio servidor: anthropic-chat | chatCompletion |
| [backend/lib/application-permissions.js](../backend/lib/application-permissions.js) | Servicio servidor: application-permissions | canUseRobinPlan, readApplicationIdentity |
| [backend/lib/auth.js](../backend/lib/auth.js) | Servicio servidor: auth | COOKIE_NAME, buildSessionCookie, clearApplicationSessionCookie, getJwtSecret, hashPassword, isCurrentPasswordResetToken, passwordResetVersion, readSessionFromEvent, signPasswordResetToken, signSession, verifyPassword, verifyPasswordResetToken |
| [backend/lib/discounts.js](../backend/lib/discounts.js) | Servicio servidor: discounts | lookupCode |
| [backend/lib/email.js](../backend/lib/email.js) | Servicio servidor: email | sendEmail |
| [backend/lib/http.js](../backend/lib/http.js) | Servicio servidor: http | allowedOrigins, headerCI, json, methodNotAllowed, parseJsonBody, safeEqual, serverError, verifyOrigin |
| [backend/lib/partner-logo.js](../backend/lib/partner-logo.js) | Servicio servidor: partner-logo | parseImageDataUrl, safeSegment, uploadPartnerLogo |
| [backend/lib/password-reset.js](../backend/lib/password-reset.js) | Servicio servidor: password-reset | applyPasswordReset, emailHtml, requestPasswordReset, resetUrl |
| [backend/lib/principal.js](../backend/lib/principal.js) | Servicio servidor: principal | isSubscriberRole, principalTable, subscriberDisplayName |
| [backend/lib/social.js](../backend/lib/social.js) | Servicio servidor: social | areFriends, getFriendIds |
| [backend/lib/stripe.js](../backend/lib/stripe.js) | Servicio servidor: stripe | fulfillCheckout, getBaseUrl, getStripe, isConfigured, toCents |
| [backend/lib/subscription-billing.js](../backend/lib/subscription-billing.js) | Servicio servidor: subscription-billing | candidateValues, contractClient, createHoldedInvoice, ensureHoldedContact, findPortalMatch, fullName, getPortalSupabase, holdedFetch, intersects, norm, normEmail, normPhone, normTaxId, processStripeInvoice, profileValues, scoreCandidate |
| [backend/lib/subscription.js](../backend/lib/subscription.js) | Servicio servidor: subscription | PLANS, fulfillSubscriptionCheckout, isConfigured, listAvailablePlans, mapStripeStatus, planAmount, planInterval, planPriceId, syncSubscriptionFromStripeObject |
| [backend/lib/supabase.js](../backend/lib/supabase.js) | Servicio servidor: supabase | getSupabase |
| [frontend/index.html](../frontend/index.html) | Configuración, herramienta o prueba | — |
| [frontend/package.json](../frontend/package.json) | Configuración, herramienta o prueba | — |
| [frontend/postcss.config.js](../frontend/postcss.config.js) | Configuración, herramienta o prueba | — |
| [frontend/public/favicon-150.png](../frontend/public/favicon-150.png) | Recurso público | — |
| [frontend/public/favicon-192.png](../frontend/public/favicon-192.png) | Recurso público | — |
| [frontend/public/favicon.png](../frontend/public/favicon.png) | Recurso público | — |
| [frontend/public/partner-logos/link-maas.jpg](../frontend/public/partner-logos/link-maas.jpg) | Configuración, herramienta o prueba | — |
| [frontend/public/partner-logos/the-circo.png](../frontend/public/partner-logos/the-circo.png) | Recurso público | — |
| [frontend/public/recursos/adaptacion-cultural-holanda.pdf](../frontend/public/recursos/adaptacion-cultural-holanda.pdf) | Recurso público | — |
| [frontend/public/recursos/research-vs-applied-sciences.png](../frontend/public/recursos/research-vs-applied-sciences.png) | Recurso público | — |
| [frontend/public/recursos/trabajar-y-estudiar-nl.pdf](../frontend/public/recursos/trabajar-y-estudiar-nl.pdf) | Recurso público | — |
| [frontend/public/recursos/tranquilidad-para-los-padres.pdf](../frontend/public/recursos/tranquilidad-para-los-padres.pdf) | Recurso público | — |
| [frontend/src/admin-permissions.js](../frontend/src/admin-permissions.js) | Módulo frontend: admin-permissions | canAdminSee, firstAllowedAdminUrl, isDeveloperAdminEmail |
| [frontend/src/api/index.js](../frontend/src/api/index.js) | Módulo frontend: index | adminFaqMutate, api, challengeSubmit, challengesList, communityEventsList, communityRsvp, discountValidate, exchangeApplicationSession, faqsList, login, logout, me, messageSend, messagesConversations, messagesThread, notificationAck, notificationsPending, partnerLogoUpload, partnersList, request, requestPasswordReset, resetPassword, serviceRequestCreate, serviceRequestsList, socialAction, socialData, subAdminData, subAdminDatabase, subAdminDatabaseExecuteSql, subAdminDatabaseUpdate, subAdminMutate, subscriberCvAi, subscriberProfileUpdate, subscriberSignup, subscriptionCheckout, subscriptionPlans, subscriptionPortal |
| [frontend/src/app.jsx](../frontend/src/app.jsx) | Módulo frontend: app | PortalRobin, handleLogin, handleLogout, handleSignup, onFocus, refresh, refreshUser |
| [frontend/src/application/cross-portal-nav.css](../frontend/src/application/cross-portal-nav.css) | Módulo frontend: cross-portal-nav.css | — |
| [frontend/src/application/CrossPortalNav.jsx](../frontend/src/application/CrossPortalNav.jsx) | Módulo frontend: CrossPortalNav | CrossPortalNav, allowed |
| [frontend/src/application/SubscriberPortal.jsx](../frontend/src/application/SubscriberPortal.jsx) | Módulo frontend: SubscriberPortal | SubscriberPortal |
| [frontend/src/application/SubscriberShell.jsx](../frontend/src/application/SubscriberShell.jsx) | Módulo frontend: SubscriberShell | SubscriberShell, initialTab, poll, refreshEvents, refreshRequests |
| [frontend/src/application/subscription-portal.css](../frontend/src/application/subscription-portal.css) | Módulo frontend: subscription-portal.css | — |
| [frontend/src/application/SubscriptionPlanPicker.jsx](../frontend/src/application/SubscriptionPlanPicker.jsx) | Módulo frontend: SubscriptionPlanPicker | SubscriptionPlanPicker, startCheckout |
| [frontend/src/assets/logo-r-azul.png](../frontend/src/assets/logo-r-azul.png) | Módulo frontend: logo-r-azul.png | — |
| [frontend/src/assets/logo-r-blanco.png](../frontend/src/assets/logo-r-blanco.png) | Módulo frontend: logo-r-blanco.png | — |
| [frontend/src/assets/logo-robin-azul.png](../frontend/src/assets/logo-robin-azul.png) | Módulo frontend: logo-robin-azul.png | — |
| [frontend/src/assets/robin-logo-transparent.png](../frontend/src/assets/robin-logo-transparent.png) | Módulo frontend: robin-logo-transparent.png | — |
| [frontend/src/assets/robin-plan-header-logo.png](../frontend/src/assets/robin-plan-header-logo.png) | Módulo frontend: robin-plan-header-logo.png | — |
| [frontend/src/assets/robin-wordmark.png](../frontend/src/assets/robin-wordmark.png) | Módulo frontend: robin-wordmark.png | — |
| [frontend/src/features/admin/ADMIN_EVENT_KINDS.js](../frontend/src/features/admin/ADMIN_EVENT_KINDS.js) | Módulo frontend: ADMIN_EVENT_KINDS | — |
| [frontend/src/features/admin/AdminChallengeManager.jsx](../frontend/src/features/admin/AdminChallengeManager.jsx) | Módulo frontend: AdminChallengeManager | AdminChallengeManager, addQuestion, blank, onPickFiles, remove, save, startEdit, validate |
| [frontend/src/features/admin/AdminDiscountManager.jsx](../frontend/src/features/admin/AdminDiscountManager.jsx) | Módulo frontend: AdminDiscountManager | AdminDiscountManager, blank, remove, save, startEdit, toggleActive |
| [frontend/src/features/admin/AdminEventManager.jsx](../frontend/src/features/admin/AdminEventManager.jsx) | Módulo frontend: AdminEventManager | AdminEventManager, blank, remove, save, setMeta, startEdit |
| [frontend/src/features/admin/AdminFaqManager.jsx](../frontend/src/features/admin/AdminFaqManager.jsx) | Módulo frontend: AdminFaqManager | AdminFaqManager, load, remove, save |
| [frontend/src/features/admin/AdminMentorManager.jsx](../frontend/src/features/admin/AdminMentorManager.jsx) | Módulo frontend: AdminMentorManager | AdminMentorManager, addSlot, blank, onPhoto, removeMentor, removeSlot, saveMentor, setMeta, startEdit |
| [frontend/src/features/admin/AdminPanelOverview.jsx](../frontend/src/features/admin/AdminPanelOverview.jsx) | Módulo frontend: AdminPanelOverview | AdminPanelOverview |
| [frontend/src/features/admin/AdminPartnerManager.jsx](../frontend/src/features/admin/AdminPartnerManager.jsx) | Módulo frontend: AdminPartnerManager | AdminPartnerManager, blank, onLogo, remove, save |
| [frontend/src/features/admin/AdminSubNotifications.jsx](../frontend/src/features/admin/AdminSubNotifications.jsx) | Módulo frontend: AdminSubNotifications | AdminSubNotifications, remove, submit, toggle |
| [frontend/src/features/admin/AdminUserDetail.jsx](../frontend/src/features/admin/AdminUserDetail.jsx) | Módulo frontend: AdminUserDetail | AdminUserDetail, saveUser, setReqStatus |
| [frontend/src/features/admin/AdminUsers.jsx](../frontend/src/features/admin/AdminUsers.jsx) | Módulo frontend: AdminUsers | AdminUsers |
| [frontend/src/features/admin/robin-plan-developer-database.css](../frontend/src/features/admin/robin-plan-developer-database.css) | Módulo frontend: robin-plan-developer-database.css | — |
| [frontend/src/features/admin/RobinPlanDeveloperDatabase.jsx](../frontend/src/features/admin/RobinPlanDeveloperDatabase.jsx) | Módulo frontend: RobinPlanDeveloperDatabase | RobinPlanDeveloperDatabase, format, parse, runSql, save |
| [frontend/src/features/admin/SUB_REQ_STATUS.js](../frontend/src/features/admin/SUB_REQ_STATUS.js) | Módulo frontend: SUB_REQ_STATUS | — |
| [frontend/src/features/admin/SubscriberAdmin.jsx](../frontend/src/features/admin/SubscriberAdmin.jsx) | Módulo frontend: SubscriberAdmin | SubscriberAdmin, load, refreshAdminData |
| [frontend/src/features/admin/toLocalInput.js](../frontend/src/features/admin/toLocalInput.js) | Módulo frontend: toLocalInput | pad, toLocalInput |
| [frontend/src/features/auth/auth-shell.css](../frontend/src/features/auth/auth-shell.css) | Módulo frontend: auth-shell.css | — |
| [frontend/src/features/auth/AuthShell.jsx](../frontend/src/features/auth/AuthShell.jsx) | Módulo frontend: AuthShell | AuthShell |
| [frontend/src/features/career/CvAiPage.jsx](../frontend/src/features/career/CvAiPage.jsx) | Módulo frontend: CvAiPage | CvAiPage, onDrop, onFileInput, readFile, reset, run |
| [frontend/src/features/career/cvBuildHtml.jsx](../frontend/src/features/career/cvBuildHtml.jsx) | Módulo frontend: cvBuildHtml | cvBuildHtml, sec |
| [frontend/src/features/career/CvChoice.jsx](../frontend/src/features/career/CvChoice.jsx) | Módulo frontend: CvChoice | CvChoice |
| [frontend/src/features/career/cvEsc.js](../frontend/src/features/career/cvEsc.js) | Módulo frontend: cvEsc | cvEsc |
| [frontend/src/features/career/downloadCvDoc.jsx](../frontend/src/features/career/downloadCvDoc.jsx) | Módulo frontend: downloadCvDoc | downloadCvDoc |
| [frontend/src/features/career/EmpleosLocalesPage.jsx](../frontend/src/features/career/EmpleosLocalesPage.jsx) | Módulo frontend: EmpleosLocalesPage | EmpleosLocalesPage |
| [frontend/src/features/career/MentoriasPage.jsx](../frontend/src/features/career/MentoriasPage.jsx) | Módulo frontend: MentoriasPage | MentoriasPage |
| [frontend/src/features/career/MentorProfileCard.jsx](../frontend/src/features/career/MentorProfileCard.jsx) | Módulo frontend: MentorProfileCard | MentorProfileCard |
| [frontend/src/features/career/SubProfesional.jsx](../frontend/src/features/career/SubProfesional.jsx) | Módulo frontend: SubProfesional | SubProfesional |
| [frontend/src/features/community/ChallengeCard.jsx](../frontend/src/features/community/ChallengeCard.jsx) | Módulo frontend: ChallengeCard | ChallengeCard, onPick, removeFile, submit |
| [frontend/src/features/community/CityFilterBar.jsx](../frontend/src/features/community/CityFilterBar.jsx) | Módulo frontend: CityFilterBar | CityFilterBar |
| [frontend/src/features/community/cityVisible.js](../frontend/src/features/community/cityVisible.js) | Módulo frontend: cityVisible | cityVisible |
| [frontend/src/features/community/DEMO_ROBINS.js](../frontend/src/features/community/DEMO_ROBINS.js) | Módulo frontend: DEMO_ROBINS | — |
| [frontend/src/features/community/EVENT_TAB_TYPES.js](../frontend/src/features/community/EVENT_TAB_TYPES.js) | Módulo frontend: EVENT_TAB_TYPES | — |
| [frontend/src/features/community/fileToDataUrl.js](../frontend/src/features/community/fileToDataUrl.js) | Módulo frontend: fileToDataUrl | fileToDataUrl |
| [frontend/src/features/community/OtrosRobinsCarousel.jsx](../frontend/src/features/community/OtrosRobinsCarousel.jsx) | Módulo frontend: OtrosRobinsCarousel | OtrosRobinsCarousel |
| [frontend/src/features/community/OtrosRobinsPage.jsx](../frontend/src/features/community/OtrosRobinsPage.jsx) | Módulo frontend: OtrosRobinsPage | OtrosRobinsPage |
| [frontend/src/features/community/RobinCard.jsx](../frontend/src/features/community/RobinCard.jsx) | Módulo frontend: RobinCard | RobinCard |
| [frontend/src/features/community/SocialAvatar.jsx](../frontend/src/features/community/SocialAvatar.jsx) | Módulo frontend: SocialAvatar | SocialAvatar |
| [frontend/src/features/community/SubAssociationsView.jsx](../frontend/src/features/community/SubAssociationsView.jsx) | Módulo frontend: SubAssociationsView | SubAssociationsView |
| [frontend/src/features/community/SubChallenges.jsx](../frontend/src/features/community/SubChallenges.jsx) | Módulo frontend: SubChallenges | SubChallenges, afterSubmit, load |
| [frontend/src/features/community/SubCommunity.jsx](../frontend/src/features/community/SubCommunity.jsx) | Módulo frontend: SubCommunity | SubCommunity |
| [frontend/src/features/community/SubEventsView.jsx](../frontend/src/features/community/SubEventsView.jsx) | Módulo frontend: SubEventsView | SubEventsView, rsvp |
| [frontend/src/features/community/SubGroupsView.jsx](../frontend/src/features/community/SubGroupsView.jsx) | Módulo frontend: SubGroupsView | SubGroupsView |
| [frontend/src/features/community/SubMessageThread.jsx](../frontend/src/features/community/SubMessageThread.jsx) | Módulo frontend: SubMessageThread | SubMessageThread, load, send |
| [frontend/src/features/community/SubOffersView.jsx](../frontend/src/features/community/SubOffersView.jsx) | Módulo frontend: SubOffersView | SubOffersView |
| [frontend/src/features/community/SubOverviewView.jsx](../frontend/src/features/community/SubOverviewView.jsx) | Módulo frontend: SubOverviewView | SubOverviewView, inCity |
| [frontend/src/features/community/SubPartners.jsx](../frontend/src/features/community/SubPartners.jsx) | Módulo frontend: SubPartners | SubPartners |
| [frontend/src/features/community/SubSocial.jsx](../frontend/src/features/community/SubSocial.jsx) | Módulo frontend: SubSocial | SubSocial, act, loadConvs, loadSocial |
| [frontend/src/features/community/SubTripsView.jsx](../frontend/src/features/community/SubTripsView.jsx) | Módulo frontend: SubTripsView | SubTripsView |
| [frontend/src/features/levels/RobinBenefitsPage.jsx](../frontend/src/features/levels/RobinBenefitsPage.jsx) | Módulo frontend: RobinBenefitsPage | RobinBenefitsPage |
| [frontend/src/features/levels/RobinLevelUpToast.jsx](../frontend/src/features/levels/RobinLevelUpToast.jsx) | Módulo frontend: RobinLevelUpToast | RobinLevelUpToast |
| [frontend/src/features/levels/RobinLockedNotice.jsx](../frontend/src/features/levels/RobinLockedNotice.jsx) | Módulo frontend: RobinLockedNotice | RobinLockedNotice |
| [frontend/src/features/levels/RobinProgressBar.jsx](../frontend/src/features/levels/RobinProgressBar.jsx) | Módulo frontend: RobinProgressBar | RobinProgressBar |
| [frontend/src/features/profile/SubProfile.jsx](../frontend/src/features/profile/SubProfile.jsx) | Módulo frontend: SubProfile | SubProfile, onPickAvatar, removeAvatar, save, saveExtra, setEx |
| [frontend/src/features/profile/SubSettings.jsx](../frontend/src/features/profile/SubSettings.jsx) | Módulo frontend: SubSettings | SubSettings |
| [frontend/src/features/services/ComingSoon.jsx](../frontend/src/features/services/ComingSoon.jsx) | Módulo frontend: ComingSoon | ComingSoon |
| [frontend/src/features/services/ResidenciasPage.jsx](../frontend/src/features/services/ResidenciasPage.jsx) | Módulo frontend: ResidenciasPage | ResidenciasPage |
| [frontend/src/features/services/ServiceRequestCard.jsx](../frontend/src/features/services/ServiceRequestCard.jsx) | Módulo frontend: ServiceRequestCard | ServiceRequestCard, submit |
| [frontend/src/features/services/SubIntro.jsx](../frontend/src/features/services/SubIntro.jsx) | Módulo frontend: SubIntro | SubIntro |
| [frontend/src/features/services/SubNavCard.jsx](../frontend/src/features/services/SubNavCard.jsx) | Módulo frontend: SubNavCard | SubNavCard |
| [frontend/src/features/services/SubPersonal.jsx](../frontend/src/features/services/SubPersonal.jsx) | Módulo frontend: SubPersonal | SubPersonal, svc |
| [frontend/src/features/subscription/SubFaqs.jsx](../frontend/src/features/subscription/SubFaqs.jsx) | Módulo frontend: SubFaqs | SubFaqs |
| [frontend/src/features/subscription/SubHome.jsx](../frontend/src/features/subscription/SubHome.jsx) | Módulo frontend: SubHome | SubHome, inCity, isActive |
| [frontend/src/features/subscription/SubPayments.jsx](../frontend/src/features/subscription/SubPayments.jsx) | Módulo frontend: SubPayments | SubPayments, openPortal |
| [frontend/src/features/subscription/SubSubscription.jsx](../frontend/src/features/subscription/SubSubscription.jsx) | Módulo frontend: SubSubscription | SubSubscription, openPortal |
| [frontend/src/features/subscription/SubSupport.jsx](../frontend/src/features/subscription/SubSupport.jsx) | Módulo frontend: SubSupport | SubSupport, submit |
| [frontend/src/index.css](../frontend/src/index.css) | Módulo frontend: index.css | — |
| [frontend/src/main.jsx](../frontend/src/main.jsx) | Módulo frontend: main | — |
| [frontend/src/shared/constants.js](../frontend/src/shared/constants.js) | Módulo frontend: constants | — |
| [frontend/src/shared/NotificationPopup.jsx](../frontend/src/shared/NotificationPopup.jsx) | Módulo frontend: NotificationPopup | NotificationPopup, handle |
| [frontend/src/shared/TermsModal.jsx](../frontend/src/shared/TermsModal.jsx) | Módulo frontend: TermsModal | TermsModal |
| [frontend/src/shared/theme.js](../frontend/src/shared/theme.js) | Módulo frontend: theme | — |
| [frontend/src/shared/ui.jsx](../frontend/src/shared/ui.jsx) | Módulo frontend: ui | Badge, Btn, Card, CardContent, CardHeader, Divider, Field, KpiCard, Row, SelectField, TextareaField |
| [frontend/src/shared/utils.js](../frontend/src/shared/utils.js) | Módulo frontend: utils | formatDate, formatMoney, getRobinLevel, isSubscriberAdmin, isSubscriberUser, prepareLogoFile, resizeImageFile, robinDaysActive, robinLevelDef, robinLockFor, studentJobUrl, uid |
| [frontend/tailwind.config.js](../frontend/tailwind.config.js) | Configuración, herramienta o prueba | — |
| [frontend/vite.config.js](../frontend/vite.config.js) | Configuración, herramienta o prueba | developerDatabaseRedirect |
| [netlify.toml](../netlify.toml) | Configuración, herramienta o prueba | — |
| [package-lock.json](../package-lock.json) | Configuración, herramienta o prueba | — |
| [package.json](../package.json) | Configuración, herramienta o prueba | — |
| [README.md](../README.md) | Documentación | — |
| [READMELONG.md](../READMELONG.md) | Documentación | — |
| [scripts/check-architecture.cjs](../scripts/check-architecture.cjs) | Configuración, herramienta o prueba | cycle, markReachable, walk |
| [scripts/create-admin.cjs](../scripts/create-admin.cjs) | Configuración, herramienta o prueba | main |
| [scripts/generate-docs.cjs](../scripts/generate-docs.cjs) | Configuración, herramienta o prueba | functionSymbols, link, purpose, walk |
| [supabase/migrations/001_robin_plan_schema.sql](../supabase/migrations/001_robin_plan_schema.sql) | Esquema de base de datos | — |
| [supabase/migrations/002_subscription_faqs.sql](../supabase/migrations/002_subscription_faqs.sql) | Esquema de base de datos | — |
| [supabase/migrations/003_partner_logos.sql](../supabase/migrations/003_partner_logos.sql) | Esquema de base de datos | — |
| [supabase/migrations/004_subscription_billing.sql](../supabase/migrations/004_subscription_billing.sql) | Esquema de base de datos | — |
| [supabase/seeds/demo.sql](../supabase/seeds/demo.sql) | Datos demo opcionales | — |
| [test/application-permissions.test.cjs](../test/application-permissions.test.cjs) | Configuración, herramienta o prueba | — |
| [test/auth.test.cjs](../test/auth.test.cjs) | Configuración, herramienta o prueba | event |
| [test/frontend.test.cjs](../test/frontend.test.cjs) | Configuración, herramienta o prueba | noop |
| [test/handlers.test.cjs](../test/handlers.test.cjs) | Configuración, herramienta o prueba | loadHandler |
| [test/http.test.cjs](../test/http.test.cjs) | Configuración, herramienta o prueba | — |
| [test/password-reset.test.cjs](../test/password-reset.test.cjs) | Configuración, herramienta o prueba | loadModule |
| [test/subscription.test.cjs](../test/subscription.test.cjs) | Configuración, herramienta o prueba | — |
| [USERGUIDE.md](../USERGUIDE.md) | Documentación | — |
