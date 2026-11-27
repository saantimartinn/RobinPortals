// The iOS shell presents product sections below its WebView. Browser navigation stays unchanged.
export function connectNativeSections({ items, active, onSelect }) {
  const bridge = typeof window === 'undefined' ? null : window.webkit?.messageHandlers?.robinAuth;
  if (!bridge) return () => {};
  const sections = items
    .filter(item => /^[a-z0-9_-]{1,64}$/.test(item.key) && typeof item.label === 'string')
    .map(({ key, label }) => ({ key, label: label.slice(0, 80) }));
  const select = event => {
    const key = event.detail?.key;
    if (sections.some(section => section.key === key)) onSelect(key);
  };
  window.addEventListener('robin-native-select-section', select);
  bridge.postMessage({ action: 'nativeSections', active, items: sections });
  return () => window.removeEventListener('robin-native-select-section', select);
}
