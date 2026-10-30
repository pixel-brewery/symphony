export function bucketKey(groupId: string, segmentId: string): string {
  return `${groupId}\u0000${segmentId}`;
}
