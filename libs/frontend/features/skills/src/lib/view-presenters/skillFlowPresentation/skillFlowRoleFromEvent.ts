// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';
import { skillFlowOptions } from './SkillFlowOptions';

// #endregion

export function skillFlowRoleFromEvent(event: unknown): SkillFlowRole | undefined {
  const record =
    typeof event === 'object' && event !== null ? (event as Record<string, unknown>) : {};
  const detail =
    typeof record['detail'] === 'object' && record['detail'] !== null
      ? (record['detail'] as Record<string, unknown>)
      : {};
  const target =
    typeof record['target'] === 'object' && record['target'] !== null
      ? (record['target'] as Record<string, unknown>)
      : {};
  // A selection reports the selected item as `newValue`.
  const newValue = record['newValue'] ?? detail['newValue'];
  const selection =
    typeof newValue === 'object' && newValue !== null
      ? (newValue as Record<string, unknown>)['value']
      : undefined;
  const value = record['value'] ?? detail['value'] ?? selection ?? target['value'];
  return skillFlowOptions.some((option) => option.role === value)
    ? (value as SkillFlowRole)
    : undefined;
}
