// Community feature UI for social avatar; the application shell selects this view.
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import React from "react";

function SocialAvatar({ name, avatar_url, size = 44 }) {
  const s = { width: size, height: size };
  if (avatar_url) return <img src={avatar_url} alt="" className="rounded-xl object-cover flex-shrink-0" style={s} />;
  return (
    <div className="rounded-xl grid place-items-center text-white font-bold flex-shrink-0" style={{ ...s, background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
      {(name || "R").charAt(0).toUpperCase()}
    </div>
  );
}

export { SocialAvatar };
