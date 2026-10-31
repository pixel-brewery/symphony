import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { analyseModule, fileStemFor } from './split-module.mjs';
import { collectTypeScriptFiles, moveFile, rewriteFile } from './rewrite-imports.mjs';

const ROOT = process.cwd();

/**
 * Renames single-export modules so the file name states what the module is: PascalCase for
 * classes, types and constants, and the function's own lowercase-first name for a function
 * module.
 */
export function planFileNameNormalisation() {
  const audit = JSON.parse(
    execSync('node tools/instruction-compliance.mjs --json', { encoding: 'utf8', maxBuffer: 1e8 }),
  );
  const candidates = [
    ...new Set(
      [...audit['file-name-pascal-case'], ...audit['file-name-matches-export']].map(
        (entry) => entry.file,
      ),
    ),
  ];

  const manifest = {};
  const moves = [];
  const claimed = new Map();
  const conflicts = [];

  for (const file of candidates) {
    const analysis = analyseModule(resolve(ROOT, file));
    const exported = analysis.units.filter((unit) => unit.exported);
    if (exported.length !== 1) continue;
    const unit = exported[0];
    const isFunctionModule =
      unit.kind === 'function' ||
      (unit.kind === 'const' &&
        /=\s*(async\s*)?(\(|function\b)/.test(unit.text.split('\n')[0] ?? ''));
    const stem = isFunctionModule ? unit.name : fileStemFor(unit.name);
    const target = join(dirname(file), `${stem}.ts`);
    if (target === file) continue;

    const key = target.toLowerCase();
    if (claimed.has(key)) {
      conflicts.push([file, claimed.get(key), target]);
      continue;
    }
    // A same-name-different-case target is this file itself on a case-insensitive filesystem.
    if (key !== file.toLowerCase() && existsSync(resolve(ROOT, target))) {
      conflicts.push([file, target, target]);
      continue;
    }
    claimed.set(key, file);
    manifest[file] = { '*': target };
    moves.push([file, target]);
  }
  return { manifest, moves, conflicts };
}

if (process.argv.includes('--apply') || process.argv.includes('--plan')) {
  const { manifest, moves, conflicts } = planFileNameNormalisation();
  process.stdout.write(`renames: ${moves.length}\n`);
  for (const [file, other] of conflicts) process.stdout.write(`  CONFLICT ${file} vs ${other}\n`);
  if (process.argv.includes('--apply')) {
    for (const [from, to] of moves) moveFile(from, to);
    let touched = 0;
    for (const file of collectTypeScriptFiles()) if (rewriteFile(file, manifest)) touched += 1;
    process.stdout.write(`rewrote imports in ${touched} file(s)\n`);
  }
}
