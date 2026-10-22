// Admin workspace module for client avatar; AdminPortal composes these views.
import { NAVY, NAVY_DARK } from "../../theme.js";

export function ClientAvatar({ nombre, apellidos, size = "md" }) {
  const initials = ((nombre || "").charAt(0) + (apellidos || "").charAt(0)).toUpperCase() || "R";
  const sizes = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-base" };
  return (
    <div className={`${sizes[size]} rounded-xl grid place-items-center font-bold flex-shrink-0 text-white`}
      style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
      {initials}
    </div>
  );
}
