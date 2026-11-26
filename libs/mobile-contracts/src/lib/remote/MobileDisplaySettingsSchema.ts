// #region Imports
import { z } from 'zod';
import { workspaceAvatarSchema } from '@symphony/configuration-workspace';
import { workflowStageKinds } from '@symphony/domain-workflow';
import { mobileEmployeeSchema } from '../mobile-contracts/MobileEmployeeSchema';
// #endregion

/**
 * Defines the strict read-only operational display configuration exposed to an authorized browser.
 *
 * @remarks Local paths, provider connection references, model routing and execution setup have no fields in this contract.
 * @public
 */
export const mobileDisplaySettingsSchema = z
  .strictObject({
    /**
     * Display projection contract version, currently one.
     *
     * @public
     */
    version: z.literal(1),
    /**
     * Current workspace and view selection without host configuration.
     *
     * @public
     */
    activeViewScope: z
      .strictObject({
        /**
         * Selected workspace identifiers to which the entity collections are filtered.
         *
         * @public
         */
        workspaceIds: z.array(z.string().min(1)).readonly(),
        /**
         * Existing display grouping preference.
         *
         * @public
         */
        boardLayout: z.enum(['mixed', 'grouped']),
        /**
         * Optional selected saved-view identifier.
         *
         * @public
         */
        savedViewId: z.string().optional(),
        /**
         * Optional selected work-item source identifier.
         *
         * @public
         */
        workItemSourceId: z.string().optional(),
      })
      .readonly(),
    /**
     * Selected workspace labels and portable display glyphs.
     *
     * @public
     */
    workspaces: z
      .array(
        z
          .strictObject({
            /**
             * Opaque workspace identifier.
             *
             * @public
             */
            id: z.string(),
            /**
             * User-visible workspace name.
             *
             * @public
             */
            displayName: z.string(),
            /**
             * Workspace display abbreviation.
             *
             * @public
             */
            shortCode: z.string(),
            /**
             * Canonical workspace display color.
             *
             * @public
             */
            color: z.string(),
            /**
             * Portable icon, emoji or monogram without a host file reference.
             *
             * @public
             */
            avatar: workspaceAvatarSchema.optional(),
            /**
             * Whether the workspace is enabled.
             *
             * @public
             */
            enabled: z.boolean(),
          })
          .readonly(),
      )
      .readonly(),
    /**
     * Public repository display identities without local paths or provisioning commands.
     *
     * @public
     */
    repositories: z
      .array(
        z
          .strictObject({
            /**
             * Opaque repository-binding identifier.
             *
             * @public
             */
            id: z.string(),
            /**
             * Owning selected workspace identifier.
             *
             * @public
             */
            workspaceId: z.string(),
            /**
             * User-visible repository label.
             *
             * @public
             */
            displayName: z.string(),
            /**
             * Provider kind required to render the repository identity.
             *
             * @public
             */
            provider: z.enum(['github', 'simulated']),
            /**
             * Host from the public remote repository identity.
             *
             * @public
             */
            host: z.string(),
            /**
             * Public repository owner.
             *
             * @public
             */
            owner: z.string(),
            /**
             * Public repository name.
             *
             * @public
             */
            name: z.string(),
            /**
             * Configured default branch name.
             *
             * @public
             */
            defaultBranch: z.string(),
            /**
             * Whether the repository binding is enabled.
             *
             * @public
             */
            enabled: z.boolean(),
          })
          .readonly(),
      )
      .readonly(),
    /**
     * Source labels and provider kinds without connection references or private queries.
     *
     * @public
     */
    workItemSources: z
      .array(
        z
          .strictObject({
            /**
             * Opaque source identifier.
             *
             * @public
             */
            id: z.string(),
            /**
             * Owning selected workspace identifier.
             *
             * @public
             */
            workspaceId: z.string(),
            /**
             * Provider-neutral source kind.
             *
             * @public
             */
            provider: z.enum(['azure-devops', 'github-projects', 'simulated']),
            /**
             * User-visible source label.
             *
             * @public
             */
            displayName: z.string(),
            /**
             * Whether the source is enabled.
             *
             * @public
             */
            enabled: z.boolean(),
          })
          .readonly(),
      )
      .readonly(),
    /**
     * Selected employee display identities without account or route policy details.
     *
     * @public
     */
    employees: z
      .array(
        z
          .strictObject({
            /**
             * Opaque employee identifier.
             *
             * @public
             */
            id: z.string(),
            /**
             * Owning selected workspace identifier.
             *
             * @public
             */
            workspaceId: z.string(),
            /**
             * User-visible employee name.
             *
             * @public
             */
            displayName: z.string(),
            /**
             * Position identifier used by display composition.
             *
             * @public
             */
            positionId: z.string(),
            /**
             * Validated mobile appearance with a bounded optional PNG data image.
             *
             * @public
             */
            appearance: mobileEmployeeSchema.shape.appearance,
            /**
             * Whether the employee is enabled.
             *
             * @public
             */
            enabled: z.boolean(),
          })
          .readonly(),
      )
      .readonly(),
    /**
     * Ordered workflow labels without execution policies, scripts or credentials.
     *
     * @public
     */
    workflowStages: z
      .array(
        z
          .strictObject({
            /**
             * Opaque workflow-stage identifier.
             *
             * @public
             */
            id: z.string(),
            /**
             * User-visible stage label.
             *
             * @public
             */
            label: z.string(),
            /**
             * Stage display guidance.
             *
             * @public
             */
            description: z.string(),
            /**
             * Provider-neutral workflow-stage kind.
             *
             * @public
             */
            kind: z.enum(workflowStageKinds),
          })
          .readonly(),
      )
      .readonly(),
    /**
     * Read-only indication of the host automation preference.
     *
     * @public
     */
    automaticExecutionEnabled: z.boolean(),
  })
  .readonly();
