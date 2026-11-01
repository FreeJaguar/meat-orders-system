import { describe, it, expect } from 'vitest';
import { validateProduct, productPayload } from './productManagement';
describe('product management', () => {
  const product = { name: '  חזה עוף ', category: ' מוצרי הודו ', unit: 'קר', barcode: ' 00123 ', price: '25.5', is_active: true };
  it('requires a product name, category and unit', () => {
    expect(validateProduct({ ...product, name: '' })).toMatch(/שם מוצר/);
    expect(validateProduct({ ...product, category: '' })).toMatch(/קטגוריה/);
    expect(validateProduct({ ...product, unit: '' })).toMatch(/יחידת מידה/);
    expect(validateProduct(product)).toBe('');
  });
  it('validates prices', () => {
    expect(validateProduct({ ...product, price: '-3' })).toMatch(/מחיר/);
    expect(validateProduct({ ...product, price: 'not a number' })).toMatch(/מחיר/);
  });
  it('normalizes data for Supabase', () => {
    expect(productPayload(product)).toEqual({ name: 'חזה עוף', category: 'מוצרי הודו', unit: 'קר', barcode: '00123', price: 25.5, is_active: true });
  });
  it('stores missing optional price and barcode as null', () => {
    expect(productPayload({ ...product, barcode: '', price: '' })).toMatchObject({ barcode: null, price: null });
  });
});
