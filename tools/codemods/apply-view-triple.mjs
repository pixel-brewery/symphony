import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectTypeScriptFiles } from './rewrite-imports.mjs';

const ROOT = process.cwd();
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
const HOST_STYLESHEET = ':host {\n  display: block;\n}\n';

/**
 * Gives every concrete View its own `.html` and `.scss` siblings and points the component at
 * them. Tailwind and Mosaik still own the visuals; the stylesheet exists so each View is an
 * isolated three-file unit.
 */
export function applyViewTriple(filePath) {
  const name = basename(filePath, '.ts');
  if (!name.endsWith('View')) return false;
  const text = readFileSync(filePath, 'utf8');
  if (!text.includes('@Component')) return false;

  let changed = false;
  const stylesheet = join(dirname(filePath), `${name}.scss`);
  if (!existsSync(stylesheet)) {
    writeFileSync(stylesheet, HOST_STYLESHEET, 'utf8');
    changed = true;
  }

  if (text.includes(`styleUrl: './${name}.scss'`)) return changed;

  let updated = text;
  if (/styleUrl:\s*'[^']*'/.test(updated))
    updated = updated.replace(/styleUrl:\s*'[^']*'/, `styleUrl: './${name}.scss'`);
  else if (updated.includes('templateUrl:'))
    updated = updated.replace(/(templateUrl:\s*'[^']*',?)/, `$1\n  styleUrl: './${name}.scss',`);
  else return changed;

  writeFileSync(filePath, updated, 'utf8');
  return true;
}

if (isEntryPoint) {
  let changed = 0;
  for (const file of collectTypeScriptFiles()) if (applyViewTriple(file)) changed += 1;
  process.stdout.write(`view triples completed for ${changed} view(s)\n`);
}
