import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const catalogRoot = resolve(root, 'libs/frontend/intl/src/lib/resources');
const english = JSON.parse(readFileSync(resolve(catalogRoot, 'lang.en.json'), 'utf8'));
const german = JSON.parse(readFileSync(resolve(catalogRoot, 'lang.de.json'), 'utf8'));
const failures = [];
let references = 0;

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

for (const file of files(resolve(root, 'libs/frontend')).concat(
  files(resolve(root, 'apps/renderer/src')),
)) {
  if (!file.endsWith('.html')) continue;
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\btr\('(loc\.symphony\.[^']+)'(?:,|\))/gu)) {
    references++;
    if (!Object.hasOwn(english, match[1]) || !Object.hasOwn(german, match[1])) {
      failures.push(`${file.slice(root.length)}: unknown translation key ${match[1]}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${references} static template references against both runtime catalogs.`);
}
