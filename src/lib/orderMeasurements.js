import { getItemWeightAndNotes } from './orderUtils.js';
import { getQuantityUnit } from './productUnits.js';

// Each order line measures exactly one of cartons, individual units, or kilograms.
// The existing database quantity field is mandatory, so weight and unit lines
// store quantity=1 only as a database placeholder, never as one carton.
export function isValidOrderMeasurement(item) {
  const cartons = item.quantity === '' || item.quantity == null ? 0 : Number(item.quantity);
  const units = item.units === '' || item.units == null ? 0 : Number(item.units);
  const weightText = String(item.weight ?? '').trim().replace(',', '.');
  const weight = weightText === '' ? 0 : Number(weightText);

  if (!Number.isSafeInteger(cartons) || cartons < 0 ||
      !Number.isSafeInteger(units) || units < 0 ||
      !Number.isFinite(weight) || weight < 0) return false;

  return Number(cartons > 0) + Number(units > 0) + Number(weight > 0) === 1;
}

// A user may clear one field before filling the next; do not remove the line.
export function updateOrderMeasurement(item, field, rawValue) {
  if (field === 'quantity' || field === 'units') {
    const number = rawValue === '' || rawValue == null ? 0 : Number(rawValue);
    const value = Number.isFinite(number) ? Math.max(0, number) : 0;
    return value > 0
      ? { ...item, quantity: field === 'quantity' ? value : 0,
          units: field === 'units' ? value : 0, weight: '' }
      : { ...item, [field]: value };
  }
  if (field === 'weight') {
    const weight = String(rawValue ?? '');
    return weight.trim()
      ? { ...item, weight, quantity: 0, units: 0 }
      : { ...item, weight };
  }
  return { ...item, [field]: rawValue };
}

export function buildOrderItemPayload(item, orderId) {
  if (!isValidOrderMeasurement(item)) {
    throw new Error('יש להגדיר קרטונים, יחידות או משקל תקין עבור כל מוצר');
  }
  const cartons = Number(item.quantity || 0);
  const units = Number(item.units || 0);
  const weightText = String(item.weight ?? '').trim().replace(',', '.');
  return {
    order_id: orderId,
    product_id: item.product_id,
    quantity: cartons > 0 ? cartons : 1,
    units: units > 0 ? units : null,
    weight: weightText ? Number(weightText) : null,
    notes: item.notes || ''
  };
}

// Reads both modern numeric weight and historical "משקל: x | notes" records.
export function getOrderItemDisplay(item, product) {
  const units = Number(item.units || 0);
  if (Number.isSafeInteger(units) && units > 0) {
    return { mode: 'units', value: String(units), unit: 'יח׳', text: `${units} יח׳` };
  }
  const { weight } = getItemWeightAndNotes(item);
  if (weight && String(weight).trim()) {
    const value = String(weight).trim();
    const unit = 'ק״ג';
    return {
      mode: 'weight', value, unit,
      text: /(?:ק["״]?ג|kg)/i.test(value) ? value : `${value} ${unit}`
    };
  }
  const value = String(item.quantity ?? 0);
  const unit = getQuantityUnit(product);
  return { mode: 'cartons', value, unit, text: `${value} ${unit}` };
}

export function restoreOrderMeasurement(item) {
  const { weight, notes } = getItemWeightAndNotes(item);
  const units = Number(item.units || 0);
  const hasUnits = Number.isSafeInteger(units) && units > 0;
  return {
    quantity: hasUnits || Boolean(weight) ? 0 : (item.quantity || 0),
    units: hasUnits ? units : 0,
    weight: hasUnits ? '' : weight,
    notes
  };
}
