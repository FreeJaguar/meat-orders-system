import { describe, it, expect } from 'vitest';
import {
  normalizeHebrewText,
  isSausageUnitProduct,
  getQuantityUnit,
  isSausagePrintExtraPageProduct
} from './productUnits.js';

describe('normalizeHebrewText', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeHebrewText('  שלום  ')).toBe('שלום');
  });
  it('returns empty string for null', () => {
    expect(normalizeHebrewText(null)).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(normalizeHebrewText(undefined)).toBe('');
  });
  it('returns empty string for empty input', () => {
    expect(normalizeHebrewText('')).toBe('');
  });
});

describe('isSausageUnitProduct', () => {
  it('returns true for category נקניקים', () => {
    expect(isSausageUnitProduct({ category: 'נקניקים' })).toBe(true);
  });
  it('returns false for מוסדי', () => {
    expect(isSausageUnitProduct({ category: 'מוסדי' })).toBe(false);
  });
  it('returns false for מוצרי בקר', () => {
    expect(isSausageUnitProduct({ category: 'מוצרי בקר' })).toBe(false);
  });
  it('returns false for empty category string', () => {
    expect(isSausageUnitProduct({ category: '' })).toBe(false);
  });
  it('returns false for null product', () => {
    expect(isSausageUnitProduct(null)).toBe(false);
  });
  it('returns false for product with no category field', () => {
    expect(isSausageUnitProduct({})).toBe(false);
  });
});

describe('getQuantityUnit', () => {
  it('returns יח׳ for נקניקים', () => {
    expect(getQuantityUnit({ category: 'נקניקים' })).toBe('יח׳');
  });
  it('returns קר׳ for מוסדי', () => {
    expect(getQuantityUnit({ category: 'מוסדי' })).toBe('קר׳');
  });
  it('returns קר׳ for מוצרי הודו', () => {
    expect(getQuantityUnit({ category: 'מוצרי הודו' })).toBe('קר׳');
  });
  it('returns קר׳ for כבש', () => {
    expect(getQuantityUnit({ category: 'כבש' })).toBe('קר׳');
  });
  it('returns קר׳ for null product', () => {
    expect(getQuantityUnit(null)).toBe('קר׳');
  });
  it('returns קר׳ for product with no category', () => {
    expect(getQuantityUnit({})).toBe('קר׳');
  });
});

describe('isSausagePrintExtraPageProduct', () => {
  it('returns true for נקניקים', () => {
    expect(isSausagePrintExtraPageProduct({ category: 'נקניקים' })).toBe(true);
  });
  it('returns false for כבש', () => {
    expect(isSausagePrintExtraPageProduct({ category: 'כבש' })).toBe(false);
  });
  it('returns false for null', () => {
    expect(isSausagePrintExtraPageProduct(null)).toBe(false);
  });
});
