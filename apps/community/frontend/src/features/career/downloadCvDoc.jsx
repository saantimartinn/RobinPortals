// Career feature UI for download cv doc; the application shell selects this view.
import React from "react";
import { cvBuildHtml } from "./cvBuildHtml.jsx";

function downloadCvDoc(cv) {
  const inner = cvBuildHtml(cv);
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body>${inner}</body></html>`;
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `CV_${((cv && cv.name) || "Robin").replace(/\s+/g, "_")}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { downloadCvDoc };
