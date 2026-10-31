/**
 * Replaces an existing editor item in place or appends a newly configured item.
 *
 * @param items - The latest configured list.
 * @param item - The validated form result.
 * @returns A new list preserving the existing order.
 * @public
 */
export function upsertSettingsItem<TItem extends { readonly id: string }>(
  items: readonly TItem[],
  item: TItem,
): TItem[] {
  return items.some((candidate) => candidate.id === item.id)
    ? items.map((candidate) => (candidate.id === item.id ? item : candidate))
    : [...items, item];
}
