export function normalizedArchitecture(value: string): 'arm64' | 'x64' {
  if (value === 'arm64') return 'arm64';
  if (value === 'x64' || value === 'x86_64') return 'x64';
  throw new Error(`Managed local CI does not support host architecture ${value}.`);
}
