// Portal view or navigation module for application portals; the application shell owns session state.
import React, { useMemo, useState, useEffect, useRef } from "react";
import "./student-portal.css";
import { StudentAssistant } from "./PortalAssistant.jsx";
import { StudentPlanCalendar } from "./StudentPlanCalendar.jsx";
import { Estado } from "./StudentStatus.jsx";
import { Perfil } from "./StudentProfile.jsx";
import { Reservas } from "./BookingsPortal.jsx";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MessageCircle, Calendar, CalendarDays, FileText, LayoutDashboard,
  Shield, CheckCircle2, UploadCloud, Search,
  Users, Download, Eye, Plus, Trash2, ChevronRight,
  BookOpen, MapPin, CreditCard, Loader2, Mail, AlertCircle,
  ChevronLeft, Sparkles, RefreshCw, ExternalLink, GraduationCap, ChevronDown,
  Home, Building2, Briefcase, Plane, PartyPopper, Dumbbell,
  LifeBuoy, Settings, Star, Percent, Clock, PauseCircle, HelpCircle, Send,
  Tag, Wallet, Receipt, Handshake, CalendarCheck, XCircle, HeartHandshake,
  Compass, MessagesSquare, Pencil, Bell, Lock, X, ArrowUpRight, ArrowRight,
} from "lucide-react";
import robinKeys from "../assets/robin-keys.webp";
import robinGraduate from "../assets/robin-graduate.jpg";
import robinSkate from "../assets/robin-skate.png";
import robinBike from "../assets/robin-bike.jpg";
import financialConfig from "../../../shared/financial-config.cjs";
import { APP_STEPS } from "../application-steps.js";
import { uid } from "../browser-utils.js";
import { CREAM, GOLD, NAVY, NAVY_DARK } from "../theme.js";
import { Badge, Btn, Card, CardContent, CardHeader, Divider, Field, SelectField, TextareaField } from "../ui.jsx";
import { daysBetween, eur, PaymentStatusBadge, paymentTitle } from "./payments/payment-utils.jsx";
import { reportClientError, formatTime, formatDate } from "../client-utils.js";
import { KpiCard, NotificationPopup, Row } from "../shared/PortalWidgets.jsx";
import { CarrerasCliente, DocumentosCliente, PagosCliente } from "./ClientSections.jsx";
import { FaqsPage } from "./Faqs.jsx";
import {
  onboardingState, originSave, dniExtract, dniSave, profileSave, livedAbroadSave, contractSave, onboardingCheckout,
  paymentsList, paymentsCheckout, paymentsVerify, adminPaymentsList, adminPaymentsUnlock, adminPaymentsSetAmount, adminPaymentsSetCarreras, adminPaymentsAdd, adminPaymentsDelete,
  adminListClients, adminListAllClients, adminAssignClient,
  careersListMine, adminCareersListAll, adminCareersCreate, adminCareersDelete, adminCareersAssign, adminCareersUnassign,
  documentsList, documentsGet, documentsUpload, adminDocumentsList, adminDocumentsReview, adminDocumentsAdd, adminDocumentsDelete,
  adminPhaseSet, adminDashboard, adminTaskCreate, adminTaskToggle, adminTaskDelete,
  adminAssistant, adminHistorialAdd, bookingsList, bookingsCreate, bookingsAvailability,
  adminCareerSuggestions, adminCareerSuggestionsRegenerate,
  chatAiList, chatAiSend, adminChatList, adminChatSend, adminChatResume,
  adminNotificationsList, adminNotificationCreate, notificationsPending, notificationAck,
  profileAvatarUpload,
} from "../api.js";

const { APPLICATION_TOTALS, FISCAL: ROBIN_FISCAL } = financialConfig;

export function PortalShell({ user, clientName, onLogout, active, setActive, onUserRefresh }) {
  const [profilePhoto, setProfilePhoto] = useState(user.avatar_url || null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [mascot] = useState(() => [robinKeys, robinGraduate, robinSkate, robinBike][Math.floor(Math.random() * 4)]);
  const [summary, setSummary] = useState({ documents: null, bookings: null });
  useEffect(() => { setProfilePhoto(user.avatar_url || null); }, [user.avatar_url]);
  useEffect(() => {
    if (active !== "estado") return;
    let cancelled = false;
    Promise.allSettled([documentsList(), bookingsList()]).then(([docs, calls]) => {
      if (cancelled) return;
      setSummary({
        documents: docs.status === "fulfilled" ? (docs.value.documents || []).filter(d => ["required", "rejected"].includes(d.status)).length : null,
        bookings: calls.status === "fulfilled" ? (calls.value.bookings || []).filter(b => b.status !== "cancelled" && new Date(b.start_at) > new Date()).length : null,
      });
    });
    return () => { cancelled = true; };
  }, [active, user.id]);
  const navigation = [
    { key: "estado", label: "Mi camino", icon: LayoutDashboard },
    { key: "plan", label: "Mi plan", icon: CalendarDays },
    { key: "carreras", label: "Mis carreras", icon: BookOpen },
    { key: "documentos", label: "Documentos", icon: FileText },
    { key: "reservas", label: "Mis llamadas", icon: Calendar },
    { key: "pagos", label: "Pagos", icon: CreditCard },
    { key: "faqs", label: "FAQs", icon: HelpCircle },
    { key: "perfil", label: "Mi perfil", icon: User },
  ];

  function openFaqCitation(number) {
    const hash = `#faq-${number}`;
    try { window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}${hash}`); }
    catch (_error) { window.location.hash = hash; }
    setActive("faqs");
  }

  async function changePhoto(file) {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const result = await profileAvatarUpload(file);
      setProfilePhoto(result.avatar_url || null);
      await onUserRefresh?.();
    } catch (error) {
      setPhotoError(error.message || "No se pudo guardar la foto.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const intereses = (user.intereses || []).map((k) => {
    const map = {
      ciencias: "Ciencias", tecnologia_y_programacion: "Tecnología", business: "Business",
      ciencias_de_la_salud: "Salud", ingenierias: "Ingeniería", ciencias_sociales: "Sociales", artes: "Artes",
    };
    return map[k] || k;
  });

  return (
    <div className="student-portal">
      <NotificationPopup />
      <a className="student-skip" href="#student-content">Saltar al contenido</a>
      <div className="student-layout">
        <nav className="student-sidebar" aria-label="Navegación del alumno">
          <div className="student-identity">
            <div className="student-avatar">{profilePhoto ? <img src={profilePhoto} alt="Tu foto de perfil" /> : (clientName || "R").charAt(0).toUpperCase()}</div>
            <div><strong>{clientName}</strong><span>Estudiante Robin Jr</span></div>
          </div>
          <p className="student-nav-caption">TU ESPACIO</p>
          <div className="student-nav-items">
            {navigation.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setActive(key)} aria-current={active === key ? "page" : undefined} className={`student-nav-item ${active === key ? "is-active" : ""}`}><Icon size={19} /><span>{label}</span>{active === key && <span className="student-nav-dot" />}</button>)}
          </div>
          <div className="student-support"><span className="student-eyebrow">ROBIN JR</span><h3>Tu futuro empieza con una idea.</h3><p>Habla con tu asesor y descubre las opciones que encajan contigo.</p><button onClick={() => setActive("reservas")}>Hablar con mi asesor <ArrowUpRight size={16} /></button></div>
        </nav>

        <AnimatePresence mode="wait">
          <motion.main key={active}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }} className="student-main" id="student-content" tabIndex={-1}>
            {active !== "estado" && <div className="student-page-heading"><h1 className="student-eyebrow student-page-title">{navigation.find(item => item.key === active)?.label || "Mi camino"}</h1></div>}

            {active === "estado" && (
              <Estado step={user.application_phase || 1} onNavigate={setActive} docsPendingCount={summary.documents} bookingsCount={summary.bookings} />
            )}
            {active === "plan" && <StudentPlanCalendar />}
            {active === "perfil" && (
              <Perfil user={user} clientName={clientName} profilePhoto={profilePhoto} onPhotoChange={changePhoto} photoBusy={photoBusy} photoError={photoError} intereses={intereses} onUserRefresh={onUserRefresh} />
            )}
            {active === "carreras" && (
              <CarrerasCliente />
            )}
            {active === "documentos" && (
              <DocumentosCliente />
            )}
            {active === "reservas" && (
              <Reservas />
            )}
            {active === "pagos" && (
              <PagosCliente />
            )}
            {active === "faqs" && <FaqsPage />}

            <footer className="student-footer"><span>ROBIN JR</span><span>The world is your campus.</span></footer>
          </motion.main>
        </AnimatePresence>
      </div>
      <StudentAssistant open={chatOpen} onOpenChange={setChatOpen} mascot={mascot} onOpenFaq={openFaqCitation} />
    </div>
  );
}

// =====================
//  ESTADO
// =====================




// =====================
//  PERFIL
// =====================




// =====================
//  CARRERAS
// =====================


// =====================
//  DOCUMENTOS
// =====================


// =====================
//  CHAT CON IA — ALUMNO  (habla con la IA; un asesor puede intervenir)
// =====================


// =====================
//  CHAT CON IA — ASESOR  (ve la conversación del alumno con la IA e interviene)
// =====================


// =====================
//  CHAT
// =====================


// =====================
//  ADMIN — HOOK debounce
// =====================
