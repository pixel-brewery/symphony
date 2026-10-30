export type GitHubCommandRunner = (
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
  standardInput?: string,
) => Promise<string>;
