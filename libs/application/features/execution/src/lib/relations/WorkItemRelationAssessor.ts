// #region Imports

import type { ISkillManifest, ISkillPackageDocument } from '@symphony/domain-skills';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkItemRelationAssessment, WorkItemRelationKind } from '@symphony/domain-execution';
import { composeExecutionContext } from '../context/composeExecutionContext';
import type { IWorkItemRelationAssessorOptions } from './IWorkItemRelationAssessorOptions';

// #endregion

/**
 * Assesses cross-item relation evidence through the existing read-only analysis lifecycle.
 *
 * @public
 */
export class WorkItemRelationAssessor {
  // #region Ctor

  /**
   * Binds the consumed analysis, catalog and clock dependencies.
   *
   * @param _options - Read-only relation-assessment dependencies.
   * @public
   */
  public constructor(private readonly _options: IWorkItemRelationAssessorOptions) {}

  // #endregion

  // #region Methods

  /**
   * Assesses the relationship between the work items with the workspace's Analyzer skill.
   *
   * The run is read-only and has no artificial time limit. Every failure - no active Analyzer skill, no local
   * repository checkout, a failed run, or an unparsable verdict - returns the neutral
   * `unrelated` assessment instead of throwing into the Analyzer; the neutral verdict never
   * satisfies the delivery-group activation gates.
   *
   * @param workItems - Ordered group members; the first item is the retained root.
   * @param revisions - Work-item revisions the assessment is bound to.
   * @public
   */
  public async assess(
    workItems: readonly IWorkItem[],
    revisions: Readonly<Record<string, number>>,
  ): Promise<IWorkItemRelationAssessment> {
    const root = workItems[0];
    if (!root) {
      return this.neutralAssessment(workItems, revisions, 'The proposed group has no members.');
    }
    const skill = this._options.catalog.analysisSkill(root.workspaceId);
    if (!skill) {
      return this.neutralAssessment(
        workItems,
        revisions,
        'No Analyzer skill is active for the workspace, so no relation evidence was collected.',
      );
    }
    const workingDirectory = this._options.workingDirectory(root);
    if (!workingDirectory) {
      return this.neutralAssessment(
        workItems,
        revisions,
        'No local repository checkout is available, so no relation evidence was collected.',
      );
    }
    try {
      const context = composeExecutionContext(
        root,
        this._options.catalog.workflow(),
        this.manifestFor(skill),
        workingDirectory,
      );
      const summary = await this._options.agent.analyze(
        context,
        skill,
        this.assessmentRequest(workItems),
        async () => undefined,
        false,
        new AbortController().signal,
      );
      const verdict = parseRelationVerdict(summary);
      if (!verdict) {
        return this.neutralAssessment(
          workItems,
          revisions,
          'The Analyzer ended without a parsable relation verdict.',
        );
      }
      return {
        relation: verdict.relation,
        workItemIds: workItems.map((item) => item.id),
        assessedRevisions: revisions,
        evidence: verdict.evidence,
        sharedChangeSurface: verdict.sharedChangeSurface,
        compatibleAcceptanceCriteria: verdict.compatibleAcceptanceCriteria,
        compatibleVerification: verdict.compatibleVerification,
        hasOpenDecisions: verdict.hasOpenDecisions,
        hasExistingClaims: workItems.some((item) => Boolean(item.coordination)),
        hasPullRequests: verdict.hasPullRequests,
        assessedAt: this._options.clock.now(),
      };
    } catch (cause) {
      this._options.reportFailure?.(cause);
      return this.neutralAssessment(
        workItems,
        revisions,
        `The Analyzer could not complete the relation assessment: ${
          cause instanceof Error ? cause.message : 'unknown failure'
        }`,
      );
    }
  }

  private assessmentRequest(workItems: readonly IWorkItem[]): string {
    return [
      'This run is a focused relation assessment, not an implementation plan.',
      'Judge whether the work items below must be delivered together. Read the repository only far enough to name the files every work item would change.',
      workItems.map((item) => this.describeWorkItem(item)).join('\n\n'),
      relationVerdictContract,
    ].join('\n\n');
  }

  private describeWorkItem(item: IWorkItem): string {
    const body = item.body.trim();
    const bounded =
      body.length > WORK_ITEM_BODY_LIMIT
        ? `${body.slice(0, WORK_ITEM_BODY_LIMIT)}\n\n[body truncated]`
        : body;
    return [
      `Work item ${item.externalId} (revision ${item.revision ?? 0}): ${item.title}`,
      `Labels: ${item.labels.length ? item.labels.join(', ') : '(none)'}`,
      `Body:\n${bounded || '(empty)'}`,
    ].join('\n');
  }

  private manifestFor(skill: ISkillPackageDocument): ISkillManifest {
    return {
      id: skill.id,
      name: skill.name,
      version: skill.digest.slice(0, 12),
      description: skill.description,
      capabilities: ['analysis'],
      source:
        skill.source === 'bundled'
          ? 'bundled'
          : skill.source === 'repository'
            ? 'workspace'
            : 'user',
    };
  }

  private neutralAssessment(
    workItems: readonly IWorkItem[],
    revisions: Readonly<Record<string, number>>,
    evidence: string,
  ): IWorkItemRelationAssessment {
    return {
      relation: 'unrelated',
      workItemIds: workItems.map((item) => item.id),
      assessedRevisions: revisions,
      evidence: [evidence],
      sharedChangeSurface: [],
      compatibleAcceptanceCriteria: false,
      compatibleVerification: false,
      hasOpenDecisions: true,
      hasExistingClaims: workItems.some((item) => Boolean(item.coordination)),
      hasPullRequests: false,
      assessedAt: this._options.clock.now(),
    };
  }

  // #endregion
}

interface IRelationVerdict {
  readonly relation: WorkItemRelationKind;
  readonly evidence: readonly string[];
  readonly sharedChangeSurface: readonly string[];
  readonly compatibleAcceptanceCriteria: boolean;
  readonly compatibleVerification: boolean;
  readonly hasOpenDecisions: boolean;
  readonly hasPullRequests: boolean;
}

const WORK_ITEM_BODY_LIMIT = 4_000;
const VERDICT_LIST_LIMIT = 10;
const VERDICT_ENTRY_LIMIT = 400;

const workItemRelationKinds: readonly WorkItemRelationKind[] = [
  'duplicate',
  'joint-delivery',
  'dependency',
  'collision',
  'unrelated',
];

const relationVerdictContract = [
  'Relation verdict contract - end the final message with one fenced ```json code block containing exactly one JSON object with these fields and nothing else:',
  '',
  '- `relation`: one of `duplicate`, `joint-delivery`, `dependency`, `collision`, `unrelated`, judged across all listed work items.',
  '- `evidence`: array of short statements, each backed by repository or work-item evidence you actually observed.',
  '- `sharedChangeSurface`: array of repository paths every listed work item must change; empty when the evidence proves none.',
  '- `compatibleAcceptanceCriteria`: whether one delivery can satisfy every acceptance criterion without conflicts.',
  '- `compatibleVerification`: whether one verification run can cover every listed work item.',
  '- `hasOpenDecisions`: whether an unresolved question blocks judging the relation.',
  '- `hasPullRequests`: whether the work-item evidence references an existing pull request for any member.',
  '',
  'Report `joint-delivery` only with a proven shared change surface and compatible acceptance criteria. Report `unrelated` when the evidence proves no delivery or critical-path relationship.',
].join('\n');

function parseRelationVerdict(summary: string): IRelationVerdict | undefined {
  for (const candidate of verdictCandidates(summary)) {
    const verdict = relationVerdict(candidate);
    if (verdict) return verdict;
  }
  return undefined;
}

/** Fenced blocks newest-first, then the whole message: the verdict is asked for last. */
function verdictCandidates(summary: string): readonly string[] {
  const fenced = [...summary.matchAll(/```(?:json)?\s*([\s\S]*?)```/giu)].map((match) =>
    match[1]!.trim(),
  );
  return [...fenced.reverse(), summary.trim()];
}

function relationVerdict(candidate: string): IRelationVerdict | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
  const block = parsed as {
    relation?: unknown;
    evidence?: unknown;
    sharedChangeSurface?: unknown;
    compatibleAcceptanceCriteria?: unknown;
    compatibleVerification?: unknown;
    hasOpenDecisions?: unknown;
    hasPullRequests?: unknown;
  };
  const relation = relationKind(block.relation);
  if (!relation) return undefined;
  const evidence = boundedStrings(block.evidence);
  if (!evidence) return undefined;
  const sharedChangeSurface = boundedStrings(block.sharedChangeSurface);
  if (!sharedChangeSurface) return undefined;
  if (typeof block.compatibleAcceptanceCriteria !== 'boolean') return undefined;
  if (typeof block.compatibleVerification !== 'boolean') return undefined;
  if (typeof block.hasOpenDecisions !== 'boolean') return undefined;
  return {
    relation,
    evidence,
    sharedChangeSurface,
    compatibleAcceptanceCriteria: block.compatibleAcceptanceCriteria,
    compatibleVerification: block.compatibleVerification,
    hasOpenDecisions: block.hasOpenDecisions,
    hasPullRequests: block.hasPullRequests === true,
  };
}

function relationKind(value: unknown): WorkItemRelationKind | undefined {
  return typeof value === 'string' && (workItemRelationKinds as readonly string[]).includes(value)
    ? (value as WorkItemRelationKind)
    : undefined;
}

function boundedStrings(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string');
  if (items.length !== value.length) return undefined;
  return items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, VERDICT_LIST_LIMIT)
    .map((item) =>
      item.length > VERDICT_ENTRY_LIMIT ? `${item.slice(0, VERDICT_ENTRY_LIMIT)}…` : item,
    );
}
