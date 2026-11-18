// Contract email rendering; HTTP handling stays in the onboarding Function.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/** HTML breve del correo (cuerpo); el contrato completo va como PDF adjunto. */
function buildCoverHtml({ clienteNombre, alumnoNombre, fechaStr, leadId, tipoTitulo }) {
  return '<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#334155;">' +
  '<div style="max-width:600px;margin:0 auto;padding:24px;">' +
    '<div style="background:#1B2F6E;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;">' +
      '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.7;">Project Robin</div>' +
      '<div style="font-size:18px;font-weight:bold;margin-top:4px;">' + esc(tipoTitulo) + '</div>' +
    '</div>' +
    '<div style="background:#fff;padding:22px;border:1px solid #e2e8f0;border-top:0;font-size:14px;line-height:1.6;border-radius:0 0 12px 12px;">' +
      '<p>Hola,</p>' +
      '<p>Adjuntamos la <strong>copia firmada del contrato</strong> entre PROJECT ROBIN STUDENTS MOBILITY S.L. y <strong>' + esc(clienteNombre) + '</strong> en relación con <strong>' + esc(alumnoNombre) + '</strong>.</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">' +
        '<tr><td style="padding:6px 0;color:#64748b;width:140px;">Cliente:</td><td><strong>' + esc(clienteNombre) + '</strong></td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b;">Alumno:</td><td>' + esc(alumnoNombre) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b;">ID cliente:</td><td>' + esc(leadId) + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#64748b;">Fecha de firma:</td><td>' + esc(fechaStr) + '</td></tr>' +
      '</table>' +
      '<p style="font-size:12px;color:#64748b;">El PDF adjunto contiene el contrato íntegro con los datos rellenos y la firma del cliente.</p>' +
    '</div>' +
  '</div></body></html>';
}

module.exports = { buildCoverHtml };
