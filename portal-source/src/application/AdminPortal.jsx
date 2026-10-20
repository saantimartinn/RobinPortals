import React, { useMemo, useState, useEffect, useRef, useReducer } from "react";
import { AdminWorkspace } from "./AdminWorkspace.jsx";
import { AdminFaqManager } from "./Faqs.jsx";
import { AdminChatAssistant } from "./admin/AdminChatAssistant.jsx";
import { ClientAvatar } from "./admin/ClientAvatar.jsx";
import { useDebounced } from "./admin/useDebounced.js";
import { AdminDashboard } from "./admin/dashboard.jsx";
import { AdminPerfilAcademico } from "./admin/academic.jsx";
import { AdminNotificaciones } from "./admin/notifications.jsx";
import { AdminClientesList } from "./admin/clientManagement.jsx";
import { AssignClientModal } from "./admin/clientManagement.jsx";
import { AdminPerfil } from "./admin/profile.jsx";
import { AdminEstadoFases } from "./admin/progress.jsx";
import { AdminReservas } from "./admin/AdminReservas.jsx";
import { AdminPagos } from "./admin/AdminPagos.jsx";
import { AdminCarrerasNew } from "./admin/AdminCarrerasNew.jsx";
import { AdminDocumentosNew } from "./admin/AdminDocumentosNew.jsx";
import { DeveloperClientsTable } from "./DeveloperClientsTable.jsx";
import { adminNavigation, INITIAL_ADMIN_NAVIGATION } from "./admin-navigation.js";
import robinKeys from "../assets/robin-keys.webp";
import robinGraduate from "../assets/robin-graduate.jpg";
import robinSkate from "../assets/robin-skate.png";
import robinBike from "../assets/robin-bike.jpg";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MessageCircle, Calendar, FileText, LayoutDashboard,
  Shield, CheckCircle2, UploadCloud, Search,
  Users, Download, Eye, Plus, Trash2, ChevronRight,
  BookOpen, MapPin, CreditCard, Loader2, Mail, AlertCircle,
  ChevronLeft, Sparkles, RefreshCw, ExternalLink, GraduationCap, ChevronDown,
  Home, Building2, Briefcase, Plane, PartyPopper, Dumbbell,
  LifeBuoy, Settings, Star, Percent, Clock, PauseCircle, HelpCircle, Send,
  Tag, Wallet, Receipt, Handshake, CalendarCheck, XCircle, HeartHandshake,
  Compass, MessagesSquare, Pencil, Bell, Lock,
} from "lucide-react";
import financialConfig from "../../../shared/financial-config.cjs";
import academicSystemsConfig from "../../../shared/academic-systems.cjs";
import { APP_STEPS } from "../application-steps.js";
import { fileToDataURL, uid } from "../browser-utils.js";
import { CREAM, GOLD, NAVY, NAVY_DARK } from "../theme.js";
import { Badge, Btn, Card, CardContent, CardHeader, Divider, Field, SelectField, TextareaField } from "../ui.jsx";
import { daysBetween, eur, PaymentStatusBadge, paymentTitle } from "./payments/payment-utils.jsx";
import { Factura } from "./payments/InvoiceReceipt.jsx";
import { APP_PHASE_LABELS, buildDefaultDocs, newCareerRequirement, normalizeCareerRequirement, statusLabel } from "./documents/document-utils.js";
import { CareerRequirementsTimeline } from "./careers/CareerRequirementsTimeline.jsx";
import { reportClientError, formatTime, formatDate } from "../client-utils.js";
import { KpiCard, NotificationPopup, Row } from "../shared/PortalWidgets.jsx";
import {
  onboardingState, originSave, dniExtract, dniSave, profileSave, livedAbroadSave, contractSave, onboardingCheckout,
  paymentsList, paymentsCheckout, paymentsVerify, adminPaymentsList, adminPaymentsUnlock, adminPaymentsSetAmount, adminPaymentsSetCarreras, adminPaymentsAdd, adminPaymentsDelete,
  adminListClients, adminListAllClients, adminAssignClient,
  careersListMine, adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign,
  documentsList, documentsGet, documentsUpload, adminDocumentsList, adminDocumentsReview, adminDocumentsAdd, adminDocumentsDelete,
  adminPhaseSet, adminDashboard, adminTaskCreate, adminTaskToggle, adminTaskDelete,
  bookingsList, bookingsCreate, bookingsAvailability,
  adminCareerSuggestions, adminCareerSuggestionsRegenerate, adminCareerSuggestionFeedback,
  chatAiList, chatAiSend, adminChatList, adminChatSend, adminChatResume,
  adminNotificationsList, adminNotificationCreate, notificationsPending, notificationAck,
} from "../api.js";

const { APPLICATION_TOTALS, FISCAL: ROBIN_FISCAL, isLatamClient } = financialConfig;
const { academicSystemLabel, academicLevelLabel } = academicSystemsConfig;
import { AdminChatIA } from "./AdminChatIA.jsx";
import { LivedAbroadCard } from "./StudentProfile.jsx";




function normalizeAdminClient(apiClient, adminId) {
  return {
    ...apiClient,
    nombre: apiClient.nombre || "",
    apellidos: apiClient.apellidos || "",
    direccion: apiClient.direccion || "",
    fecha_nacimiento: apiClient.fecha_nacimiento || "",
    dni_numero: apiClient.dni_numero || "",
    telefono_alumno: apiClient.telefono_alumno || "",
    intereses: apiClient.intereses || [],
    academic_system: apiClient.academic_system || null,
    academic_subjects: Array.isArray(apiClient.academic_subjects) ? apiClient.academic_subjects : [],
    assignedTo: apiClient.assigned_to || adminId,
  };
}





// =====================
//  ADMIN — INICIO (Dashboard) · v1
//  Filtra SIEMPRE por adminId (clientes asignados). NO modifica fases ni datos.
// =====================


// =====================
//  ADMIN — CHAT ASSISTANT (floating bottom-left)
//  Filtra por admin (backend hace assigned_to=email). Expandible.
// =====================
// =====================
//  ADMIN — PORTAL SHELL
// =====================
export function AdminPortal({ user }) {
  const adminId = (user.email || user.username || "").toLowerCase();
  const isDeveloper = adminId === "santimartin1203@gmail.com";
  const [data, setData] = useState({ clients: [] });
  const [{ active, selectedClientId }, dispatchNavigation] = useReducer(adminNavigation, INITIAL_ADMIN_NAVIGATION);
  const [mascot] = useState(() => [robinKeys, robinGraduate, robinSkate, robinBike][Math.floor(Math.random() * 4)]);
  const [searchQ, setSearchQ] = useState("");
  const debouncedQ = useDebounced(searchQ, 250);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Cargar clientes reales desde la API: filtra por admin (Notion -> assigned_to)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingClients(true); setLoadError("");
      try {
        const res = await adminListClients();
        if (cancel) return;
        const fromApi = (res.clients || []).map((c) => normalizeAdminClient(c, adminId));
        setData((prev) => ({ ...prev, clients: fromApi }));
      } catch (e) {
        if (cancel) return;
        // Limpiar lista para no mostrar contadores erróneos
        setData((prev) => ({ ...prev, clients: [] }));
        setLoadError(e.status === 401 || e.status === 403 ? "" : (e.message || "No se pudo cargar la lista de clientes."));
      } finally {
        if (!cancel) setLoadingClients(false);
      }
    })();
    return () => { cancel = true; };
  }, [adminId]);

  useEffect(() => {
    try { localStorage.removeItem(`pr_admin_v1_${adminId}`); } catch (error) { reportClientError("optional_operation", error); }
  }, [adminId]);
  const selectedClient = useMemo(
    () => (data.clients || []).find((c) => c.id === selectedClientId) || null,
    [data.clients, selectedClientId]
  );

  function updateClient(clientId, mut) {
    setData((d) => ({
      ...d,
      clients: (d.clients || []).map((c) => (c.id === clientId ? { ...mut(c), updatedAt: new Date().toISOString() } : c)),
    }));
  }

  function selectClient(c) {
    dispatchNavigation({ type: "open", clientId: c.id });
  }

  function navigate(section) {
    dispatchNavigation({ type: "navigate", section });
  }

  function switchClient(client) {
    dispatchNavigation({ type: "switch", clientId: client.id });
  }

  // ----- Asignación manual -----
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignList, setAssignList] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignBusyId, setAssignBusyId] = useState(null);

  async function reloadAssigned() {
    try {
      const res = await adminListClients();
      const fromApi = (res.clients || []).map((c) => normalizeAdminClient(c, adminId));
      setData((prev) => ({ ...prev, clients: fromApi }));
    } catch (error) { reportClientError("optional_operation", error); }
  }
  async function openAssignModal() {
    setAssignOpen(true); setAssignLoading(true); setAssignError("");
    try {
      const res = await adminListAllClients();
      setAssignList(res.clients || []);
    } catch (e) {
      setAssignError(e.message || "No se pudo cargar la lista de clientes.");
    } finally {
      setAssignLoading(false);
    }
  }
  async function doAssign(userId) {
    setAssignBusyId(userId); setAssignError("");
    try {
      await adminAssignClient(userId);
      // Refrescar lista del modal y la lista principal
      const res = await adminListAllClients();
      setAssignList(res.clients || []);
      await reloadAssigned();
    } catch (e) {
      setAssignError(e.message || "No se pudo asignar.");
    } finally {
      setAssignBusyId(null);
    }
  }

  // Filter (debounce)
  const visibleClients = useMemo(() => {
    const q = (debouncedQ || "").trim().toLowerCase();
    const list = data.clients || [];
    if (!q) return list;
    return list.filter((c) => {
      const hay = `${c.nombre || ""} ${c.apellidos || ""} ${c.email || ""} ${c.username || ""} ${c.lead_id || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data.clients, debouncedQ]);

  return (
    <>
      <AdminWorkspace active={active} client={selectedClient} clients={data.clients || []} isDeveloper={isDeveloper}
        loading={loadingClients} error={loadError} onNavigate={navigate} onSwitchClient={switchClient}>

          <main key={active + (selectedClient?.id || "list")}
            className="admin-content space-y-5 min-w-0" id="admin-content" tabIndex={-1}>

            {active === "inicio" && (
              <AdminDashboard
                user={user}
                onOpenClient={(c) => selectClient(c)}
                onOpenAssign={openAssignModal}
                onGotoTab={navigate}
              />
            )}

            {active === "clientes" && (
              <AdminClientesList
                clients={visibleClients}
                totalCount={(data.clients || []).length}
                searchQ={searchQ}
                onSearch={setSearchQ}
                onSelect={selectClient}
                loading={loadingClients}
                loadError={loadError}
                onOpenAssign={openAssignModal}
              />
            )}

            {active === "estado" && selectedClient && (
              <AdminEstadoFases client={selectedClient} onChangedPhase={(n) => updateClient(selectedClient.id, (c) => ({ ...c, application_phase: n }))} />
            )}
            {active === "perfil" && selectedClient && (
              <AdminPerfil client={selectedClient} onRefresh={reloadAssigned} />
            )}
            {active === "carreras" && selectedClient && (
              <AdminCarrerasNew client={selectedClient} />
            )}
            {active === "documentos" && selectedClient && (
              <AdminDocumentosNew client={selectedClient} />
            )}
            {active === "chat" && selectedClient && (
              <AdminChatIA client={selectedClient} />
            )}
            {active === "reservas" && selectedClient && (
              <AdminReservas client={selectedClient} />
            )}
            {active === "academico" && selectedClient && (
              <AdminPerfilAcademico client={selectedClient} />
            )}
            {active === "pagos" && selectedClient && (
              <AdminPagos client={selectedClient} />
            )}
            {active === "notificaciones" && (
              <AdminNotificaciones adminId={adminId} clients={data.clients || []} />
            )}
            {active === "faqs" && <AdminFaqManager />}
            {active === "base-datos" && isDeveloper && <DeveloperClientsTable />}

            <div className="text-center text-xs text-slate-400 py-2">
              Project Robin · Panel de administración
            </div>
          </main>
      <AdminChatAssistant key={selectedClient?.id || "general"} user={user} activeClientId={selectedClient?.id || null} clients={data.clients || []} mascot={mascot} />

      {assignOpen && (
        <AssignClientModal
          adminEmail={adminId}
          list={assignList}
          loading={assignLoading}
          error={assignError}
          busyId={assignBusyId}
          onAssign={doAssign}
          onClose={() => setAssignOpen(false)}
        />
      )}
      </AdminWorkspace>
    </>
  );
}

// =====================
//  ADMIN — PERFIL ACADÉMICO
// =====================


// =====================
//  ADMIN — NOTIFICACIONES
// =====================




// =====================
//  ADMIN — LISTA DE CLIENTES
// =====================





// =====================
//  ADMIN — PERFIL
// =====================


// =====================
//  ADMIN — CARRERAS
// =====================


// =====================
//  PAGOS — COMUNES
// =====================
// =====================
//  JUSTIFICANTE LOCAL (la factura fiscal oficial es el PDF de Holded)
// =====================
// Etiqueta de un pago: concepto (pagos extra) o "Cuota N de 3" (cuotas estándar).


// =====================
//  CONSTANTES FASES Y DOCS POR DEFECTO
// =====================
// =====================
//  CARRERAS — CLIENTE (read-only)
// =====================


// =====================
//  DOCUMENTOS — CLIENTE
// =====================


// =====================
//  ESTADO — ADMIN (5 fases)
// =====================
