import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const version = process.argv[2] ?? process.env['SYMPHONY_RELEASE_VERSION'];
if (!version || !/^\d+\.\d+\.\d+$/u.test(version)) {
  throw new Error('A numeric major.minor.patch SYMPHONY_RELEASE_VERSION is required.');
}
if (version.split('.').some((part) => Number(part) > 65_535)) {
  throw new Error('Every release version component must fit the Windows version range.');
}

const packagePath = resolve('package.json');
const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
packageJson.version = version;
await writeFile(packagePath, `${JSON.stringify(packageJson, undefined, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ event: 'release.version.set', version })}\n`);
