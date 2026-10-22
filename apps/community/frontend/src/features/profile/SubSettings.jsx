// Profile feature UI for sub settings; the application shell selects this view.
import { Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { LogOut } from "lucide-react";
import React from "react";
import { SubSubscription } from "../subscription/SubSubscription.jsx";

function SubSettings({ user, requests = [], onUserRefresh, onLogout }) {
  return (
    <div className="space-y-5">
      <SubSubscription user={user} requests={requests} onUserRefresh={onUserRefresh} />

      <Card>
        <CardHeader title="Sesión" icon={LogOut} />
        <CardContent>
          <Btn variant="danger" onClick={onLogout}><LogOut className="h-4 w-4" /> Cerrar sesión</Btn>
        </CardContent>
      </Card>
    </div>
  );
}

export { SubSettings };
