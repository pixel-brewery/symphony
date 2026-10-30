/**
 * Projects the existing deterministic Codex configuration.
 *
 * @public
 */
export function simulatedCodexConfiguration() {
  return {
    models: [
      {
        id: 'gpt-5.6-sol',
        displayName: 'GPT-5.6-Sol',
        description: 'Frontier agentic coding model.',
        isDefault: true,
        defaultReasoningEffort: 'low',
        reasoningEfforts: [
          { id: 'low', description: 'Fast responses with lighter reasoning' },
          { id: 'medium', description: 'Balanced speed and reasoning depth' },
          { id: 'high', description: 'Greater reasoning depth for complex problems' },
        ],
      },
      {
        id: 'gpt-5.6-terra',
        displayName: 'GPT-5.6-Terra',
        description: 'Balanced agentic coding model for everyday work.',
        isDefault: false,
        defaultReasoningEffort: 'medium',
        reasoningEfforts: [
          { id: 'low', description: 'Fast responses with lighter reasoning' },
          { id: 'medium', description: 'Balanced speed and reasoning depth' },
          { id: 'high', description: 'Greater reasoning depth for complex problems' },
        ],
      },
    ],
    usage: {
      planType: 'pro',
      windows: [
        {
          usedPercent: 32,
          remainingPercent: 68,
          windowDurationMinutes: 300,
          resetsAt: '2030-01-01T12:00:00.000Z',
        },
        {
          usedPercent: 18,
          remainingPercent: 82,
          windowDurationMinutes: 10_080,
          resetsAt: '2030-01-05T12:00:00.000Z',
        },
      ],
      tokenUsage: {
        lifetimeTokens: 12_345_678,
        peakDailyTokens: 456_789,
        currentStreakDays: 4,
      },
    },
  };
}
