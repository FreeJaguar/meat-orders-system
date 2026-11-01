export function validateProduct(product) {
  if (!String(product.name || '').trim()) return 'חובה להזין שם מוצר';
  if (!String(product.category || '').trim()) return 'חובה להזין קטגוריה';
  if (!String(product.unit || '').trim()) return 'חובה להזין יחידת מידה';
  if (product.price !== '' && product.price != null && (!Number.isFinite(Number(product.price)) || Number(product.price) < 0)) return 'המחיר אינו תקין';
  return '';
}
export function productPayload(product) {
  return {
    name: product.name.trim(),
    category: product.category.trim(),
    barcode: product.barcode?.trim() || null,
    unit: product.unit.trim(),
    price: product.price === '' || product.price == null ? null : Number(product.price),
    is_active: Boolean(product.is_active)
  };
}
