export type AgentModelAvailability =
  | { readonly state: 'available' }
  | { readonly state: 'unavailable'; readonly reason?: string }
  | { readonly state: 'unknown'; readonly reason?: string };
