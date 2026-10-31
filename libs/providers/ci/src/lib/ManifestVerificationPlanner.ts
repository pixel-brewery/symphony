// #region Imports

import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import type { IVerificationPlanDraft, IVerificationPlannerPort } from '@symphony/application-ci';
import type { IPreparedRepository, IRepositoryBinding } from '@symphony/domain-workspace';
import type {
  IVerificationEvidence,
  IVerificationStep,
  VerificationStepKind,
} from '@symphony/domain-ci';

// #endregion

interface IPackageManifest {
  readonly scripts?: Readonly<Record<string, string>>;
  readonly packageManager?: string;
}

const MAX_DISCOVERED_FILES = 10_000;
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.idea',
  '.vscode',
  'bin',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'obj',
  'target',
  'vendor',
]);

export class ManifestVerificationPlanner implements IVerificationPlannerPort {
  // #region Methods

  /**
   * Returns the plan.
   *
   * @param _repository - Repository.
   * @param prepared - Prepared.
   * @param signal - Signal.
   * @public
   */
  public async plan(
    _repository: IRepositoryBinding,
    prepared: IPreparedRepository,
    signal: AbortSignal,
  ): Promise<IVerificationPlanDraft> {
    if (signal.aborted) throw new Error('Verification planning was cancelled.');
    const files = discoverFiles(prepared.path);
    const fileSet = new Set(files);
    const technologies: string[] = [];
    const evidence: IVerificationEvidence[] = [];
    const steps: IVerificationStep[] = [];

    if (fileSet.has('package.json')) {
      technologies.push('Node.js');
      evidence.push({ path: 'package.json', reason: 'Node.js package manifest' });
      const manifest = readPackageManifest(join(prepared.path, 'package.json'));
      const manager = nodePackageManager(fileSet, manifest.packageManager);
      // Dependency build scripts stay enabled: repositories with native modules cannot compile,
      // and their suites cannot run, without them. The restore step therefore asks for the
      // dependency-build capability, which the operator approves per repository.
      const restoreArguments =
        manager === 'npm'
          ? ['ci']
          : manager === 'pnpm'
            ? ['install', '--frozen-lockfile']
            : ['install', '--immutable'];
      steps.push(
        step(
          'node-restore',
          'restore',
          `${manager} dependencies`,
          manager,
          restoreArguments,
          'dependencies',
        ),
      );
      for (const [scriptName, kind] of [
        ['lint', 'lint'],
        ['typecheck', 'lint'],
        ['test', 'unit-test'],
        ['build', 'build'],
        ['e2e', 'e2e-test'],
        ['test:e2e', 'e2e-test'],
      ] as const) {
        if (!manifest.scripts?.[scriptName]) continue;
        steps.push(
          step(
            `node-${scriptName.replace(/[^a-z0-9]+/giu, '-')}`,
            kind,
            `${manager} ${scriptName}: ${manifest.scripts[scriptName]!.slice(0, 500)}`,
            manager,
            manager === 'npm' ? ['run', scriptName] : [scriptName],
            kind === 'e2e-test' ? 'tests' : 'none',
          ),
        );
      }
    }

    const solution = files.find((path) => extname(path).toLowerCase() === '.sln');
    const dotnetProject = files.find((path) => /\.(?:cs|fs|vb)proj$/iu.test(path));
    if (solution || dotnetProject) {
      const target = solution ?? dotnetProject!;
      technologies.push('.NET');
      evidence.push({ path: target, reason: solution ? '.NET solution' : '.NET project' });
      steps.push(
        step(
          'dotnet-restore',
          'restore',
          'Restore .NET dependencies',
          'dotnet',
          ['restore', target],
          'dependencies',
        ),
        step(
          'dotnet-build',
          'build',
          'Build .NET projects',
          'dotnet',
          ['build', target, '--no-restore'],
          'none',
        ),
        step(
          'dotnet-test',
          'unit-test',
          'Run .NET tests',
          'dotnet',
          ['test', target, '--no-build'],
          'none',
        ),
      );
    }

    if (fileSet.has('pyproject.toml')) {
      technologies.push('Python');
      evidence.push({ path: 'pyproject.toml', reason: 'Python project manifest' });
      if (fileSet.has('uv.lock')) {
        evidence.push({ path: 'uv.lock', reason: 'uv dependency lock' });
        steps.push(
          step(
            'python-restore',
            'restore',
            'Restore Python dependencies',
            'uv',
            ['sync', '--frozen'],
            'dependencies',
          ),
        );
        steps.push(
          step('python-test', 'unit-test', 'Run Python tests', 'uv', ['run', 'pytest'], 'none'),
        );
      } else if (fileSet.has('poetry.lock')) {
        evidence.push({ path: 'poetry.lock', reason: 'Poetry dependency lock' });
        steps.push(
          step(
            'python-restore',
            'restore',
            'Restore Python dependencies',
            'poetry',
            ['install', '--no-interaction'],
            'dependencies',
          ),
        );
        steps.push(
          step('python-test', 'unit-test', 'Run Python tests', 'poetry', ['run', 'pytest'], 'none'),
        );
      } else {
        steps.push(
          step(
            'python-restore',
            'restore',
            'Install Python project',
            'python',
            ['-m', 'pip', 'install', '-e', '.'],
            'dependencies',
          ),
        );
        steps.push(
          step('python-test', 'unit-test', 'Run Python tests', 'python', ['-m', 'pytest'], 'none'),
        );
      }
    }

    if (fileSet.has('pom.xml')) {
      technologies.push('Java / Maven');
      evidence.push({ path: 'pom.xml', reason: 'Maven project manifest' });
      const executable = fileSet.has('mvnw') ? './mvnw' : 'mvn';
      steps.push(
        step(
          'maven-verify',
          'unit-test',
          'Run Maven verification',
          executable,
          ['verify', '--batch-mode'],
          'dependencies',
        ),
      );
    } else if (fileSet.has('build.gradle') || fileSet.has('build.gradle.kts')) {
      const manifest = fileSet.has('build.gradle.kts') ? 'build.gradle.kts' : 'build.gradle';
      technologies.push('Java / Gradle');
      evidence.push({ path: manifest, reason: 'Gradle project manifest' });
      const executable = fileSet.has('gradlew') ? './gradlew' : 'gradle';
      steps.push(
        step(
          'gradle-check',
          'unit-test',
          'Run Gradle checks',
          executable,
          ['check', '--no-daemon'],
          'dependencies',
        ),
      );
    }

    if (fileSet.has('go.mod')) {
      technologies.push('Go');
      evidence.push({ path: 'go.mod', reason: 'Go module manifest' });
      steps.push(
        step(
          'go-restore',
          'restore',
          'Download Go modules',
          'go',
          ['mod', 'download'],
          'dependencies',
        ),
        step('go-test', 'unit-test', 'Run Go tests', 'go', ['test', './...'], 'none'),
      );
    }

    if (fileSet.has('Cargo.toml')) {
      technologies.push('Rust');
      evidence.push({ path: 'Cargo.toml', reason: 'Cargo package manifest' });
      steps.push(
        step(
          'cargo-restore',
          'restore',
          'Fetch Rust dependencies',
          'cargo',
          ['fetch', '--locked'],
          'dependencies',
        ),
        step('cargo-test', 'unit-test', 'Run Rust tests', 'cargo', ['test', '--locked'], 'none'),
      );
    }

    return { technologies, evidence, steps: uniqueSteps(steps) };
  }

  // #endregion
}

function discoverFiles(root: string): readonly string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    if (files.length >= MAX_DISCOVERED_FILES) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (files.length >= MAX_DISCOVERED_FILES) return;
      if (entry.isSymbolicLink() || (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)))
        continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(relative(root, path));
    }
  };
  visit(root);
  return files;
}

function readPackageManifest(path: string): IPackageManifest {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as IPackageManifest;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (cause) {
    throw new Error(
      `Unable to inspect package.json: ${cause instanceof Error ? cause.message : 'invalid JSON'}`,
      {
        cause,
      },
    );
  }
}

function nodePackageManager(
  files: ReadonlySet<string>,
  declared?: string,
): 'npm' | 'pnpm' | 'yarn' {
  const name = declared?.split('@', 1)[0];
  if (name === 'npm' || name === 'pnpm' || name === 'yarn') return name;
  if (files.has('pnpm-lock.yaml')) return 'pnpm';
  if (files.has('yarn.lock')) return 'yarn';
  return 'npm';
}

function step(
  id: string,
  kind: VerificationStepKind,
  label: string,
  executable: string,
  arguments_: readonly string[],
  network: IVerificationStep['network'],
): IVerificationStep {
  return {
    id,
    kind,
    label,
    executable,
    arguments: arguments_,
    workingDirectory: '.',
    timeoutSeconds: kind === 'e2e-test' ? 1_800 : 900,
    network,
    artifactPaths:
      kind === 'e2e-test'
        ? ['playwright-report', 'test-results']
        : kind === 'unit-test'
          ? ['coverage', 'TestResults']
          : [],
  };
}

function uniqueSteps(steps: readonly IVerificationStep[]): readonly IVerificationStep[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = `${step.executable}\0${step.arguments.join('\0')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
