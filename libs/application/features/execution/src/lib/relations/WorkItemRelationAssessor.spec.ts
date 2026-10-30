// #region Imports

import { describe, expect, it } from 'vitest';
import type { IAgentRuntimePort } from '../ports/IAgentRuntimePort';
import type { IExecutionCatalog } from '../ports/IExecutionCatalog';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { ISkillPackageDocument } from '@symphony/domain-skills';
import type { IWorkItem } from '@symphony/domain-work';
import type { IExecutionContext } from '../context/IExecutionContext';
import { WorkItemRelationAssessor } from './WorkItemRelationAssessor';

// #endregion

const assessedAt = '2026-08-24T10:00:00.000Z';
const workingDirectory = '/repositories/flamox-invoices';
const revisions: Readonly<Record<string, number>> = { 'item-1': 3, 'item-2': 1 };

function workItem(id: string, overrides: Partial<IWorkItem> = {}): IWorkItem {
  return {
    id,
    workspaceId: 'workspace-1',
    externalId: `#${id}`,
    title: `Work item ${id}`,
    body: 'Adjust the shared invoice export.',
    provider: 'github',
    repository: 'flamox/invoices',
    labels: [],
    assignees: [],
    ...overrides,
  };
}

const analysisSkill: ISkillPackageDocument = {
  id: 'repository:issue-analyzer',
  name: 'issue-analyzer',
  displayName: 'Issue analyzer',
  description: 'Analyze an issue.',
  source: 'repository',
  location: '/repository/.agents/skills/issue-analyzer',
  editable: false,
  implicitInvocation: true,
  updatedAt: '2026-08-07T00:00:00.000Z',
  digest: 'digest-1234567890ab',
  resourceCount: 0,
  warnings: [],
  instructions: 'Analyze the selected issue.',
  openaiYaml: '',
  files: [],
};

interface IAnalyzeCall {
  readonly context: IExecutionContext;
  readonly skill: ISkillPackageDocument;
  readonly request: string | undefined;
  readonly signal: AbortSignal | undefined;
}

function createFixture(
  options: {
    summary?: string;
    analyzeFailure?: Error;
    hasAnalysisSkill?: boolean;
    workingDirectory?: string | undefined;
  } = {},
) {
  const analyzeCalls: IAnalyzeCall[] = [];
  const reportedFailures: unknown[] = [];
  const agent: Pick<IAgentRuntimePort, 'analyze'> = {
    analyze: async (context, skill, request, _onProgress, _resume, signal) => {
      analyzeCalls.push({ context, skill, request, signal });
      if (options.analyzeFailure) throw options.analyzeFailure;
      return options.summary ?? '';
    },
  };
  const catalog: Pick<IExecutionCatalog, 'analysisSkill' | 'workflow'> = {
    workflow: () => defaultWorkflow,
    analysisSkill: () => ((options.hasAnalysisSkill ?? true) ? analysisSkill : undefined),
  };
  const assessor = new WorkItemRelationAssessor({
    agent,
    catalog,
    workingDirectory: () =>
      'workingDirectory' in options ? options.workingDirectory : workingDirectory,
    clock: { now: () => assessedAt },
    reportFailure: (cause) => reportedFailures.push(cause),
  });
  return { assessor, analyzeCalls, reportedFailures };
}

function verdictJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    relation: 'joint-delivery',
    evidence: ['Both items change the invoice export pipeline.'],
    sharedChangeSurface: ['libs/invoices/src/lib/export.ts'],
    compatibleAcceptanceCriteria: true,
    compatibleVerification: true,
    hasOpenDecisions: false,
    hasPullRequests: false,
    ...overrides,
  });
}

describe('WorkItemRelationAssessor', () => {
  it('adopts the verdict from a ```json fenced block and stamps the injected clock', async () => {
    // arrange
    const { assessor, analyzeCalls } = createFixture({
      summary: `The items share one change surface.\n\n\`\`\`json\n${verdictJson({ hasPullRequests: true })}\n\`\`\`\n`,
    });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment).toEqual({
      relation: 'joint-delivery',
      workItemIds: ['item-1', 'item-2'],
      assessedRevisions: revisions,
      evidence: ['Both items change the invoice export pipeline.'],
      sharedChangeSurface: ['libs/invoices/src/lib/export.ts'],
      compatibleAcceptanceCriteria: true,
      compatibleVerification: true,
      hasOpenDecisions: false,
      hasExistingClaims: false,
      hasPullRequests: true,
      assessedAt,
    });
    expect(analyzeCalls[0]!.signal?.aborted).toBe(false);
    expect(analyzeCalls).toHaveLength(1);
    expect(analyzeCalls[0]!.skill).toBe(analysisSkill);
    expect(analyzeCalls[0]!.context.workspacePath).toBe(workingDirectory);
    expect(analyzeCalls[0]!.request).toContain('#item-1');
    expect(analyzeCalls[0]!.request).toContain('#item-2');
  });

  it('parses a fenced verdict block without a json language tag', async () => {
    // arrange
    const { assessor } = createFixture({
      summary: `Verdict follows.\n\n\`\`\`\n${verdictJson({ relation: 'dependency' })}\n\`\`\`\n`,
    });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.relation).toBe('dependency');
    expect(assessment.evidence).toEqual(['Both items change the invoice export pipeline.']);
  });

  it('adopts the newest fenced block when the message carries several', async () => {
    // arrange
    const superseded = verdictJson({
      relation: 'unrelated',
      evidence: ['Preliminary judgement before reading the repository.'],
      sharedChangeSurface: [],
    });
    const { assessor } = createFixture({
      summary: `\`\`\`json\n${superseded}\n\`\`\`\n\nAfter reading the repository the judgement changed.\n\n\`\`\`json\n${verdictJson()}\n\`\`\`\n`,
    });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.relation).toBe('joint-delivery');
    expect(assessment.evidence).toEqual(['Both items change the invoice export pipeline.']);
    expect(assessment.sharedChangeSurface).toEqual(['libs/invoices/src/lib/export.ts']);
  });

  it('returns the neutral verdict for an unknown relation value', async () => {
    // arrange
    const { assessor } = createFixture({
      summary: `\`\`\`json\n${verdictJson({ relation: 'sibling' })}\n\`\`\``,
    });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.relation).toBe('unrelated');
    expect(assessment.evidence).toEqual([
      'The Analyzer ended without a parsable relation verdict.',
    ]);
    expect(assessment.sharedChangeSurface).toEqual([]);
    expect(assessment.compatibleAcceptanceCriteria).toBe(false);
    expect(assessment.compatibleVerification).toBe(false);
    expect(assessment.hasOpenDecisions).toBe(true);
    expect(assessment.hasPullRequests).toBe(false);
  });

  it('returns the neutral verdict when a compatibility flag is not a boolean', async () => {
    // arrange
    const { assessor } = createFixture({
      summary: `\`\`\`json\n${verdictJson({ compatibleAcceptanceCriteria: 'yes' })}\n\`\`\``,
    });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.relation).toBe('unrelated');
    expect(assessment.evidence).toEqual([
      'The Analyzer ended without a parsable relation verdict.',
    ]);
    expect(assessment.hasOpenDecisions).toBe(true);
  });

  it('returns the neutral verdict when sharedChangeSurface is not an array', async () => {
    // arrange
    const { assessor } = createFixture({
      summary: `\`\`\`json\n${verdictJson({ sharedChangeSurface: 'libs/invoices/src/lib/export.ts' })}\n\`\`\``,
    });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.relation).toBe('unrelated');
    expect(assessment.sharedChangeSurface).toEqual([]);
    expect(assessment.evidence).toEqual([
      'The Analyzer ended without a parsable relation verdict.',
    ]);
  });

  it('swallows a failing Analyzer run into the neutral verdict and reports the cause', async () => {
    // arrange
    const failure = new Error('The Analyzer process exited unexpectedly.');
    const { assessor, reportedFailures } = createFixture({ analyzeFailure: failure });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.relation).toBe('unrelated');
    expect(assessment.evidence).toEqual([
      'The Analyzer could not complete the relation assessment: The Analyzer process exited unexpectedly.',
    ]);
    expect(assessment.hasOpenDecisions).toBe(true);
    expect(reportedFailures).toEqual([failure]);
  });

  it('derives hasExistingClaims from member coordination even when the model denies it', async () => {
    // arrange
    const claimed = workItem('item-2', {
      coordination: { state: 'claimed', claimId: 'claim-1', action: 'solve' },
    });
    const { assessor } = createFixture({
      summary: `\`\`\`json\n${verdictJson({ hasExistingClaims: false })}\n\`\`\``,
    });

    // act
    const assessment = await assessor.assess([workItem('item-1'), claimed], revisions);

    // assert
    expect(assessment.hasExistingClaims).toBe(true);
  });

  it('reports no existing claims for unclaimed members even when the model asserts one', async () => {
    // arrange
    const { assessor } = createFixture({
      summary: `\`\`\`json\n${verdictJson({ hasExistingClaims: true })}\n\`\`\``,
    });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.hasExistingClaims).toBe(false);
  });

  it('returns the neutral verdict without running the agent when no Analyzer skill is active', async () => {
    // arrange
    const { assessor, analyzeCalls } = createFixture({ hasAnalysisSkill: false });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.relation).toBe('unrelated');
    expect(assessment.evidence).toEqual([
      'No Analyzer skill is active for the workspace, so no relation evidence was collected.',
    ]);
    expect(assessment.assessedAt).toBe(assessedAt);
    expect(analyzeCalls).toHaveLength(0);
  });

  it('returns the neutral verdict without running the agent when no checkout is available', async () => {
    // arrange
    const { assessor, analyzeCalls } = createFixture({ workingDirectory: undefined });

    // act
    const assessment = await assessor.assess([workItem('item-1'), workItem('item-2')], revisions);

    // assert
    expect(assessment.relation).toBe('unrelated');
    expect(assessment.evidence).toEqual([
      'No local repository checkout is available, so no relation evidence was collected.',
    ]);
    expect(analyzeCalls).toHaveLength(0);
  });

  it('returns the neutral verdict for an empty proposal without running the agent', async () => {
    // arrange
    const { assessor, analyzeCalls } = createFixture();

    // act
    const assessment = await assessor.assess([], {});

    // assert
    expect(assessment.relation).toBe('unrelated');
    expect(assessment.workItemIds).toEqual([]);
    expect(assessment.evidence).toEqual(['The proposed group has no members.']);
    expect(analyzeCalls).toHaveLength(0);
  });
});
