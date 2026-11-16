// Escapes user-supplied strings before inserting them into print HTML
// built via document.write() in the warehouse print window.
export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDeliveryDate(deliveryDate) {
  if (!deliveryDate) return '';
  return new Date(deliveryDate).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Prominent banner repeated at the top of every printed warehouse page/section
// so pages can't be mixed up between different customers' orders.
export function renderPrintPageHeader(order) {
  const customerCode = order?.customers?.code ?? 'לא צוין';
  const customerName = order?.customers?.name || '';
  const deliveryDate = formatDeliveryDate(order?.delivery_date);
  const itemCount = order?.order_items?.length ?? 0;

  const metaParts = [];
  if (deliveryDate) metaParts.push(`תאריך אספקה: ${escapeHtml(deliveryDate)}`);
  metaParts.push(`כמות פריטים בהזמנה: ${itemCount}`);

  return `
    <div class="print-page-header">
      <div class="print-page-header-name">קוד לקוח: ${escapeHtml(customerCode)}</div>
      ${customerName ? `<div class="print-page-header-customer-name">${escapeHtml(customerName)}</div>` : ''}
      <div class="print-page-header-meta">${metaParts.join(' | ')}</div>
    </div>
  `;
}
