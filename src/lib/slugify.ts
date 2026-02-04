/**
 * Convert an item name to a URL-safe slug for /shops/:query
 * e.g. "Round Coffee Table" → "round-coffee-table"
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}
