// Career feature UI for cv build html; the application shell selects this view.
import React from "react";
import { cvEsc } from "./cvEsc.js";

function cvBuildHtml(cv) {
  cv = cv || {};
  const c = cv.contact || {};
  const contactLine = [c.email, c.phone, c.location, c.links].filter(Boolean).map(cvEsc).join("  •  ");
  const exp = (cv.experience || []).map((e) => `
    <div style="margin-bottom:8px">
      <div><strong>${cvEsc(e.role)}</strong>${e.company ? ` — ${cvEsc(e.company)}` : ""}</div>
      <div style="color:#4E5979;font-size:12px">${[cvEsc(e.location), cvEsc(e.dates)].filter(Boolean).join(" · ")}</div>
      ${(e.bullets || []).length ? `<ul style="margin:4px 0 0 18px">${(e.bullets || []).map((b) => `<li>${cvEsc(b)}</li>`).join("")}</ul>` : ""}
    </div>`).join("");
  const edu = (cv.education || []).map((e) => `
    <div style="margin-bottom:6px">
      <div><strong>${cvEsc(e.title)}</strong>${e.institution ? ` — ${cvEsc(e.institution)}` : ""}</div>
      <div style="color:#4E5979;font-size:12px">${cvEsc(e.dates)}</div>
      ${e.details ? `<div style="font-size:13px">${cvEsc(e.details)}</div>` : ""}
    </div>`).join("");
  const extras = (cv.extras || []).filter((x) => x && (x.title || x.detail)).map((x) => `<div><strong>${cvEsc(x.title)}:</strong> ${cvEsc(x.detail)}</div>`).join("");
  const sec = (title, inner) => inner ? `<h2 style="font-size:14px;color:#2D3A64;border-bottom:1px solid #C3C5C1;padding-bottom:2px;margin:14px 0 6px">${cvEsc(title)}</h2>${inner}` : "";
  return `<div style="font-family:Calibri,Arial,sans-serif;color:#2D3A64;font-size:13px;line-height:1.45">
    <h1 style="font-size:22px;margin:0 0 2px;color:#2D3A64">${cvEsc(cv.name) || "[Tu nombre]"}</h1>
    ${cv.headline ? `<div style="font-size:14px;color:#2D3A64;margin-bottom:2px">${cvEsc(cv.headline)}</div>` : ""}
    ${contactLine ? `<div style="font-size:12px;color:#4E5979">${contactLine}</div>` : ""}
    ${sec("Perfil", cv.summary ? `<div>${cvEsc(cv.summary)}</div>` : "")}
    ${sec("Experiencia", exp)}
    ${sec("Educación", edu)}
    ${sec("Habilidades", (cv.skills || []).length ? `<div>${(cv.skills || []).map(cvEsc).join("  •  ")}</div>` : "")}
    ${sec("Idiomas", (cv.languages || []).length ? `<div>${(cv.languages || []).map(cvEsc).join("  •  ")}</div>` : "")}
    ${sec("Otros", extras)}
  </div>`;
}

export { cvBuildHtml };
