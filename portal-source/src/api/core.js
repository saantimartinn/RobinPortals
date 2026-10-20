import { getLocalPreviewResponse } from "../preview-api.js";

async function request(method, url, body) {
  const preview = await getLocalPreviewResponse(method, url);
  if (preview?.active) return preview.data;
  const opts = { method, credentials: "same-origin", headers: {} };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const publicUrl = typeof window !== "undefined"
    && /(^|\.)project-robin\.com$/i.test(window.location.hostname)
    && url.startsWith("/api/")
      ? "/portal" + url
      : url;
  const resp = await fetch(publicUrl, opts);
  let data = null;
  try { data = await resp.json(); } catch (error) { console.warn("[api] optional operation failed", error && error.message); }
  if (!resp.ok) {
    const err = new Error(
      (data && (data.error + (data.detail ? ": " + data.detail : ""))) ||
        "HTTP " + resp.status
    );
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
};

