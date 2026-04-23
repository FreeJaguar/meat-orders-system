// Parses the legacy serialized notes field format: "משקל: {weight} | {notes}"
// Used for backward compatibility with old order_items rows that stored weight
// inside the notes string before the weight column was added.
export function parseItemNotes(raw) {
  const result = { weight: '', notes: '' };
  if (!raw) return result;

  const text = String(raw).trim();

  if (text.includes(' | ')) {
    const idx = text.indexOf(' | ');
    const p1 = text.slice(0, idx).trim();
    const p2 = text.slice(idx + 3).trim();

    if (p1.startsWith('משקל:')) {
      result.weight = p1.replace('משקל:', '').trim();
      result.notes = p2;
    } else {
      result.notes = [p1, p2].filter(Boolean).join(' ');
    }
    return result;
  }

  if (text.startsWith('משקל:')) {
    result.weight = text.replace('משקל:', '').trim();
  } else {
    result.notes = text;
  }

  return result;
}

// Returns { weight: string, notes: string } for an order_item row.
// Prefers the explicit `weight` column (new data).
// Falls back to parsing the legacy serialized notes string (old data).
export function getItemWeightAndNotes(item) {
  if (item.weight != null && item.weight !== '') {
    return { weight: String(item.weight), notes: item.notes || '' };
  }
  return parseItemNotes(item.notes);
}
