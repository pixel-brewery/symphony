// #region Imports

import type { IWorkflowStage, WorkflowStageId } from '@symphony/domain-workflow';

// #endregion

/**
 * Suggests the stage a provider column most likely represents, matching first on the
 * configured stage labels and identifiers and then on well-known aliases. Used only to
 * pre-fill the settings editor; the runtime mapping is always the explicit
 * `columnMappings` of the work-item source.
 */
export function suggestStageId(
  label: string | undefined,
  stages: readonly IWorkflowStage[],
): WorkflowStageId | undefined {
  const normalized = normalizeLabel(label);
  if (!normalized) return undefined;
  const direct = stages.find(
    (stage) =>
      normalizeLabel(stage.label) === normalized || normalizeLabel(stage.id) === normalized,
  );
  if (direct) return direct.id;
  return stages.find((stage) => (stageLabelAliases[stage.id] ?? []).includes(normalized))?.id;
}

/** Aliases considered equivalent to a stage label when pre-filling the settings editor. */
const stageLabelAliases: Readonly<Record<string, readonly string[]>> = {
  backlog: ['backlog', 'new', 'todo', 'to do', 'triage', 'icebox', 'inbox'],
  qualified: ['qualified', 'approved', 'prepared', 'refined', 'groomed', 'selected', 'up next'],
  ready: ['ready', 'preparation', 'planned', 'plan', 'planning', 'scheduled', 'analyzed'],
  progress: [
    'progress',
    'in progress',
    'doing',
    'in development',
    'development',
    'implementing',
    'implementation',
    'executing',
    'rollout',
  ],
  acceptance: [
    'acceptance',
    'in acceptance',
    'review',
    'in review',
    'reviewing',
    'testing',
    'qa',
    'verification',
    'validation',
  ],
  done: ['done', 'completed', 'complete', 'closed', 'finished', 'released', 'shipped'],
};

function normalizeLabel(label: string | undefined): string {
  return (
    label
      ?.trim()
      .toLocaleLowerCase()
      .replace(/\s*\([^)]*\)\s*/gu, ' ')
      .replace(/[\s_-]+/gu, ' ')
      .trim() ?? ''
  );
}
