// #region Imports

import type { IApplicationSettings } from '@symphony/configuration-composition';
import type {
  IDeliverySnapshot,
  IDeliveryTarget,
  IDeliveryEvidence,
} from '@symphony/domain-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import type { IGitHubDeliveryTransport } from './IGitHubDeliveryTransport';

// #endregion

/** Reads provider evidence and proves inclusion against the actual delivered revision. */
export class GitHubDeliveryAdapter {
  // #region Fields

  private readonly _ancestry = new Map<string, boolean>();

  // #endregion

  // #region Ctor

  /** @public */
  public constructor(
    private readonly _settings: () => IApplicationSettings,
    private readonly _transport: IGitHubDeliveryTransport,
    private readonly _now: () => string,
  ) {}

  // #endregion

  // #region Methods

  /** Never reports publication as an installation or substitutes green CI for deployment. @public */
  public async refresh(
    items: readonly IWorkItem[],
    executions: readonly IExecutionRecord[],
  ): Promise<IDeliverySnapshot> {
    const settings = this._settings();
    const selected = new Set(settings.activeViewScope.workspaceIds);
    const targets: IDeliveryTarget[] = [
      ...(settings.deliveryTargets ?? []).filter((target) => selected.has(target.workspaceId)),
    ];
    const evidence: IDeliveryEvidence[] = [];
    const errors: { targetId: string; message: string }[] = [];
    for (const repository of settings.repositoryBindings.filter(
      (repo) => repo.enabled && repo.provider === 'github' && selected.has(repo.workspaceId),
    )) {
      try {
        const records: {
          id: number;
          environment: string;
          sha: string;
          ref: string;
          created_at: string;
          production_environment?: boolean;
          payload?: { symphony?: { kind?: string; version?: string } };
        }[] = [];
        for (let page = 1; page <= 10; page += 1) {
          const next = await this._transport.request<typeof records>(
            repository.id,
            `deployments?per_page=100&page=${page}`,
            'GET',
          );
          records.push(...next);
          if (next.length < 100) break;
          if (page === 10)
            errors.push({
              targetId: repository.id,
              message: 'Deployment history is limited to the latest 1,000 entries.',
            });
        }
        // Fetch current PR state once for each evidenced relationship, including squash merges.
        const relationships = new Map<string, string[]>();
        for (const execution of executions) {
          if (
            !execution.pullRequest ||
            !execution.bindingSnapshot?.repositoryBindingIds.includes(repository.id)
          )
            continue;
          const key = String(execution.pullRequest.number);
          const ids = relationships.get(key) ?? [];
          ids.push(...(execution.workItemIds ?? [execution.workItemId]));
          relationships.set(key, ids);
        }
        const revisions = new Map<string, string[]>();
        for (const [number, workIds] of relationships) {
          const pr = await this._transport.request<{
            merged: boolean;
            merge_commit_sha?: string;
            head?: { sha?: string };
          }>(repository.id, `pulls/${number}`, 'GET');
          const revision = pr.merged ? pr.merge_commit_sha : pr.head?.sha;
          if (revision)
            revisions.set(revision, [
              ...(revisions.get(revision) ?? []),
              ...workIds.filter((id) => items.some((item) => item.id === id)),
            ]);
        }
        const included = async (revision: string): Promise<readonly string[]> => {
          const ids: string[] = [];
          for (const [commit, workIds] of revisions) {
            const key = `${repository.id}:${commit}:${revision}`;
            let contains = this._ancestry.get(key);
            if (contains === undefined) {
              contains =
                commit === revision ||
                (await this._transport
                  .request<{ status: string }>(
                    repository.id,
                    `compare/${encodeURIComponent(commit)}...${encodeURIComponent(revision)}`,
                    'GET',
                  )
                  .then(
                    (comparison) =>
                      comparison.status === 'ahead' || comparison.status === 'identical',
                  )
                  .catch(() => false));
              this._ancestry.set(key, contains);
            }
            if (contains) ids.push(...workIds);
          }
          return [...new Set(ids)];
        };
        // Keep recent history, but continue past failed attempts until an active successful receipt is found.
        const perEnvironment = new Map<string, number>();
        const confirmedEnvironments = new Set<string>();
        for (const record of records) {
          const count = perEnvironment.get(record.environment) ?? 0;
          if (count >= 20 && confirmedEnvironments.has(record.environment)) continue;
          perEnvironment.set(record.environment, count + 1);
          let target = targets.find(
            (candidate) =>
              candidate.repositoryBindingId === repository.id &&
              (candidate.kind === 'environment' || candidate.kind === 'installation') &&
              candidate.environment === record.environment,
          );
          if (!target) {
            target = {
              id: `${repository.id}:environment:${record.environment}`,
              workspaceId: repository.workspaceId,
              repositoryBindingId: repository.id,
              displayName: record.environment,
              environment: record.environment,
              kind: 'environment',
              production: record.production_environment === true,
            };
            targets.push(target);
          }
          if (target.kind === 'installation' && record.payload?.symphony?.kind !== 'installation') {
            errors.push({
              targetId: target.id,
              message:
                'This destination has no explicit installation receipt. Its deployment is not treated as an installation.',
            });
            continue;
          }
          const statuses = await this._transport.request<
            readonly {
              state: string;
              created_at: string;
              environment_url?: string;
              log_url?: string;
            }[]
          >(repository.id, `deployments/${record.id}/statuses?per_page=1`, 'GET');
          const status = statuses[0];
          const state =
            status?.state === 'success'
              ? 'succeeded'
              : status?.state === 'inactive'
                ? 'inactive'
                : status?.state === 'in_progress'
                  ? 'in-progress'
                  : status?.state === 'failure' || status?.state === 'error'
                    ? 'failed'
                    : 'pending';
          if (state === 'succeeded') confirmedEnvironments.add(record.environment);
          evidence.push({
            id: `${repository.id}:deployment:${record.id}`,
            targetId: target.id,
            workspaceId: repository.workspaceId,
            repositoryBindingId: repository.id,
            kind: target.kind === 'installation' ? 'installation' : 'deployment',
            revision: record.sha,
            version: record.payload?.symphony?.version ?? record.ref,
            state,
            deployedAt: record.created_at,
            observedAt: status?.created_at ?? record.created_at,
            ...(status?.environment_url || status?.log_url
              ? { externalUrl: status.environment_url || status.log_url }
              : {}),
            workItemIds: state === 'succeeded' ? await included(record.sha) : [],
          });
        }
        const channels = targets.filter(
          (target) =>
            target.repositoryBindingId === repository.id && target.kind === 'release-channel',
        );
        if (channels.length) {
          const releases = await this._transport.request<
            readonly {
              id: number;
              tag_name: string;
              published_at: string;
              draft: boolean;
              prerelease: boolean;
              html_url: string;
            }[]
          >(repository.id, 'releases?per_page=100', 'GET');
          for (const target of channels) {
            // Stable follows GitHub's explicit latest publication. Other channels require a signed-in repository's explicit tag pointer.
            const channel =
              target.environment === 'stable'
                ? await this._transport.request<{ id: number }>(
                    repository.id,
                    'releases/latest',
                    'GET',
                  )
                : await this._transport
                    .request<{ content: string }>(
                      repository.id,
                      'contents/.symphony/release-channels.json',
                      'GET',
                    )
                    .then(
                      (document) =>
                        JSON.parse(Buffer.from(document.content, 'base64').toString('utf8')) as {
                          channels?: Record<string, { tag?: string }>;
                        },
                    );
            const release = releases.find(
              (candidate) =>
                !candidate.draft &&
                ('id' in channel
                  ? candidate.id === channel.id
                  : candidate.tag_name === channel.channels?.[target.environment]?.tag),
            );
            if (!release) continue;
            const commit = await this._transport.request<{ sha: string }>(
              repository.id,
              `commits/${encodeURIComponent(release.tag_name)}`,
              'GET',
            );
            evidence.push({
              id: `${repository.id}:release:${release.id}:${target.id}`,
              targetId: target.id,
              workspaceId: repository.workspaceId,
              repositoryBindingId: repository.id,
              kind: 'publication',
              revision: commit.sha,
              version: release.tag_name,
              state: 'succeeded',
              observedAt: release.published_at,
              externalUrl: release.html_url,
              workItemIds: await included(commit.sha),
            });
          }
        }
      } catch {
        errors.push({
          targetId: repository.id,
          message: `Unable to read delivery evidence for ${repository.owner}/${repository.name}. Check the GitHub account and repository permissions, then refresh.`,
        });
      }
    }
    if (this._ancestry.size > 10000) this._ancestry.clear();
    return { targets, evidence, refreshedAt: this._now(), errors };
  }

  // #endregion
}
