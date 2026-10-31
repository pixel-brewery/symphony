import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const workspaceRoot = process.cwd();
const templateRoots = ['apps', 'libs'];
const toggleTagPattern = /<mosaik-toggle-switch\b[\s\S]*?>/g;
const primaryVariantPattern = /\[variant\]\s*=\s*"\s*'primary'\s*"/;

const rendererSourceFiles = templateRoots.flatMap((root) =>
  collectRendererSources(join(workspaceRoot, root)),
);
const violations = [];

for (const file of rendererSourceFiles) {
  const source = readFileSync(file, 'utf8');

  for (const match of source.matchAll(toggleTagPattern)) {
    if (primaryVariantPattern.test(match[0])) {
      continue;
    }

    violations.push({
      file: relative(workspaceRoot, file),
      line: source.slice(0, match.index).split('\n').length,
    });
  }
}

if (violations.length > 0) {
  console.error('Every Mosaik Toggle Switch must explicitly bind [variant]="\'primary\'".');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${countToggleSwitches(rendererSourceFiles)} primary Mosaik Toggle Switches.`,
  );
}

function collectRendererSources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectRendererSources(path);
    }
    return ['.html', '.ts'].includes(extname(entry.name)) ? [path] : [];
  });
}

function countToggleSwitches(files) {
  return files.reduce((count, file) => {
    const matches = readFileSync(file, 'utf8').match(toggleTagPattern);
    return count + (matches?.length ?? 0);
  }, 0);
}
