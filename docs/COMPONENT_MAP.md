# Mapa del frontend

Generado desde imports del código.

| Módulo | Dependencias locales |
|---|---|
| [frontend/src/api/index.js](../frontend/src/api/index.js) | — |
| [frontend/src/app.jsx](../frontend/src/app.jsx) | `./shared/theme.js`, `./features/admin/SubscriberAdmin.jsx`, `./features/auth/SubscriberAuthScreen.jsx`, `./application/SubscriberPortal.jsx`, `./api/index.js`, `./shared/utils.js` |
| [frontend/src/application/SubscriberPortal.jsx](../frontend/src/application/SubscriberPortal.jsx) | `./SubscriberShell.jsx`, `./SubscriptionPlanPicker.jsx` |
| [frontend/src/application/SubscriberShell.jsx](../frontend/src/application/SubscriberShell.jsx) | `./subscription-portal.css`, `../shared/NotificationPopup.jsx`, `../shared/constants.js`, `../features/levels/RobinBenefitsPage.jsx`, `../features/levels/RobinLevelUpToast.jsx`, `../features/community/SubChallenges.jsx`, `../features/community/SubCommunity.jsx`, `../features/subscription/SubHome.jsx`, `../features/subscription/SubPayments.jsx`, `../features/services/SubPersonal.jsx`, `../features/career/SubProfesional.jsx`, `../features/profile/SubProfile.jsx`, `../features/profile/SubSettings.jsx`, `../features/community/SubSocial.jsx`, `../features/subscription/SubSupport.jsx`, `../features/subscription/SubFaqs.jsx`, `../api/index.js`, `../shared/utils.js`, `../assets/robin-wordmark.png` |
| [frontend/src/application/SubscriptionPlanPicker.jsx](../frontend/src/application/SubscriptionPlanPicker.jsx) | `../shared/ui.jsx`, `../shared/theme.js`, `../shared/constants.js`, `../shared/utils.js`, `../assets/robin-wordmark.png`, `../api/index.js` |
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
| [frontend/src/features/admin/AdminUsers.jsx](../frontend/src/features/admin/AdminUsers.jsx) | `./AdminUserDetail.jsx`, `../../shared/ui.jsx`, `../../shared/constants.js` |
| [frontend/src/features/admin/SUB_REQ_STATUS.js](../frontend/src/features/admin/SUB_REQ_STATUS.js) | — |
| [frontend/src/features/admin/SubscriberAdmin.jsx](../frontend/src/features/admin/SubscriberAdmin.jsx) | `./AdminChallengeManager.jsx`, `./AdminDiscountManager.jsx`, `./AdminEventManager.jsx`, `./AdminMentorManager.jsx`, `./AdminPanelOverview.jsx`, `./AdminPartnerManager.jsx`, `./AdminSubNotifications.jsx`, `./AdminUsers.jsx`, `./AdminFaqManager.jsx`, `../../api/index.js`, `../../assets/robin-wordmark.png`, `../../application/subscription-portal.css` |
| [frontend/src/features/admin/toLocalInput.js](../frontend/src/features/admin/toLocalInput.js) | — |
| [frontend/src/features/auth/AuthShell.jsx](../frontend/src/features/auth/AuthShell.jsx) | `../../shared/theme.js`, `../../assets/robin-logo-transparent.png`, `./auth-shell.css` |
| [frontend/src/features/auth/SubscriberAuthScreen.jsx](../frontend/src/features/auth/SubscriberAuthScreen.jsx) | `./AuthShell.jsx`, `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/constants.js`, `../../shared/TermsModal.jsx`, `../../api/index.js` |
| [frontend/src/features/career/CvAiPage.jsx](../frontend/src/features/career/CvAiPage.jsx) | `../../shared/ui.jsx`, `./CvChoice.jsx`, `../../shared/theme.js`, `../services/SubIntro.jsx`, `./cvBuildHtml.jsx`, `./downloadCvDoc.jsx`, `../../api/index.js` |
| [frontend/src/features/career/cvBuildHtml.jsx](../frontend/src/features/career/cvBuildHtml.jsx) | `./cvEsc.js` |
| [frontend/src/features/career/CvChoice.jsx](../frontend/src/features/career/CvChoice.jsx) | `../../shared/theme.js` |
| [frontend/src/features/career/cvEsc.js](../frontend/src/features/career/cvEsc.js) | — |
| [frontend/src/features/career/downloadCvDoc.jsx](../frontend/src/features/career/downloadCvDoc.jsx) | `./cvBuildHtml.jsx` |
| [frontend/src/features/career/EmpleosLocalesPage.jsx](../frontend/src/features/career/EmpleosLocalesPage.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../services/SubIntro.jsx`, `../community/cityVisible.js`, `../../shared/utils.js` |
| [frontend/src/features/career/MentoriasPage.jsx](../frontend/src/features/career/MentoriasPage.jsx) | `../../shared/ui.jsx`, `./MentorProfileCard.jsx`, `../../shared/theme.js`, `../services/SubIntro.jsx`, `../../shared/utils.js` |
| [frontend/src/features/career/MentorProfileCard.jsx](../frontend/src/features/career/MentorProfileCard.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../services/SubIntro.jsx` |
| [frontend/src/features/career/SubProfesional.jsx](../frontend/src/features/career/SubProfesional.jsx) | `../../shared/ui.jsx`, `../services/ComingSoon.jsx`, `./CvAiPage.jsx`, `./EmpleosLocalesPage.jsx`, `./MentoriasPage.jsx`, `../services/SubIntro.jsx`, `../services/SubNavCard.jsx`, `../../shared/utils.js` |
| [frontend/src/features/community/ChallengeCard.jsx](../frontend/src/features/community/ChallengeCard.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../api/index.js`, `./fileToDataUrl.js` |
| [frontend/src/features/community/CityFilterBar.jsx](../frontend/src/features/community/CityFilterBar.jsx) | `../../shared/theme.js` |
| [frontend/src/features/community/cityVisible.js](../frontend/src/features/community/cityVisible.js) | — |
| [frontend/src/features/community/DEMO_ROBINS.js](../frontend/src/features/community/DEMO_ROBINS.js) | — |
| [frontend/src/features/community/EVENT_TAB_TYPES.js](../frontend/src/features/community/EVENT_TAB_TYPES.js) | — |
| [frontend/src/features/community/fileToDataUrl.js](../frontend/src/features/community/fileToDataUrl.js) | — |
| [frontend/src/features/community/OtrosRobinsCarousel.jsx](../frontend/src/features/community/OtrosRobinsCarousel.jsx) | `../../shared/ui.jsx`, `./DEMO_ROBINS.js`, `../../shared/theme.js`, `./RobinCard.jsx` |
| [frontend/src/features/community/OtrosRobinsPage.jsx](../frontend/src/features/community/OtrosRobinsPage.jsx) | `../../shared/ui.jsx`, `./DEMO_ROBINS.js`, `./RobinCard.jsx`, `../services/SubIntro.jsx` |
| [frontend/src/features/community/RobinCard.jsx](../frontend/src/features/community/RobinCard.jsx) | `../../shared/theme.js` |
| [frontend/src/features/community/SocialAvatar.jsx](../frontend/src/features/community/SocialAvatar.jsx) | `../../shared/theme.js` |
| [frontend/src/features/community/SubAssociationsView.jsx](../frontend/src/features/community/SubAssociationsView.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `./cityVisible.js` |
| [frontend/src/features/community/SubChallenges.jsx](../frontend/src/features/community/SubChallenges.jsx) | `../../shared/ui.jsx`, `./ChallengeCard.jsx`, `../../shared/theme.js`, `../services/SubIntro.jsx`, `../../api/index.js`, `../../shared/utils.js` |
| [frontend/src/features/community/SubCommunity.jsx](../frontend/src/features/community/SubCommunity.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `./OtrosRobinsCarousel.jsx`, `./OtrosRobinsPage.jsx`, `../levels/RobinLockedNotice.jsx`, `./SubAssociationsView.jsx`, `./SubEventsView.jsx`, `./SubGroupsView.jsx`, `./SubOffersView.jsx`, `./SubOverviewView.jsx`, `./SubPartners.jsx`, `./SubTripsView.jsx`, `../../shared/utils.js` |
| [frontend/src/features/community/SubEventsView.jsx](../frontend/src/features/community/SubEventsView.jsx) | `../../shared/ui.jsx`, `../../shared/constants.js`, `./CityFilterBar.jsx`, `./EVENT_TAB_TYPES.js`, `../../shared/theme.js`, `./cityVisible.js`, `../../api/index.js`, `../../shared/utils.js` |
| [frontend/src/features/community/SubGroupsView.jsx](../frontend/src/features/community/SubGroupsView.jsx) | `../../shared/ui.jsx`, `./CityFilterBar.jsx`, `../../shared/theme.js`, `./cityVisible.js` |
| [frontend/src/features/community/SubMessageThread.jsx](../frontend/src/features/community/SubMessageThread.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/community/SubOffersView.jsx](../frontend/src/features/community/SubOffersView.jsx) | `../../shared/ui.jsx`, `./CityFilterBar.jsx`, `../../shared/theme.js`, `./cityVisible.js`, `../../shared/utils.js` |
| [frontend/src/features/community/SubOverviewView.jsx](../frontend/src/features/community/SubOverviewView.jsx) | `../../shared/ui.jsx`, `../../shared/constants.js`, `./EVENT_TAB_TYPES.js`, `../../shared/theme.js`, `./cityVisible.js`, `../../shared/utils.js` |
| [frontend/src/features/community/SubPartners.jsx](../frontend/src/features/community/SubPartners.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/constants.js` |
| [frontend/src/features/community/SubSocial.jsx](../frontend/src/features/community/SubSocial.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `./SocialAvatar.jsx`, `../services/SubIntro.jsx`, `./SubMessageThread.jsx`, `../../api/index.js` |
| [frontend/src/features/community/SubTripsView.jsx](../frontend/src/features/community/SubTripsView.jsx) | `../../shared/ui.jsx`, `./CityFilterBar.jsx`, `../../shared/theme.js`, `./cityVisible.js`, `../../shared/utils.js` |
| [frontend/src/features/levels/RobinBenefitsPage.jsx](../frontend/src/features/levels/RobinBenefitsPage.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/constants.js`, `./RobinProgressBar.jsx`, `../../shared/utils.js` |
| [frontend/src/features/levels/RobinLevelUpToast.jsx](../frontend/src/features/levels/RobinLevelUpToast.jsx) | `../../shared/ui.jsx`, `../../shared/utils.js` |
| [frontend/src/features/levels/RobinLockedNotice.jsx](../frontend/src/features/levels/RobinLockedNotice.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js` |
| [frontend/src/features/levels/RobinProgressBar.jsx](../frontend/src/features/levels/RobinProgressBar.jsx) | `../../shared/theme.js` |
| [frontend/src/features/profile/SubProfile.jsx](../frontend/src/features/profile/SubProfile.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/constants.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/profile/SubSettings.jsx](../frontend/src/features/profile/SubSettings.jsx) | `../../shared/ui.jsx`, `../subscription/SubSubscription.jsx` |
| [frontend/src/features/services/ComingSoon.jsx](../frontend/src/features/services/ComingSoon.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `./SubIntro.jsx` |
| [frontend/src/features/services/ResidenciasPage.jsx](../frontend/src/features/services/ResidenciasPage.jsx) | `../../shared/ui.jsx`, `./ComingSoon.jsx`, `../../shared/theme.js`, `../../shared/constants.js`, `./SubIntro.jsx` |
| [frontend/src/features/services/ServiceRequestCard.jsx](../frontend/src/features/services/ServiceRequestCard.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../api/index.js` |
| [frontend/src/features/services/SubIntro.jsx](../frontend/src/features/services/SubIntro.jsx) | `../../shared/theme.js`, `../../assets/robin-plan-header-logo.png` |
| [frontend/src/features/services/SubNavCard.jsx](../frontend/src/features/services/SubNavCard.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js` |
| [frontend/src/features/services/SubPersonal.jsx](../frontend/src/features/services/SubPersonal.jsx) | `../../shared/ui.jsx`, `./ComingSoon.jsx`, `./ResidenciasPage.jsx`, `../../shared/constants.js`, `./ServiceRequestCard.jsx`, `./SubIntro.jsx`, `./SubNavCard.jsx`, `../../shared/utils.js` |
| [frontend/src/features/subscription/SubFaqs.jsx](../frontend/src/features/subscription/SubFaqs.jsx) | `../../api/index.js`, `../../shared/ui.jsx` |
| [frontend/src/features/subscription/SubHome.jsx](../frontend/src/features/subscription/SubHome.jsx) | `../../shared/ui.jsx`, `../../shared/constants.js`, `../community/EVENT_TAB_TYPES.js`, `../../shared/theme.js`, `../levels/RobinProgressBar.jsx`, `../community/cityVisible.js`, `../../shared/utils.js` |
| [frontend/src/features/subscription/SubPayments.jsx](../frontend/src/features/subscription/SubPayments.jsx) | `../../shared/ui.jsx`, `../../shared/constants.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/subscription/SubSubscription.jsx](../frontend/src/features/subscription/SubSubscription.jsx) | `../../shared/ui.jsx`, `../../shared/theme.js`, `../../shared/constants.js`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/features/subscription/SubSupport.jsx](../frontend/src/features/subscription/SubSupport.jsx) | `../../shared/ui.jsx`, `../../shared/utils.js`, `../../api/index.js` |
| [frontend/src/main.jsx](../frontend/src/main.jsx) | `./app.jsx`, `./index.css` |
| [frontend/src/shared/constants.js](../frontend/src/shared/constants.js) | — |
| [frontend/src/shared/NotificationPopup.jsx](../frontend/src/shared/NotificationPopup.jsx) | `./ui.jsx`, `./theme.js`, `../api/index.js` |
| [frontend/src/shared/TermsModal.jsx](../frontend/src/shared/TermsModal.jsx) | `./ui.jsx`, `./theme.js`, `./constants.js` |
| [frontend/src/shared/theme.js](../frontend/src/shared/theme.js) | — |
| [frontend/src/shared/ui.jsx](../frontend/src/shared/ui.jsx) | `./theme.js` |
| [frontend/src/shared/utils.js](../frontend/src/shared/utils.js) | `./constants.js` |
