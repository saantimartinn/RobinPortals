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

export function nextOnboardingStep(user) {
  if (!user.requires_onboarding) return null;
  return ONBOARDING_ORDER.find(step => !user[completedFields[step]]) || null;
}

export function hasCompletedOnboarding(user) {
  return ONBOARDING_ORDER.every(step => !!user[completedFields[step]]);
}
