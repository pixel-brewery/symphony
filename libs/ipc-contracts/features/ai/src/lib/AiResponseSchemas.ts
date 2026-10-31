// #region Imports

import { availableAiModelsSchema } from './AvailableAiModelsSchema';
import { claudeLoginOperationSchema } from './ClaudeLoginOperationSchema';
import { codexConfigurationSchema } from './CodexConfigurationSchema';
import { codexLoginOperationSchema } from './CodexLoginOperationSchema';
import { configurationOperationSchema } from '@symphony/ipc-contracts-core';
import { modelIntelligenceSchema } from './ModelIntelligenceSchema';

// #endregion

/**
 * Owns the validated ai response payloads at the desktop boundary.
 *
 * @public
 */
export const aiResponseSchemas = {
  'codex.configuration.get': codexConfigurationSchema,
  'ai.models.get': availableAiModelsSchema,
  'ai.intelligence.get': modelIntelligenceSchema,
  'opencode.credentials.import': configurationOperationSchema,
  'codex.login.start': codexLoginOperationSchema,
  'codex.logout': configurationOperationSchema,
  'claude.login.start': claudeLoginOperationSchema,
  'claude.login.complete': configurationOperationSchema,
  'claude.logout': configurationOperationSchema,
} as const;
