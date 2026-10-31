// #region Imports

import { agentRouteStrategies } from './AgentRouteStrategies';

// #endregion

export type AgentRouteStrategy = (typeof agentRouteStrategies)[number];
