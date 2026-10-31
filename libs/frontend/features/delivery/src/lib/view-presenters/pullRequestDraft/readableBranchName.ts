/** Branch name with separators turned into words, as GitHub prefills the title field. */
export function readableBranchName(branch: string): string {
  const words = branch.replaceAll(/[-_]+/gu, ' ').replaceAll(/\s+/gu, ' ').trim();
  if (!words) return branch;
  return `${words.charAt(0).toLocaleUpperCase()}${words.slice(1)}`;
}
