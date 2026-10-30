export /**
 * A segment owns a bucket of the shared walk, either through `paths` or - for the one
 * residual definition per group - through the group roots themselves, which every nested
 * bucket overrides. A segment with `from` owns no bucket: it sums the totals of other groups,
 * which is what keeps the managed total and the dedicated bars showing the same bytes.
 */
interface ISegmentDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly paths?: readonly string[];
  readonly from?: readonly string[];
}
