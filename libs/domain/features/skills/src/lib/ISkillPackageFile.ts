export interface ISkillPackageFile {
  path: string;
  kind: 'metadata' | 'script' | 'reference' | 'asset';
  encoding: 'utf8' | 'base64';
  content: string;
  size: number;
}
