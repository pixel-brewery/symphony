export function extractAcceptanceCriteria(analysis: string): readonly string[] {
  const lines = analysis.split(/\r?\n/u);
  const criteria: string[] = [];
  let inAcceptanceSection = false;
  for (const line of lines) {
    if (/^#{1,6}\s+(?:acceptance criteria|akzeptanzkriterien)\b/iu.test(line.trim())) {
      inAcceptanceSection = true;
      continue;
    }
    if (inAcceptanceSection && /^#{1,6}\s+/u.test(line.trim())) break;
    const item = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/u)?.[1]?.trim();
    if (inAcceptanceSection && item) criteria.push(item);
  }
  return criteria.length ? criteria : ['Implement the approved analysis without scope drift.'];
}
