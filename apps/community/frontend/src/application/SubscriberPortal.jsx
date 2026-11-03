// Shell or navigation module for subscriber portal; local authentication state stays in the application layer.
import React from "react";
import { SubscriberShell } from "./SubscriberShell.jsx";
import { SubscriptionPlanPicker } from "./SubscriptionPlanPicker.jsx";

function SubscriberPortal({ user, onLogout, onUserRefresh }) {
  const hasPlan = ["active", "trialing", "past_due"].includes(user.subscription_status);
  if (!hasPlan) {
    return <SubscriptionPlanPicker user={user} onSubscribed={onUserRefresh} />;
  }
  return <SubscriberShell user={user} onLogout={onLogout} onUserRefresh={onUserRefresh} />;
}

export { SubscriberPortal };
