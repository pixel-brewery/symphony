// #region Imports

import { type IAnalysisArtifact, type RiskClass, riskClasses } from '@symphony/domain-workflow';

// #endregion

/**
 * Parses the Definition of Ready from an analysis report.
 *
 * Returns `undefined` when the section, the JSON block, or any guard-relevant field is missing
 * or malformed. The issue revision comes from Symphony's own work-item snapshot, never from the
 * agent: the agent cannot know which revision Symphony handed it.
 */
export function parseAnalysisArtifact(
  analysis: string,
  issueRevision: string,
): IAnalysisArtifact | undefined {
  const json = definitionOfReadyJson(analysis);
  if (!json) return undefined;
  let block: IDefinitionOfReadyBlock;
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
    block = parsed as IDefinitionOfReadyBlock;
  } catch {
    return undefined;
  }

  if (typeof block.feasible !== 'boolean') return undefined;
  if (typeof block.ready_for_solve !== 'boolean') return undefined;
  const unresolvedQuestions = stringArray(block.unresolved_questions);
  if (!unresolvedQuestions) return undefined;
  const testStrategy = stringArray(block.test_strategy);
  if (!testStrategy) return undefined;
  if (!Array.isArray(block.acceptance_mapping)) return undefined;
  const acceptanceMapping: IAnalysisArtifact['acceptanceMapping'][number][] = [];
  for (const entry of block.acceptance_mapping as readonly unknown[]) {
    if (typeof entry !== 'object' || entry === null) return undefined;
    const candidate = entry as {
      criterion?: unknown;
      implementation_step?: unknown;
      verification?: unknown;
    };
    if (
      typeof candidate.criterion !== 'string' ||
      typeof candidate.implementation_step !== 'number' ||
      typeof candidate.verification !== 'string'
    ) {
      return undefined;
    }
    acceptanceMapping.push({
      acceptanceCriterion: candidate.criterion,
      implementationStep: candidate.implementation_step,
      verification: candidate.verification,
    });
  }
  const risk =
    typeof block.risk === 'object' && block.risk !== null
      ? (block.risk as { class?: unknown; reasons?: unknown })
      : undefined;
  const declaredRiskClass = riskClass(risk?.class);
  if (!declaredRiskClass) return undefined;

  const dependencies: IAnalysisArtifact['dependencies'][number][] = [];
  if (Array.isArray(block.dependencies)) {
    for (const entry of block.dependencies as readonly unknown[]) {
      if (typeof entry !== 'object' || entry === null) continue;
      const candidate = entry as { work_item_id?: unknown; type?: unknown; note?: unknown };
      if (
        typeof candidate.work_item_id !== 'string' ||
        (candidate.type !== 'hard' && candidate.type !== 'soft')
      ) {
        continue;
      }
      dependencies.push({
        workItemId: candidate.work_item_id,
        type: candidate.type,
        ...(typeof candidate.note === 'string' ? { note: candidate.note } : {}),
      });
    }
  }

  const implementationPlan: IAnalysisArtifact['implementationPlan'][number][] = [];
  if (Array.isArray(block.implementation_plan)) {
    for (const entry of block.implementation_plan as readonly unknown[]) {
      if (typeof entry !== 'object' || entry === null) continue;
      const candidate = entry as { step?: unknown; description?: unknown };
      if (typeof candidate.step !== 'number' || typeof candidate.description !== 'string') continue;
      implementationPlan.push({ step: candidate.step, description: candidate.description });
    }
  }

  return {
    feasible: block.feasible,
    issueRevision,
    problemUnderstanding:
      typeof block.problem_understanding === 'string' ? block.problem_understanding : '',
    affectedComponents: stringArray(block.affected_components) ?? [],
    likelyChangeSurface: stringArray(block.likely_change_surface) ?? [],
    dependencies,
    implementationPlan,
    databaseMigrationRequired: block.database_migration_required === true,
    risk: { class: declaredRiskClass, reasons: stringArray(risk?.reasons) ?? [] },
    testStrategy,
    acceptanceMapping,
    unresolvedQuestions,
    collisionRisk: riskClass(block.collision_risk) ?? declaredRiskClass,
    readyForSolve: block.ready_for_solve,
  };
}

interface IDefinitionOfReadyBlock {
  readonly feasible?: unknown;
  readonly ready_for_solve?: unknown;
  readonly unresolved_questions?: unknown;
  readonly test_strategy?: unknown;
  readonly acceptance_mapping?: unknown;
  readonly affected_components?: unknown;
  readonly likely_change_surface?: unknown;
  readonly dependencies?: unknown;
  readonly database_migration_required?: unknown;
  readonly risk?: unknown;
  readonly collision_risk?: unknown;
  readonly problem_understanding?: unknown;
  readonly implementation_plan?: unknown;
}

function stringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length === value.length ? items : undefined;
}

function riskClass(value: unknown): RiskClass | undefined {
  return typeof value === 'string' && (riskClasses as readonly string[]).includes(value)
    ? (value as RiskClass)
    : undefined;
}

/** Extracts the fenced JSON block of the Definition-of-ready section, if the report has one. */
function definitionOfReadyJson(analysis: string): string | undefined {
  const lines = analysis.split(/\r?\n/u);
  let inSection = false;
  let inFence = false;
  const block: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,6}\s+definition of ready\b/iu.test(trimmed)) {
      inSection = true;
      continue;
    }
    if (inSection && !inFence && /^#{1,6}\s+/u.test(trimmed)) break;
    if (!inSection) continue;
    if (/^```/u.test(trimmed)) {
      if (inFence) return block.join('\n');
      inFence = true;
      continue;
    }
    if (inFence) block.push(line);
  }
  return undefined;
}
