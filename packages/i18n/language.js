import english from './en.json' with { type: 'json' };

export const LANGUAGE_KEY = 'robin_language';
const listeners = new Set();
const validLanguage = value => value === 'en' ? 'en' : 'es';

function storedLanguage() {
  try { return validLanguage(window.localStorage.getItem(LANGUAGE_KEY)); }
  catch { return 'es'; }
}

let language = storedLanguage();
let enabled = true;
export const getLanguage = () => enabled ? language : 'es';
export const getLocale = () => getLanguage() === 'en' ? 'en-GB' : 'es-ES';

export function setTranslationsEnabled(value) {
  enabled = value;
  updateLanguage(language);
}

function updateLanguage(value) {
  language = validLanguage(value);
  if (typeof document !== 'undefined') document.documentElement.lang = getLanguage();
  listeners.forEach(listener => listener());
}

export function setLanguage(value) {
  if (value !== 'es' && value !== 'en') return;
  try { window.localStorage.setItem(LANGUAGE_KEY, value); } catch { /* Private browsing may disable storage. */ }
  updateLanguage(value);
}

export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === LANGUAGE_KEY || event.key === null) updateLanguage(storedLanguage());
  });
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

// Only call this for interface copy, never names, messages or other client content.
// The original Spanish copy doubles as a readable key and a safe fallback.
export function t(message, values = []) {
  if (typeof message !== 'string') return message;
  const key = message.replace(/\s+/g, ' ').trim();
  const translated = getLanguage() === 'en' && Object.prototype.hasOwnProperty.call(english, key)
    ? message.match(/^\s*/)[0] + english[key] + message.match(/\s*$/)[0]
    : message;
  return translated.replace(/\{(\d+)\}/g, (match, index) => values[index] == null ? match : String(values[index]));
}
