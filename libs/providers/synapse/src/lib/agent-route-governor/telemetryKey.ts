export function telemetryKey(workspaceId: string, routeCandidateId: string): string {
  return JSON.stringify([workspaceId, routeCandidateId]);
}
