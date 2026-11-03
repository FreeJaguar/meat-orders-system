import { describe, it, expect } from 'vitest';
import {
  isValidOrderMeasurement,
  updateOrderMeasurement,
  buildOrderItemPayload,
  restoreOrderMeasurement,
  getOrderItemDisplay
} from './orderMeasurements.js';

describe('Order measurement input and persistence', () => {
  it('accepts exactly one positive measurement (cartons / units / weight)', () => {
    [
      {quantity: 3, units: 0, weight: ''},
      {quantity: 0, units: 12, weight: ''},
      {quantity: 0, units: 0, weight: '2.75'},
      {quantity: 0, units: 0, weight: '1,5'}
    ].forEach(item => expect(isValidOrderMeasurement(item)).toBe(true));

    [
      {quantity: 0, units: 0, weight: ''},
      {quantity: 1, units: 2, weight: ''},
      {quantity: 0, units: 4, weight: '1'},
      {quantity: 1.5, units: 0, weight: ''},
      {quantity: 0, units: 2.5, weight: ''},
      {quantity: 0, units: 0, weight: '-4'},
      {quantity: 0, units: 0, weight: 'oops'}
    ].forEach(item => expect(isValidOrderMeasurement(item)).toBe(false));
  });

  it('switches between modes without losing notes', () => {
    const initial = {quantity: 2, units: 0, weight: '', notes: 'בלי עצמות'};
    expect(updateOrderMeasurement(initial, 'units', '8')).toEqual({
      quantity: 0, units: 8, weight: '', notes: 'בלי עצמות'
    });
    expect(updateOrderMeasurement(initial, 'weight', '1.5')).toEqual({
      quantity: 0, units: 0, weight: '1.5', notes: 'בלי עצמות'
    });
    const byUnits = updateOrderMeasurement(initial, 'units', 8);
    expect(updateOrderMeasurement(byUnits, 'quantity', 3)).toEqual({
      quantity: 3, units: 0, weight: '', notes: 'בלי עצמות'
    });
    expect(updateOrderMeasurement(byUnits, 'units', 0).units).toBe(0);
  });

  it('persists units without misrepresenting them as cartons', () => {
    const base = {product_id: 99, notes: 'דוגמה'};
    expect(buildOrderItemPayload({...base, quantity: 0, units: 12, weight: ''}, 7))
      .toEqual({order_id:7, product_id:99, quantity:1, units:12, weight:null, notes:'דוגמה'});
    expect(buildOrderItemPayload({...base, quantity: 0, units: 0, weight: '1,25'}, 7))
      .toEqual({order_id:7, product_id:99, quantity:1, units:null, weight:1.25, notes:'דוגמה'});
    expect(buildOrderItemPayload({...base, quantity: 5, units: 0, weight: ''}, 7))
      .toEqual({order_id:7, product_id:99, quantity:5, units:null, weight:null, notes:'דוגמה'});
  });

  it('restores units, weight and cartons when cloning/editing orders', () => {
    expect(restoreOrderMeasurement({quantity:1, units:14, weight:null, notes:'x'}))
      .toEqual({quantity:0, units:14, weight:'', notes:'x'});
    expect(restoreOrderMeasurement({quantity:1, weight:2.5, notes:'x'}))
      .toEqual({quantity:0, units:0, weight:'2.5', notes:'x'});
    expect(restoreOrderMeasurement({quantity:3, notes:'x'}))
      .toEqual({quantity:3, units:0, weight:'', notes:'x'});
    expect(restoreOrderMeasurement({quantity:1, notes:'משקל: 4.5 | הערה'}))
      .toEqual({quantity:0, units:0, weight:'4.5', notes:'הערה'});
  });

  it('displays units in warehouse and keeps legacy sausage quantities', () => {
    expect(getOrderItemDisplay({quantity:1,units:12}, {category:'בקר'}).text).toBe('12 יח׳');
    expect(getOrderItemDisplay({quantity:1,weight:2.5}, {category:'בקר'}).text).toBe('2.5 ק״ג');
    expect(getOrderItemDisplay({quantity:3}, {category:'בקר'}).text).toBe('3 קר׳');
    expect(getOrderItemDisplay({quantity:3}, {category:'נקניקים'}).text).toBe('3 יח׳');
  });
});
