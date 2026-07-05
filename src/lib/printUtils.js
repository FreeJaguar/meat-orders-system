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
  const customerName = order?.customers?.name || 'לא צוין';
  const deliveryDate = formatDeliveryDate(order?.delivery_date);
  const orderNumber = order?.order_number || '';

  const metaParts = [];
  if (deliveryDate) metaParts.push(`תאריך אספקה: ${escapeHtml(deliveryDate)}`);
  if (orderNumber) metaParts.push(`מספר הזמנה: ${escapeHtml(orderNumber)}`);

  return `
    <div class="print-page-header">
      <div class="print-page-header-name">לקוח: ${escapeHtml(customerName)}</div>
      ${metaParts.length ? `<div class="print-page-header-meta">${metaParts.join(' | ')}</div>` : ''}
    </div>
  `;
}
