// #region Imports

import type { IFeature } from './IFeature';
import type { IFeatureIncompatibilityRule } from './IFeatureIncompatibilityRule';

// #endregion

/**
 * Rejects conflicting frontend registrations before providers are materialized.
 *
 * @param features - Complete contribution set for the owning capability.
 * @param rules - Capability-owned incompatibilities evaluated after registration conflicts.
 * @throws An Error for an exclusive-kind conflict, duplicate identifier or violated rule.
 * @public
 */
export function validateFeatures<TKind extends string>(
  features: ReadonlyArray<IFeature<TKind>>,
  rules: ReadonlyArray<IFeatureIncompatibilityRule<TKind>> = [],
): void {
  const byKind = new Map<string, IFeature<TKind>[]>();

  for (const feature of features) {
    const contributions = byKind.get(feature.kind) ?? [];
    contributions.push(feature);
    byKind.set(feature.kind, contributions);
  }

  for (const [kind, contributions] of byKind) {
    if (
      contributions.length > 1 &&
      contributions.some((feature) => feature.options.multi !== true)
    ) {
      const ids = contributions.map((feature) => feature.id).join(', ');
      throw new Error(
        `Feature conflict: multiple features of non-multi kind '${kind}' detected [${ids}]. ` +
          'Either mark such features as { multi: true } or register only one.',
      );
    }
  }

  for (const [kind, contributions] of byKind) {
    const seen = new Set<string>();

    for (const feature of contributions) {
      if (seen.has(feature.id)) {
        throw new Error(
          `Feature conflict: duplicate id '${feature.id}' within kind '${kind}'. ` +
            'Each feature id must be unique per kind.',
        );
      }
      seen.add(feature.id);
    }
  }

  for (const rule of rules) {
    if (rule.isViolated(features)) {
      throw new Error(`Feature incompatibility [${rule.id}]: ${rule.message}`);
    }
  }
}
