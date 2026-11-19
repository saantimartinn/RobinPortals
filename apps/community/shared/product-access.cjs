// Shared view policy; the backend supplies the mode after resolving real products.
const ARRIVAL_TABS = Object.freeze(['home', 'llamadas', 'partners', 'pagos', 'soporte', 'faqs', 'ajustes']);
function isArrivalOnly(user) { return user?.community_access === 'arrival'; }
function canOpenTab(user, tab) { return !isArrivalOnly(user) || ARRIVAL_TABS.includes(tab); }
function visibleFaqs(rows, arrivalOnly, includeArrival = false) {
  const visible = (rows || []).filter(row => {
    const products = row.products || ['community'];
    return products.includes(arrivalOnly ? 'pack_llegada' : 'community') || (includeArrival && products.includes('pack_llegada'));
  });
  if (arrivalOnly || includeArrival) {
    const specific = row => !!(row.products?.includes('pack_llegada') && !row.products.includes('community'));
    visible.sort((a, b) => Number(specific(b)) - Number(specific(a)));
  }
  return visible;
}
module.exports = { ARRIVAL_TABS, isArrivalOnly, canOpenTab, visibleFaqs };
