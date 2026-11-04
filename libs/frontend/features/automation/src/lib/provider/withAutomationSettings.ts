// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
            get label() {
              return translateLabel('loc.symphony.labels.automation.d909750');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.how.far.the.ai.team.may.work.on.its.own.in.every.wor.f806fe3',
              );
            },
            order: 20,
          },
          search: [
            {
              id: 'autonomous-execution',
              get label() {
                return translateLabel('loc.symphony.labels.run.autonomous.work.853ddd4');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.analyze.backlog.items.implement.ready.items.retry.fa.52342b9',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.autonomous.work.05a89b5');
              },
            },
            {
              id: 'autonomous-work-interval',
              get label() {
                return translateLabel('loc.symphony.labels.work.interval.minutes.689e6d7');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.a.new.interval.starts.only.work.that.fits.the.remain.b17e1b9',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.autonomous.work.05a89b5');
              },
            },
            {
              id: 'max-parallel-executions',
              get label() {
                return translateLabel('loc.symphony.labels.maximum.parallel.tasks.91913e0');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.shared.by.manual.and.autonomous.analysis.implementat.e93bb65',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.autonomous.work.05a89b5');
              },
            },
            {
              id: 'conflict-serialization',
              get label() {
                return translateLabel(
                  'loc.symphony.labels.serialize.overlapping.deliveries.0aa97a9',
                );
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.hold.back.a.solution.whose.predicted.change.surface..e408e36',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.autonomous.work.05a89b5');
              },
            },
            {
              id: 'agentic-level',
              get label() {
                return translateLabel('loc.symphony.labels.level.1709305');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.off.watch.diagnose.repair.full.or.custom.31f6c65',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.fix.failed.checks.3e89220');
              },
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
            ).map(([id, label]) => ({
              id,
              label,
              get group() {
                return translateLabel('loc.symphony.labels.fix.failed.checks.3e89220');
              },
            })),
            ...(
              [
                ['agentic-diagnosis-token-budget', 'Diagnosis token budget'],
                ['agentic-repair-token-budget', 'Repair token budget'],
                ['agentic-daily-token-budget', 'Daily token budget'],
                ['agentic-max-attempts', 'Maximum attempts per branch'],
                ['agentic-max-parallel-repairs', 'Maximum parallel repairs'],
                ['agentic-cooldown', 'Cooldown (minutes)'],
              ] as const
            ).map(([id, label]) => ({
              id,
              label,
              get group() {
                return translateLabel('loc.symphony.labels.fix.failed.checks.budgets.a574f18');
              },
            })),
            {
              id: 'review-feedback',
              get label() {
                return translateLabel(
                  'loc.symphony.labels.listen.for.pull.request.review.feedback.3079f0c',
                );
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.allow.assigned.review.feedback.skills.to.act.on.revi.a3a1b5f',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.address.reviews.9686886');
              },
            },
            {
              id: 'github-commands',
              get label() {
                return translateLabel('loc.symphony.labels.allow.github.commands.3676f46');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.run.authorized.comments.in.a.configured.github.issue.3e5436c',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.github.commands.25e8991');
              },
              keywords: ['@symphony', '/symphony analyze', '/symphony fix', '/symphony retry'],
            },
            {
              id: 'workspace-root',
              get label() {
                return translateLabel('loc.symphony.labels.managed.root.cd763c0');
              },
              get description() {
                return translateLabel('loc.symphony.labels.where.worktrees.live.1bddb52');
              },
              get group() {
                return translateLabel('loc.symphony.labels.execution.a45cd4b');
              },
            },
            {
              id: 'board-refresh-interval',
              get label() {
                return translateLabel('loc.symphony.labels.board.refresh.interval.minutes.17a4214');
              },
              get group() {
                return translateLabel('loc.symphony.labels.execution.a45cd4b');
              },
            },
            {
              id: 'retain-failed-workspaces',
              get label() {
                return translateLabel(
                  'loc.symphony.labels.retain.failed.execution.workspaces.8ff62aa',
                );
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.keep.failed.worktrees.for.diagnosis.instead.of.remov.f14d4eb',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.execution.a45cd4b');
              },
            },
            {
              id: 'verification-repair-attempts',
              get label() {
                return translateLabel(
                  'loc.symphony.labels.verification.repair.attempts.per.run.4771bee',
                );
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.how.often.a.run.hands.failing.repository.checks.back.20b7ba3',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.execution.a45cd4b');
              },
            },
            {
              id: 'clear-workspaces',
              get label() {
                return translateLabel('loc.symphony.labels.clear.inactive.workspaces.6142600');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.running.executions.are.preserved.uncommitted.changes.cf77531',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.execution.a45cd4b');
              },
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
            get description() {
              return translateLabel(
                'loc.symphony.labels.this.mac.tools.storage.virtual.machines.updates.and..e89ed8d',
              );
            },
            order: 40,
          },
          search: [
            {
              id: 'managed-storage-limit',
              get label() {
                return translateLabel('loc.symphony.labels.maximum.managed.storage.gb.04627fe');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.all.managed.symphony.data.on.this.mac.stops.growing..1dc301d',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.storage.a69c4de');
              },
              keywords: ['disk', 'space', 'limit'],
            },
            {
              id: 'minimum-free-disk',
              get label() {
                return translateLabel('loc.symphony.labels.minimum.mac.free.space.gb.53454f7');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.symphony.stops.writing.before.the.mac.drops.below.th.08aae24',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.storage.a69c4de');
              },
              keywords: ['disk', 'reserve'],
            },
            {
              id: 'local-ci-storage-limit',
              get label() {
                return translateLabel(
                  'loc.symphony.labels.maximum.local.github.actions.storage.gb.fb08f09',
                );
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.base.image.machine.disks.actions.cache.and.runner.to.e4f03fa',
                );
              },
              get group() {
                return translateLabel('loc.symphony.labels.storage.a69c4de');
              },
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
