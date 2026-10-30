/**
 * Preserves mutable form assignments while notifying the owning reactive projection.
 *
 * @param draft - The feature's initial form value.
 * @param onChange - Invalidates projections when the form is created or a value changes.
 * @returns The same form shape with tracked property assignments.
 * @public
 */
export function createTrackedSettingsDraft<TDraft extends object>(
  draft: TDraft,
  onChange: () => void,
): TDraft {
  onChange();
  return new Proxy(draft, {
    set: (target, property, value, receiver) => {
      const previous = Reflect.get(target, property, receiver);
      const assigned = Reflect.set(target, property, value, receiver);
      if (assigned && !Object.is(previous, value)) onChange();
      return assigned;
    },
  });
}
