export interface ISkillManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: readonly string[];
  source: 'bundled' | 'workspace' | 'user';
}
