/**
 * Escapes a value for one HTML attribute of the generated Mosaik markup. Mosaik elements that
 * treat their `text` as plain content (`mosaik-code`) need exactly this single pass, because the
 * HTML parser decodes the attribute once before the element ever sees it.
 */
export function escapeMarkdownAttribute(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;');
}
