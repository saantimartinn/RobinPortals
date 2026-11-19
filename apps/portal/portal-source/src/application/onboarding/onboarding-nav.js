// Onboarding step navigation shared by the shell and the steps: going back to a
// completed step and returning to the next one. app.jsx provides the value.
import { createContext, useContext } from "react";
export { ONBOARDING_ORDER, ONBOARDING_STEPS, onboardingOrder, nextOnboardingStep } from "../../../../../../packages/onboarding/flow.mjs";

export const OnboardingNavContext = createContext(null);

export function useOnboardingNav() {
  return useContext(OnboardingNavContext);
}
