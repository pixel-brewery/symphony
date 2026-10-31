const SIMULATED_MODEL_INTELLIGENCE: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'gpt-5.6-sol': { low: 51, medium: 56, high: 57, xhigh: 59, max: 61 },
  'gpt-5.6-terra': { low: 45, medium: 50, high: 53, xhigh: 55, max: 57 },
};

const SIMULATED_FLAT_MODEL_INTELLIGENCE: Readonly<Record<string, number>> = {
  'opencode/deepseek-v4-flash-free': 42,
  'opencode/hy3-free': 38,
  'opencode/laguna-s-2.1-free': 35,
  'opencode/mimo-v2.5-free': 33,
  'opencode/nemotron-3.5-lightning-free': 40,
};

/**
 * Projects the existing effort-specific simulated model scores.
 *
 * @public
 */
export function simulatedModelIntelligence(input: {
  readonly targets: readonly { readonly model: string; readonly reasoningEffort: string | null }[];
}) {
  return {
    scores: input.targets.map((target) => {
      const intelligenceIndex =
        SIMULATED_MODEL_INTELLIGENCE[target.model]?.[target.reasoningEffort ?? 'medium'] ??
        SIMULATED_FLAT_MODEL_INTELLIGENCE[target.model] ??
        null;
      return {
        ...target,
        intelligenceIndex,
        matchedModelName: intelligenceIndex === null ? null : target.model,
      };
    }),
    indexVersion: 'simulated',
    retrievedAt: new Date().toISOString(),
    source: 'artificial-analysis' as const,
  };
}
