// Admin feature UI for to local input; the application shell selects this view.

function toLocalInput(v, dateOnly) {
  if (!v) return "";
  try {
    const d = new Date(v);
    const pad = (n) => String(n).padStart(2, "0");
    const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return dateOnly ? s : `${s}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

export { toLocalInput };
