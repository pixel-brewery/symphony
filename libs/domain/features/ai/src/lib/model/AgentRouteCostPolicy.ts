// #region Imports

import { agentRouteCostPolicies } from './AgentRouteCostPolicies';

// #endregion

export type AgentRouteCostPolicy = (typeof agentRouteCostPolicies)[number];
