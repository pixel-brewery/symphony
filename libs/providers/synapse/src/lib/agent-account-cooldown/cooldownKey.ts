export function cooldownKey(workspaceId: string, aiConnectionId: string): string {
  return JSON.stringify([workspaceId, aiConnectionId]);
}
