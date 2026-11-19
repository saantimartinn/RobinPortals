// Shared order for the browser's navigation and the server's onboarding gate.
export const ONBOARDING_STEPS = [
  { key: 'origin', label: 'Tu solicitud', detail: 'Datos para preparar tu contrato' },
  { key: 'dni', label: 'Identidad', detail: 'Verifica tus datos personales' },
  { key: 'contract', label: 'Contrato', detail: 'Revisa y firma el acuerdo' },
  { key: 'payment', label: 'Primer pago', detail: 'Confirma tu primera cuota' },
  { key: 'profile', label: 'Perfil académico', detail: 'Conversa con Robin para empezar' },
];
export const ONBOARDING_ORDER = ONBOARDING_STEPS.map(step => step.key);
const completedFields = { origin: 'origin', dni: 'dni_completed', contract: 'contract_signed', payment: 'pago_completed', profile: 'profile_completed' };
const ARRIVAL_ORDER = ONBOARDING_ORDER.filter(step => step !== 'profile');

export function onboardingOrder(user) {
  return String(user?.tipo || '').toLowerCase() === 'llegada' ? ARRIVAL_ORDER : ONBOARDING_ORDER;
}

export function nextOnboardingStep(user) {
  if (!user.requires_onboarding) return null;
  return onboardingOrder(user).find(step => !user[completedFields[step]]) || null;
}

export function hasCompletedOnboarding(user) {
  return onboardingOrder(user).every(step => !!user[completedFields[step]]);
}
