// #region Imports

import { isAbsolute } from 'node:path';

// #endregion

export function argumentsAllowed(executable: string, arguments_: readonly string[]): boolean {
  const exact = (...expected: readonly string[]): boolean =>
    arguments_.length === expected.length &&
    arguments_.every((argument, index) => argument === expected[index]);
  const safeScript = (value: string | undefined): boolean =>
    Boolean(value && /^[a-zA-Z0-9:_-]+$/u.test(value));
  const safeTarget = (value: string | undefined): boolean =>
    Boolean(
      value &&
      !value.startsWith('-') &&
      !isAbsolute(value) &&
      !value.split(/[\\/]/u).includes('..'),
    );

  switch (executable) {
    case 'npm':
      return (
        exact('ci') ||
        exact('ci', '--ignore-scripts') ||
        (arguments_.length === 2 && arguments_[0] === 'run' && safeScript(arguments_[1]))
      );
    case 'pnpm':
      return (
        exact('install', '--frozen-lockfile') ||
        exact('install', '--frozen-lockfile', '--ignore-scripts') ||
        (arguments_.length === 1 && safeScript(arguments_[0]))
      );
    case 'yarn':
      return (
        exact('install', '--immutable') ||
        exact('install', '--immutable', '--mode=skip-build') ||
        (arguments_.length === 1 && safeScript(arguments_[0]))
      );
    case 'dotnet':
      return (
        (arguments_.length === 2 && arguments_[0] === 'restore' && safeTarget(arguments_[1])) ||
        (arguments_.length === 3 &&
          arguments_[0] === 'build' &&
          safeTarget(arguments_[1]) &&
          arguments_[2] === '--no-restore') ||
        (arguments_.length === 3 &&
          arguments_[0] === 'test' &&
          safeTarget(arguments_[1]) &&
          arguments_[2] === '--no-build')
      );
    case 'python':
    case 'python3':
      return exact('-m', 'pip', 'install', '-e', '.') || exact('-m', 'pytest');
    case 'uv':
      return exact('sync', '--frozen') || exact('run', 'pytest');
    case 'poetry':
      return exact('install', '--no-interaction') || exact('run', 'pytest');
    case 'mvn':
    case './mvnw':
      return exact('verify', '--batch-mode');
    case 'gradle':
    case './gradlew':
      return exact('check', '--no-daemon');
    case 'go':
      return exact('mod', 'download') || exact('test', './...');
    case 'cargo':
      return exact('fetch', '--locked') || exact('test', '--locked');
  }
  return false;
}
