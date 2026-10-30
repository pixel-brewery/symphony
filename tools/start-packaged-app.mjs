import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const applicationRoot = resolve('out', `Symphony-${process.platform}-${process.arch}`);
const launch =
  process.platform === 'darwin'
    ? { command: 'open', args: ['-n', resolve(applicationRoot, 'Symphony.app')] }
    : process.platform === 'win32'
      ? { command: resolve(applicationRoot, 'Symphony.exe'), args: [] }
      : { command: resolve(applicationRoot, 'Symphony'), args: [] };

const applicationPath = process.platform === 'darwin' ? launch.args[1] : launch.command;
await access(applicationPath);

const child = spawn(launch.command, launch.args, {
  detached: true,
  stdio: 'ignore',
});
child.unref();
