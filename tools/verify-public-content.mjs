// #region Imports

import { execFileSync } from 'node:child_process';
import { createReadStream, lstatSync, readlinkSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';

// #endregion

// Keep the excluded private identifier out of public source, including this guard.
const privateIdentifier = String.fromCodePoint(102, 108, 97, 109, 111, 120);
const patterns = [
  Buffer.from(privateIdentifier, 'utf8'),
  Buffer.from(privateIdentifier, 'utf16le'),
];
const overlapBytes = Math.max(...patterns.map((pattern) => pattern.length)) - 1;
const chunkBytes = 64 * 1024;

function containsPrivateIdentifier(content) {
  const normalized = Buffer.from(content);
  for (let index = 0; index < normalized.length; index++) {
    const byte = normalized[index];
    if (byte >= 65 && byte <= 90) normalized[index] = byte + 32;
  }
  return patterns.some((pattern) => normalized.includes(pattern));
}

async function streamContainsPrivateIdentifier(source, transforms = []) {
  return pipeline(source, ...transforms, async (chunks) => {
    let overlap = Buffer.alloc(0);
    let found = false;
    for await (const chunk of chunks) {
      if (found) continue;
      const content = Buffer.concat([overlap, chunk]);
      found = containsPrivateIdentifier(content);
      // Preserve whole byte sequences, including UTF-16 names at odd offsets.
      overlap = content.subarray(Math.max(0, content.length - overlapBytes));
    }
    return found;
  });
}

async function archiveType(filename) {
  const handle = await open(filename, 'r');
  try {
    const header = Buffer.alloc(4);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead >= 2 && header[0] === 0x1f && header[1] === 0x8b) return 'gzip';
    if (
      /\.(?:zip|skill)$/iu.test(filename) ||
      (bytesRead === 4 && [0x04034b50, 0x06054b50, 0x08074b50].includes(header.readUInt32LE()))
    )
      return 'zip';
    return undefined;
  } finally {
    await handle.close();
  }
}

// Python is already required by the canonical agent/portable-skill toolchain.
// Use its ZIP implementation; stream entries without extracting or loading them whole.
const zipScanner = String.raw`
import json, sys, zipfile
identifier = bytes([102, 108, 97, 109, 111, 120])
patterns = (identifier, identifier.decode().encode('utf-16le'))
overlap_size = max(map(len, patterns)) - 1
violations = []
for filename in sys.argv[1:]:
    found = False
    try:
        with zipfile.ZipFile(filename) as archive:
            for member in archive.infolist():
                if identifier.decode() in member.filename.lower():
                    found = True
                if member.is_dir():
                    continue
                overlap = b''
                with archive.open(member) as stream:
                    while True:
                        chunk = stream.read(64 * 1024)
                        if not chunk:
                            break
                        content = overlap + chunk
                        if any(pattern in content.lower() for pattern in patterns):
                            found = True
                        overlap = content[-overlap_size:]
    except Exception:
        raise SystemExit('Unable to inspect source ZIP archive.') from None
    if found:
        violations.append(filename)
print(json.dumps(violations))
`;

/** Check published source paths, working content and decoded vendor archives. */
export async function findPrivateReferences(root = process.cwd()) {
  const paths = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
    .split('\0')
    .filter(Boolean);
  const violations = [];
  const zipPaths = [];

  for (const path of new Set(paths)) {
    const absolute = resolve(root, path);
    let metadata;
    try {
      metadata = lstatSync(absolute);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (!metadata.isFile() && !metadata.isSymbolicLink()) continue;

    let found = path.toLowerCase().includes(privateIdentifier);
    if (!found && metadata.isSymbolicLink()) {
      found = containsPrivateIdentifier(Buffer.from(readlinkSync(absolute)));
    } else if (!found) {
      const compressed = await archiveType(absolute);
      found = await streamContainsPrivateIdentifier(
        createReadStream(absolute, { highWaterMark: chunkBytes }),
      );
      if (!found && compressed === 'gzip') {
        // Backpressure bounds memory independently of expanded tar/archive size.
        found = await streamContainsPrivateIdentifier(
          createReadStream(absolute, { highWaterMark: chunkBytes }),
          [createGunzip({ chunkSize: chunkBytes })],
        );
      }
    }
    if (found) violations.push(path);
    else if (metadata.isFile() && (await archiveType(absolute)) === 'zip') zipPaths.push(path);
  }
  if (zipPaths.length) {
    violations.push(
      ...JSON.parse(
        execFileSync('python3', ['-c', zipScanner, ...zipPaths], {
          cwd: root,
          encoding: 'utf8',
          maxBuffer: 16 * 1024 * 1024,
        }),
      ),
    );
  }
  return violations;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = await findPrivateReferences();
  if (violations.length) {
    console.error(`Private project references found in ${violations.length} file(s):`);
    for (const path of violations) {
      const publicPath = path.replace(new RegExp(privateIdentifier, 'giu'), '[private-project]');
      console.error(`- ${publicPath}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      'Public source paths, content and decoded archives contain no private project references.',
    );
  }
}
