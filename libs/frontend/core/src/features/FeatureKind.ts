/**
 * Identifies one category of frontend feature contributions.
 *
 * @typeParam TName - Literal name of the contribution category.
 * @public
 */
export type FeatureKind<TName extends string> = TName & { readonly __brand: 'FeatureKind' };
