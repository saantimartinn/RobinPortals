# Uso de IA

La función subscriber-cv-ai recibe texto/archivo y lo procesa con Anthropic a través
de backend/lib/anthropic-chat.js. DOCX se extrae con mammoth. ANTHROPIC_API_KEY nunca
se entrega al navegador. ANTHROPIC_MODEL permite configurar el modelo.

El proveedor recibe información personal del CV. Antes de producción, revisar
consentimiento, retención y límites de carga/coste. La salida debe ser revisada por
el usuario; no se presenta como una verificación de su experiencia profesional.
