export function normalizeHebrewText(value) {
  return String(value || '').trim().normalize('NFC');
}

export function isSausageUnitProduct(product) {
  return normalizeHebrewText(product?.category) === 'נקניקים';
}

export function getQuantityUnit(product) {
  return isSausageUnitProduct(product) ? 'יח׳' : 'קר׳';
}

export function isSausagePrintExtraPageProduct(product) {
  return isSausageUnitProduct(product);
}
