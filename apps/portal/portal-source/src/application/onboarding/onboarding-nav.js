// Onboarding step navigation shared by the shell and the steps: going back to a
// completed step and returning to the next one. app.jsx provides the value.
import { createContext, useContext } from "react";

export const ONBOARDING_ORDER = ["origin", "dni", "contract", "profile", "payment"];

export const OnboardingNavContext = createContext(null);

export function useOnboardingNav() {
  return useContext(OnboardingNavContext);
}
