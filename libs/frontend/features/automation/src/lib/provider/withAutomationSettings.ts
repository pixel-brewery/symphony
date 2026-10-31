// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';

// #endregion

/**
 * Contributes the actual feature-owned cards to the native Settings host.
 *
 * @public
 */
export function withAutomationSettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'automation-settings',
      slot: SettingsViewSlot.Global,
      views: [
        {
          id: 'AutomationPolicySettingsView',
          order: 10,
          section: {
            scope: 'global',
            id: 'automation',
            label: 'Automation',
            description: 'How far the AI team may work on its own, in every workspace.',
            order: 20,
          },
          search: [
            {
              id: 'autonomous-execution',
              label: 'Run autonomous work',
              description:
                'Analyze backlog items, implement Ready items, retry failed work, and synchronize pull-request status.',
              group: 'Autonomous work',
            },
            {
              id: 'autonomous-work-interval',
              label: 'Work interval (minutes)',
              description: 'A new interval starts only work that fits the remaining slots.',
              group: 'Autonomous work',
            },
            {
              id: 'max-parallel-executions',
              label: 'Maximum parallel tasks',
              description:
                'Shared by manual and autonomous analysis, implementation and retries, application-wide.',
              group: 'Autonomous work',
            },
            {
              id: 'conflict-serialization',
              label: 'Serialize overlapping deliveries',
              description:
                'Hold back a solution whose predicted change surface overlaps a pull request still in flight until that delivery merges.',
              group: 'Autonomous work',
            },
            {
              id: 'agentic-level',
              label: 'Level',
              description: 'Off, Watch, Diagnose, Repair, Full or Custom.',
              group: 'Fix failed checks',
              keywords: ['agentic delivery', 'ladder', 'ci repair'],
            },
            ...(
              [
                ['agentic-delivery-enabled', 'Enable agentic delivery'],
                ['agentic-observe-failures', 'Observe failed actions'],
                ['agentic-ai-diagnosis', 'Use AI for diagnosis'],
                ['agentic-ci-rerun', 'Rerun transient and infrastructure failures'],
                ['agentic-managed-branch-updates', 'Update managed pull-request branches'],
                ['agentic-source-repair', 'Repair source failures'],
                ['agentic-workflow-repair', 'Repair workflow failures'],
                ['agentic-replacement-pr', 'Allow replacement pull requests'],
              ] as const
            ).map(([id, label]) => ({ id, label, group: 'Fix failed checks' })),
            ...(
              [
                ['agentic-diagnosis-token-budget', 'Diagnosis token budget'],
                ['agentic-repair-token-budget', 'Repair token budget'],
                ['agentic-daily-token-budget', 'Daily token budget'],
                ['agentic-max-attempts', 'Maximum attempts per branch'],
                ['agentic-max-parallel-repairs', 'Maximum parallel repairs'],
                ['agentic-cooldown', 'Cooldown (minutes)'],
              ] as const
            ).map(([id, label]) => ({ id, label, group: 'Fix failed checks › Budgets' })),
            {
              id: 'review-feedback',
              label: 'Listen for pull-request review feedback',
              description: 'Allow assigned review-feedback skills to act on reviewer comments.',
              group: 'Address reviews',
            },
            {
              id: 'github-commands',
              label: 'Allow GitHub commands',
              description:
                'Run authorized comments in a configured GitHub issue and deliver successful implementation branches and pull requests.',
              group: 'GitHub commands',
              keywords: ['@symphony', '/symphony analyze', '/symphony fix', '/symphony retry'],
            },
            {
              id: 'workspace-root',
              label: 'Managed root',
              description: 'Where worktrees live.',
              group: 'Execution',
            },
            {
              id: 'board-refresh-interval',
              label: 'Board refresh interval (minutes)',
              group: 'Execution',
            },
            {
              id: 'retain-failed-workspaces',
              label: 'Retain failed execution workspaces',
              description:
                'Keep failed worktrees for diagnosis instead of removing them after completion.',
              group: 'Execution',
            },
            {
              id: 'verification-repair-attempts',
              label: 'Verification repair attempts per run',
              description:
                'How often a run hands failing repository checks back to the agent before it fails.',
              group: 'Execution',
            },
            {
              id: 'clear-workspaces',
              label: 'Clear inactive workspaces',
              description:
                'Running executions are preserved; uncommitted changes in inactive worktrees may be removed.',
              group: 'Execution',
            },
          ],
          canActivate: (selection) =>
            selection?.sectionId === 'automation' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/AutomationPolicySettingsView').then(
              (module) => module.AutomationPolicySettingsView,
            ),
        },
        {
          id: 'StorageSafetySettingsView',
          order: 10,
          section: {
            scope: 'global',
            id: 'system',
            label: 'System',
            description: 'This Mac: tools, storage, virtual machines, updates and sleep.',
            order: 40,
          },
          search: [
            {
              id: 'managed-storage-limit',
              label: 'Maximum managed storage (GB)',
              description: 'All managed Symphony data on this Mac stops growing at this limit.',
              group: 'Storage',
              keywords: ['disk', 'space', 'limit'],
            },
            {
              id: 'minimum-free-disk',
              label: 'Minimum Mac free space (GB)',
              description: 'Symphony stops writing before the Mac drops below this.',
              group: 'Storage',
              keywords: ['disk', 'reserve'],
            },
            {
              id: 'local-ci-storage-limit',
              label: 'Maximum Local GitHub Actions storage (GB)',
              description: 'Base image, machine disks, actions/cache and runner tools.',
              group: 'Storage',
              keywords: ['runner', 'virtual machines', 'disk'],
            },
          ],
          canActivate: (selection) =>
            selection?.sectionId === 'system' && selection.workspaceId === null,
          loadComponent: () =>
            import('../settings/StorageSafetySettingsView').then(
              (module) => module.StorageSafetySettingsView,
            ),
        },
      ],
    }),
  ];
}
