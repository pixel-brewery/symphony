/**
 * Whether an agent can currently run: on its preferred account, on a backup because the preferred
 * account is out of quota, not at all because every account is out of quota, or not at all because
 * the agent is switched off.
 *
 * @public
 */
export type AgentAvailability = 'available' | 'backup-in-use' | 'out-of-quota' | 'unavailable';
