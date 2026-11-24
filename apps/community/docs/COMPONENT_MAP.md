# Mapa del frontend

Generado desde imports del código.

| Módulo | Dependencias locales |
|---|---|
| [frontend/src/admin-permissions.js](../frontend/src/admin-permissions.js) | — |
| [frontend/src/api/arrival.js](../frontend/src/api/arrival.js) | `../../../../portal/portal-source/src/api/payments.js` |
| [frontend/src/api/index.js](../frontend/src/api/index.js) | `../../../../../packages/i18n/language.js`, `../../../../../packages/auth/change-password-client.mjs` |
| [frontend/src/app.jsx](../frontend/src/app.jsx) | `../../../../packages/i18n/language.js`, `../../../../packages/i18n/react.jsx`, `./shared/theme.js`, `../../../../packages/portal-nav/links.js`, `./features/admin/SubscriberAdmin.jsx`, `./application/SubscriberPortal.jsx`, `./api/index.js`, `./shared/utils.js`, `./application/CrossPortalNav.jsx` |
| [frontend/src/application/CrossPortalNav.jsx](../frontend/src/application/CrossPortalNav.jsx) | `../../../../../packages/i18n/react.jsx`, `../../../../../packages/portal-nav/links.js`, `../assets/robin-wordmark.png`, `../../../../../packages/portal-nav/cross-portal-nav.css` |
| [frontend/src/application/SubscriberPortal.jsx](../frontend/src/application/SubscriberPortal.jsx) | `./SubscriberShell.jsx`, `./SubscriptionPlanPicker.jsx` |
| [frontend/src/application/SubscriberShell.jsx](../frontend/src/application/SubscriberShell.jsx) | `../../../../../packages/i18n/react.jsx`, `./subscription-portal.css`, `../shared/NotificationPopup.jsx`, `../shared/ui.jsx`, `../features/subscription/SubHome.jsx`, `../api/index.js`, `../../../shared/product-access.cjs` |
| [frontend/src/application/SubscriptionPlanPicker.jsx](../frontend/src/application/SubscriptionPlanPicker.jsx) | `../../../../../packages/i18n/react.jsx`, `../shared/ui.jsx`, `../shared/theme.js`, `../shared/constants.js`, `../shared/utils.js`, `../api/index.js` |
| [frontend/src/features/admin/ADMIN_EVENT_KINDS.js](../frontend/src/features/admin/ADMIN_EVENT_KINDS.js) | — |
| [frontend/src/features/admin/AdminChallengeManager.jsx](../frontend/src/features/admin/AdminChallengeManager.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../community/fileToDataUrl.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/admin/AdminDiscountManager.jsx](../frontend/src/features/admin/AdminDiscountManager.jsx) | `../../shared/ui.jsx`, `../../api/index.js` |
| [frontend/src/features/admin/AdminEventManager.jsx](../frontend/src/features/admin/AdminEventManager.jsx) | `./ADMIN_EVENT_KINDS.js`, `../../shared/ui.jsx`, `../../shared/constants.js`, `../../shared/utils.js`, `../../api/index.js`, `./toLocalInput.js` |
| [frontend/src/features/admin/AdminFaqManager.jsx](../frontend/src/features/admin/AdminFaqManager.jsx) | `../../api/index.js`, `../../shared/ui.jsx` |
| [frontend/src/features/admin/AdminMentorManager.jsx](../frontend/src/features/admin/AdminMentorManager.jsx) | `../../shared/ui.jsx`, `../../shared/constants.js`, `../../shared/theme.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/admin/AdminPanelOverview.jsx](../frontend/src/features/admin/AdminPanelOverview.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `./SUB_REQ_STATUS.js`, `../../shared/utils.js` |
| [frontend/src/features/admin/AdminPartnerManager.jsx](../frontend/src/features/admin/AdminPartnerManager.jsx) | `../../shared/ui.jsx`, `../../shared/constants.js`, `../../api/index.js`, `../../shared/utils.js` |
| [frontend/src/features/admin/AdminSubNotifications.jsx](../frontend/src/features/admin/AdminSubNotifications.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/admin/AdminUserDetail.jsx](../frontend/src/features/admin/AdminUserDetail.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/constants.js`, `../levels/RobinProgressBar.jsx`, `./SUB_REQ_STATUS.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/admin/AdminUsers.jsx](../frontend/src/features/admin/AdminUsers.jsx) | `./AdminUserDetail.jsx`, `../../shared/ui.jsx`, `../../shared/constants.js`, `../../api/index.js`, `../../../../../../packages/client-folders/model.mjs`, `../../../../../../packages/client-folders/folders.css` |
| [frontend/src/features/admin/RobinPlanDeveloperDatabase.jsx](../frontend/src/features/admin/RobinPlanDeveloperDatabase.jsx) | `../../api/index.js`, `./robin-plan-developer-database.css` |
| [frontend/src/features/admin/SUB_REQ_STATUS.js](../frontend/src/features/admin/SUB_REQ_STATUS.js) | — |
| [frontend/src/features/admin/SubscriberAdmin.jsx](../frontend/src/features/admin/SubscriberAdmin.jsx) | `./AdminChallengeManager.jsx`, `./AdminDiscountManager.jsx`, `./AdminEventManager.jsx`, `./AdminMentorManager.jsx`, `./AdminPanelOverview.jsx`, `./AdminPartnerManager.jsx`, `./AdminSubNotifications.jsx`, `./AdminUsers.jsx`, `./AdminFaqManager.jsx`, `../../api/index.js`, `../../admin-permissions.js`, `./RobinPlanDeveloperDatabase.jsx`, `../../application/subscription-portal.css` |
| [frontend/src/features/admin/toLocalInput.js](../frontend/src/features/admin/toLocalInput.js) | — |
| [frontend/src/features/arrival/ArrivalCalls.jsx](../frontend/src/features/arrival/ArrivalCalls.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../../../../portal/portal-source/src/application/BookingsPortal.jsx`, `../../shared/ui.jsx` |
| [frontend/src/features/arrival/ArrivalPartners.jsx](../frontend/src/features/arrival/ArrivalPartners.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../api/index.js`, `../community/SubPartners.jsx`, `../../shared/ui.jsx` |
| [frontend/src/features/arrival/ArrivalPayments.jsx](../frontend/src/features/arrival/ArrivalPayments.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../shared/ui.jsx`, `../../shared/utils.js`, `../../../../../portal/portal-source/src/application/payments/InvoiceReceipt.jsx`, `../../api/arrival.js` |
| [frontend/src/features/arrival/ArrivalSettings.jsx](../frontend/src/features/arrival/ArrivalSettings.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../shared/ui.jsx`, `../profile/SubSettings.jsx` |
| [frontend/src/features/community/fileToDataUrl.js](../frontend/src/features/community/fileToDataUrl.js) | — |
| [frontend/src/features/community/SubPartners.jsx](../frontend/src/features/community/SubPartners.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/constants.js` |
| [frontend/src/features/levels/RobinProgressBar.jsx](../frontend/src/features/levels/RobinProgressBar.jsx) | `../../shared/theme.js` |
| [frontend/src/features/profile/SubSettings.jsx](../frontend/src/features/profile/SubSettings.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../shared/ui.jsx`, `../subscription/SubSubscription.jsx`, `../../api/index.js` |
| [frontend/src/features/subscription/SubFaqs.jsx](../frontend/src/features/subscription/SubFaqs.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../api/index.js`, `../../shared/ui.jsx` |
| [frontend/src/features/subscription/SubHome.jsx](../frontend/src/features/subscription/SubHome.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../shared/ui.jsx`, `../../shared/theme.js`, `../../api/arrival.js`, `../../shared/constants.js` |
| [frontend/src/features/subscription/SubPayments.jsx](../frontend/src/features/subscription/SubPayments.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../shared/ui.jsx`, `../../shared/constants.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/subscription/SubSubscription.jsx](../frontend/src/features/subscription/SubSubscription.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/constants.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/subscription/SubSupport.jsx](../frontend/src/features/subscription/SubSupport.jsx) | `../../../../../../packages/i18n/react.jsx`, `../../shared/ui.jsx`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/main.jsx](../frontend/src/main.jsx) | `../../../../packages/brand/brand.css`, `./app.jsx`, `./index.css`, `../../../../packages/portal-nav/robin-shell.css` |
| [frontend/src/shared/constants.js](../frontend/src/shared/constants.js) | — |
| [frontend/src/shared/NotificationPopup.jsx](../frontend/src/shared/NotificationPopup.jsx) | `../../../../../packages/i18n/react.jsx`, `./ui.jsx`, `./theme.js`, `../api/index.js` |
| [frontend/src/shared/theme.js](../frontend/src/shared/theme.js) | — |
| [frontend/src/shared/ui.jsx](../frontend/src/shared/ui.jsx) | `../../../../../packages/i18n/react.jsx`, `./theme.js` |
| [frontend/src/shared/utils.js](../frontend/src/shared/utils.js) | `../../../../../packages/i18n/language.js`, `./constants.js` |
