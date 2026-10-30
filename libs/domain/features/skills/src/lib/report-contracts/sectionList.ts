export function sectionList(sections: readonly string[]): readonly string[] {
  return sections.map((section) => `  ## ${section}`);
}
