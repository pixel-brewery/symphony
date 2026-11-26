// #region Imports

import { mobileEmployeeSchema } from './MobileEmployeeSchema';
import { z } from 'zod';
import { mobileBoardColumnSchema } from './MobileBoardColumnSchema';
import { mobileExecutionSchema } from './MobileExecutionSchema';
import { mobileMergeRequestSchema } from './MobileMergeRequestSchema';
import { mobileQueueEntrySchema } from './MobileQueueEntrySchema';
import { mobileTicketSchema } from './MobileTicketSchema';
import { mobileDisplaySettingsSchema } from '../remote/MobileDisplaySettingsSchema';
// #endregion

/**
 * Validates the explicitly projected mobile product state, including an optional safe display configuration.
 *
 * @public
 */
export const mobileSnapshotSchema = z
  .object({
    /**
     * Mobile product snapshot version, currently one.
     *
     * @public
     */
    version: z.literal(1),
    /**
     * Optional strict read-only display configuration for selected workspaces.
     *
     * @public
     */
    displaySettings: mobileDisplaySettingsSchema.optional(),
    /**
     * Human-readable desktop label without authority or credential material.
     *
     * @public
     */
    desktopName: z.string().min(1).max(200),
    /**
     * Read-only indication of the host automation preference.
     *
     * @public
     */
    remoteAutomationEnabled: z.boolean().default(false),
    /**
     * Timestamp of this product projection.
     *
     * @public
     */
    generatedAt: z.string(),
    /**
     * Current provider-neutral columns containing only scoped projected tickets.
     *
     * @public
     */
    boardColumns: z.array(mobileBoardColumnSchema).readonly(),
    /**
     * Bounded selected employee display and actual work activity.
     *
     * @public
     */
    employees: z.array(mobileEmployeeSchema).max(200).readonly().optional(),
    /**
     * Work items in the current workspace scope with freshly resolved valid actions.
     *
     * @public
     */
    tickets: z.array(mobileTicketSchema).readonly(),
    /**
     * Scoped pull-request display records with validated public HTTP(S) links.
     *
     * @public
     */
    mergeRequests: z.array(mobileMergeRequestSchema).readonly().default([]),
    /**
     * Projected execution state and bounded progress without internal provider events.
     *
     * @public
     */
    executions: z.array(mobileExecutionSchema).readonly(),
    /**
     * Currently waiting product operations in queue order.
     *
     * @public
     */
    executionQueue: z.array(mobileQueueEntrySchema).readonly().default([]),
  })
  .strict();
