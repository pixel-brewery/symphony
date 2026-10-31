// #region Imports

import type { ProjectFieldDefinition, IWorkItem } from '@symphony/domain-work';
import type { WorkItemMutationDto } from '@symphony/ipc-contracts-work';

// #endregion

/**
 * The update contract takes the whole item, not a patch: assigning from the card menu must
 * write every field it does not touch back unchanged, so the mutation is derived from the
 * complete item. The item must carry its full detail (`detailState: 'complete'`) - a summary
 * body written back would truncate the item at the tracker.
 *
 * `fields` are the definitions of the item's own board: an item can sit in several GitHub
 * Projects at once, and its snapshot then carries values of foreign boards too, which the
 * tracker rejects as unknown fields on a write. A value without a matching definition is
 * left out; the tracker leaves fields the mutation does not name untouched.
 */
export function toggleAssigneeMutation(
  item: IWorkItem,
  login: string,
  fields: readonly ProjectFieldDefinition[],
): WorkItemMutationDto {
  const logins = (item.assignees ?? []).map((assignee) => assignee.login);
  return {
    ...(item.workspaceId ? { workspaceId: item.workspaceId } : {}),
    ...(item.sourceId ? { sourceId: item.sourceId } : {}),
    title: item.title,
    body: item.body,
    repository: item.repository,
    ...(item.repositoryBindingIds?.length
      ? { repositoryBindingIds: item.repositoryBindingIds }
      : {}),
    projectFields: (item.projectFields ?? []).filter((value) =>
      fields.some((field) => field.id === value.fieldId && field.type === value.type),
    ),
    labels: item.labels,
    assignees: logins.includes(login)
      ? logins.filter((candidate) => candidate !== login)
      : [...logins, login],
  };
}
