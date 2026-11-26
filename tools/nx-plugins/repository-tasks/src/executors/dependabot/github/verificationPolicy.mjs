/**
 * Defines the complete native CI evidence and the independently enforced branch checks.
 *
 * @remarks All eight jobs are required for dependency merge proof. GitHub enforces six protected contexts, including the aggregate Quality Gate.
 *
 * @internal
 */
export const verificationPolicy = Object.freeze({
  workflowFile: 'ci.yml',
  workflowPath: '.github/workflows/ci.yml',
  workflowName: 'Repository Quality',
  /**
   * Fixed release workflow name accepted only as a trigger for fresh native CI recovery.
   *
   * @internal
   */
  releaseWorkflowName: 'Continuous Desktop Release',
  reviewedCiSha256: '602e158f34dfac790a2d95b6afcbb5b67802047db07a2bfa9dfab86e30520d09',
  requiredJobs: Object.freeze([
    'Classify changed files',
    'Documentation links and structure',
    'Agents, Format, Lint, Typecheck, Test and Build (ubuntu-latest)',
    'Agents, Format, Lint, Typecheck, Test and Build (macos-latest)',
    'Agents, Format, Lint, Typecheck, Test and Build (windows-latest)',
    'Electron E2E',
    'Package smoke test',
    'Quality Gate',
  ]),
  requiredChecks: Object.freeze([
    'Agents, Format, Lint, Typecheck, Test and Build (ubuntu-latest)',
    'Agents, Format, Lint, Typecheck, Test and Build (macos-latest)',
    'Agents, Format, Lint, Typecheck, Test and Build (windows-latest)',
    'Electron E2E',
    'Package smoke test',
    'Quality Gate',
  ]),
});
