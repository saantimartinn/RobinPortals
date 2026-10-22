// Auth feature UI for use subscriber auth; the application shell selects this view.
import { useEffect, useState } from "react";
import { discountValidate, requestPasswordReset, resetPassword } from "../../api/index.js";

export function useSubscriberAuth({ onLogin, onSignup }) {
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("reset_token") || "";
  });
  const [tab, setTab] = useState(() => resetToken ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function removeResetTokenFromAddress() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("reset_token");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }

  useEffect(() => {
    if (resetToken) removeResetTokenFromAddress();
  }, []);

  function clearResetLink() {
    setResetToken("");
    removeResetTokenFromAddress();
  }

  async function submitLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try { await onLogin(email, password); }
    catch (e) {
      setError(e.status === 401 ? "Usuario o contraseña incorrectos." : e.message || "No hemos podido iniciar sesión.");
    } finally { setLoading(false); }
  }

  async function submitForgotPassword() {
    if (!email) { setError("Introduce tu correo electrónico."); return; }
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setTab("forgot-sent");
    } catch (e) {
      setError(e.message || "No hemos podido enviar el enlace. Inténtalo de nuevo.");
    } finally { setLoading(false); }
  }

  async function submitResetPassword() {
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    setError("");
    try {
      await resetPassword(resetToken, password);
      clearResetLink();
      setPassword("");
      setConfirm("");
      setTab("reset-done");
    } catch (e) {
      if (e.data?.error === "invalid_or_expired_token") setError("Este enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.");
      else if (e.data?.error === "weak_password") setError("La contraseña debe tener entre 8 y 72 caracteres.");
      else setError(e.message || "No hemos podido cambiar la contraseña.");
    } finally { setLoading(false); }
  }

  async function checkDiscount() {
    const code = discountCode.trim();
    if (!code) { setDiscountInfo(null); return; }
    setCheckingCode(true);
    try {
      const result = await discountValidate(code);
      setDiscountInfo(result?.valid ? { valid: true, percent_off: result.percent_off } : { valid: false });
    } catch {
      setDiscountInfo({ valid: false });
    } finally { setCheckingCode(false); }
  }

  async function submitSignup() {
    if (!name || !email || !password) return;
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (!tcAccepted) { setError("Debes aceptar los Términos y Condiciones para crear la cuenta."); return; }
    setLoading(true);
    setError("");
    try { await onSignup(name, email, password, ciudad, discountCode.trim() || undefined, tcAccepted); }
    catch (e) {
      setError(e.data?.error === "email_in_use" ? "Ya existe una cuenta con ese correo." : e.message || "No hemos podido crear la cuenta.");
    } finally { setLoading(false); }
  }

  return {
    tab, setTab, email, setEmail, password, setPassword, name, setName, confirm, setConfirm,
    ciudad, setCiudad, discountCode, setDiscountCode, discountInfo, setDiscountInfo,
    checkingCode, tcAccepted, setTcAccepted, showTerms, setShowTerms, error, setError,
    loading, submitLogin, submitForgotPassword, submitResetPassword, checkDiscount,
    submitSignup, clearResetLink,
  };
}
