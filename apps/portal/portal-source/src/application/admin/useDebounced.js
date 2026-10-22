// Admin workspace module for use debounced; AdminPortal composes these views.
import { useState, useEffect } from "react";

export function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
