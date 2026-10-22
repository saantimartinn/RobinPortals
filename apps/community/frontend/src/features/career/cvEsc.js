// Career feature UI for cv esc; the application shell selects this view.

function cvEsc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export { cvEsc };
