import React, { useSyncExternalStore } from 'react';
import { getLanguage, setLanguage, subscribeLanguage } from './language.js';
import './selector.css';

export { t, getLocale, getLanguage } from './language.js';

// Subscribing in each translated component updates copy without remounting forms.
export function useLocale() {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

export function LanguageSelector({ className = '' }) {
  const language = useLocale();
  return <label className={`robin-language ${className}`}>
    <span className="robin-language-label">Idioma / Language</span>
    <select aria-label="Idioma / Language" value={language} onChange={event => setLanguage(event.target.value)}>
      <option value="es" lang="es">ESPAÑOL</option>
      <option value="en" lang="en">INGLÉS</option>
    </select>
  </label>;
}
