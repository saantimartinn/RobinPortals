import React from "react";
import { SubscriberShell } from "./SubscriberShell.jsx";
import { SubscriptionPlanPicker } from "./SubscriptionPlanPicker.jsx";

function SubscriberPortal({ user, onLogout, onUserRefresh }) {
  const hasPlan = user.subscription_status && user.subscription_status !== "none";
  if (!hasPlan) {
    return <SubscriptionPlanPicker user={user} onLogout={onLogout} onSubscribed={onUserRefresh} />;
  }
  return <SubscriberShell user={user} onLogout={onLogout} onUserRefresh={onUserRefresh} />;
}

export { SubscriberPortal };
