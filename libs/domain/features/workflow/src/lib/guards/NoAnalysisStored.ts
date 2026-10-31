export /**
 * What every guard reports when the work item carries no analysis at all.
 *
 * Several guards read facts only an analysis can establish. Without one they all fail closed,
 * and each inventing its own wording would state conditions nobody ever asserted - a missing
 * analysis would be reported as an open dependency and an unapproved risk class. They share
 * this sentence instead, so the rationale names the single real cause once.
 */
const noAnalysisStored = 'No analysis is stored for this work item.';
