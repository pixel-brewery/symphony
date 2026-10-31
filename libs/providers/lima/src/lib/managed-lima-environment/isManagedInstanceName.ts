// #region Imports

import { MANAGED_INSTANCE_PREFIXES } from './ManagedInstancePrefixes';

// #endregion

export function isManagedInstanceName(value: string): boolean {
  return (
    MANAGED_INSTANCE_PREFIXES.some((prefix) =>
      new RegExp(`^${prefix}-[0-9a-f]{16}$`, 'u').test(value),
    ) || /^symphony-ci-symphony-[0-9]+-[0-9a-f]{12}$/u.test(value)
  );
}
