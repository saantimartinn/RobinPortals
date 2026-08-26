
function cityVisible(item, ciudad, showAll) {
  if (showAll) return true;
  if (!item.city) return true;            // sin ciudad = Nacional, lo ven todos
  if (!ciudad) return true;               // usuario sin ciudad definida ve todo
  return String(item.city).toLowerCase() === String(ciudad).toLowerCase();
}

export { cityVisible };
