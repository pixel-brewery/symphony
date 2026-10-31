// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkflowStage, IWorkItemReadiness } from '@symphony/domain-workflow';
import {
  projectFieldSearchText,
  type IBoardColumn,
  type IWorkItem,
  type ProjectFieldDefinition,
} from '@symphony/domain-work';
import {
  resolveBoardColumnLayout,
  workItemIdsInProgress,
  workItemIdsNeedingAttention,
} from '@symphony/frontend-core';
import { scorePaletteMatch, type IPaletteResult } from '@symphony/frontend-search';

// #endregion

/** Work items the palette lists at most; the palette cuts the group to the same size. */
const RESULT_LIMIT = 5;

/** `New work item…` opens the new-work-item sheet on the board, as ⌘N does. */
const NEW_WORK_ITEM: IPaletteResult = {
  id: 'command:new-work-item',
  group: 'commands',
  icon: 'add',
  title: 'New work item…',
  shortcut: 'N',
  rank: 0,
  action: { kind: 'navigate', path: '/main/board', queryParams: { create: 'true' } },
};

/**
 * Projects Work's command palette rows: the work items of the active workspace scope matching the
 * query, best first, each with its board column and what it waits for, and `New work item…`.
 *
 * @param items - Work items of the active workspace scope.
 * @param board - Board facts used for the column and the attention state; absent while loading.
 * @param normalizedQuery - Locale-lowercased palette input; empty lists only the command.
 * @returns The matching rows.
 * @public
 */
export function projectWorkPaletteResults(
  items: readonly IWorkItem[],
  board:
    | {
        readonly boardColumns: readonly IBoardColumn[];
        readonly activeBoardId?: string;
        readonly executions: readonly IExecutionRecord[];
        readonly stages: readonly IWorkflowStage[];
        readonly projectFields?: readonly ProjectFieldDefinition[];
        readonly readiness?: readonly IWorkItemReadiness[];
      }
    | undefined,
  normalizedQuery: string,
): readonly IPaletteResult[] {
  if (!normalizedQuery) return [NEW_WORK_ITEM];
  const commandRank = scorePaletteMatch(
    normalizedQuery,
    [NEW_WORK_ITEM.title],
    ['create', 'add', 'issue', 'ticket'],
  );
  const matches = items
    .map((item) => ({
      item,
      rank: scorePaletteMatch(
        normalizedQuery,
        [item.externalId, item.title],
        [
          item.repository,
          projectFieldSearchText(board?.projectFields ?? [], item.projectFields),
          ...item.labels,
          ...item.assignees.flatMap((assignee) => [assignee.login, assignee.displayName]),
          item.body,
        ],
      ),
    }))
    .filter((match) => match.rank > 0)
    .toSorted((left, right) => right.rank - left.rank)
    .slice(0, RESULT_LIMIT);
  const matchedItems = matches.map((match) => match.item);
  const layout = board
    ? resolveBoardColumnLayout(board.boardColumns, board.activeBoardId, items)
    : undefined;
  const waiting = board
    ? workItemIdsNeedingAttention(matchedItems, board.executions, {
        stages: board.stages,
        fields: board.projectFields ?? [],
        readiness: board.readiness ?? [],
      })
    : new Set<string>();
  const running = board ? workItemIdsInProgress(matchedItems, board.executions) : new Set<string>();
  const results: IPaletteResult[] = matches.map(({ item, rank }) => {
    const columnId = layout?.columnIdFor(item);
    const column = layout?.columns.find((candidate) => candidate.id === columnId)?.label;
    // An agent at work outranks the board's attention check, which also flags an item whose
    // analysis is still being written.
    const state = running.has(item.id)
      ? 'agent running'
      : waiting.has(item.id)
        ? 'waiting for you'
        : undefined;
    return {
      id: `work-item:${item.id}`,
      group: 'work-items',
      icon: 'board',
      reference: item.externalId,
      title: item.title,
      facts: [column, state].filter((fact): fact is string => Boolean(fact)),
      rank,
      action: { kind: 'navigate', path: '/main/board', queryParams: { item: item.id } },
    };
  });
  return commandRank > 0 ? [...results, { ...NEW_WORK_ITEM, rank: commandRank }] : results;
}
