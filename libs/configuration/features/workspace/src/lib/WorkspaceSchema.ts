// #region Imports

import { z } from 'zod';
import { workspaceIsolationModes } from '@symphony/domain-workspace';
import { identifierSchema } from '@symphony/configuration-core';
import { runnerImageDefinitionSchema } from '@symphony/configuration-ci';

// #endregion

export const workspaceSchema = z.object({
  id: identifierSchema,
  displayName: identifierSchema,
  shortCode: identifierSchema.max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/u),
  enabled: z.boolean(),
  isolation: z.enum(workspaceIsolationModes),
  storageLimitGiB: z.number().int().min(2).max(1_024).default(20),
  /**
   * Whether this workspace may run GitHub Actions locally. Local runs belong to a workspace,
   * so they are decided per workspace and travel with a workspace transfer; the machine they
   * boot is host-owned and stays in `localCi`.
   */
  localCiEnabled: z.boolean().default(false),
  /** Analyzer suggestions remain available when this opt-in is disabled. */
  automaticDeliveryGroupingEnabled: z.boolean().default(false),
  /** Guest image every managed local execution in this workspace boots. */
  localCiImage: runnerImageDefinitionSchema.optional(),
});
