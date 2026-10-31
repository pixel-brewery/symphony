// #region Imports

import { builtinSkills, builtinSkillPackage } from '@symphony/domain-skills';
import type {
  IEditableSkillPackage,
  ISkillManifest,
  ISkillPackageCatalog,
  ISkillPackageDocument,
  SkillFlowRole,
} from '@symphony/domain-skills';
import type { ProcessRole } from '@symphony/domain-workflow';
import type { IBuiltinSkillConfiguration } from './IBuiltinSkillConfiguration';
import type { ISkillCatalogDependencies } from './ISkillCatalogDependencies';

// #endregion

/**
 * Resolves workspace role assignments and owns package/customization use cases.
 *
 * @public
 */
export class SkillCatalogService {
  // #region Ctor

  public constructor(private readonly _dependencies: ISkillCatalogDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Lists the packages visible from the addressed workspace.
   *
   * @public
   */
  public list(workspaceId?: string): ISkillPackageCatalog {
    return this._dependencies.packages.list(this._dependencies.repositorySkillRoot(workspaceId));
  }

  /**
   * Loads one package using the addressed workspace's repository scope.
   *
   * @public
   */
  public get(id: string, workspaceId?: string): ISkillPackageDocument {
    return this._dependencies.packages.get(id, this._dependencies.repositorySkillRoot(workspaceId));
  }

  /**
   * Saves a shared package through its owning provider.
   *
   * @public
   */
  public save(input: IEditableSkillPackage): ISkillPackageDocument {
    return this._dependencies.packages.save(input);
  }

  /**
   * Validates an embedded package before a workspace import changes settings.
   *
   * @public
   */
  public validate(input: IEditableSkillPackage): void {
    this._dependencies.packages.validate(input);
  }

  /**
   * Imports a portable package into the shared catalog.
   *
   * @public
   */
  public import(sourcePath: string): ISkillPackageDocument {
    return this._dependencies.packages.import(sourcePath);
  }

  /**
   * Exports an existing package through its owning provider.
   *
   * @public
   */
  public export(id: string, destinationRoot: string): { path: string; message: string } {
    return this._dependencies.packages.export(id, destinationRoot);
  }

  /**
   * Removes a shared package through the provider's recoverable deletion.
   *
   * @public
   */
  public delete(name: string): { message: string } {
    return this._dependencies.packages.delete(name);
  }

  /**
   * Reads only user packages for workspace transfer without repository or legacy packages.
   *
   * @public
   */
  public sharedPackages(): readonly ISkillPackageDocument[] {
    return this._dependencies.packages
      .list()
      .packages.filter((skill) => skill.source === 'user')
      .map((skill) => this._dependencies.packages.get(skill.id));
  }

  /**
   * Projects the active workspace packages into the existing manifest contract.
   *
   * @public
   */
  public skills(workspaceId?: string): readonly ISkillManifest[] {
    return this.activePackages(workspaceId).map((skill) => this.toManifest(skill, workspaceId));
  }

  /**
   * Resolves an explicit package or the shipped role when no package is assigned.
   *
   * @public
   */
  public skill(role: SkillFlowRole, workspaceId?: string): ISkillPackageDocument | undefined {
    const skillId = this._dependencies
      .assignmentsFor(workspaceId)
      .find((assignment) => assignment.role === role)?.skillId;
    return skillId
      ? this.activePackages(workspaceId).find((skill) => skill.id === skillId)
      : builtinSkillPackage(
          role,
          this._dependencies.customizations(),
          this._dependencies.clock.now(),
          this._dependencies.digest,
        );
  }

  /**
   * Resolves the analysis package consumed by execution and Work metadata.
   *
   * @public
   */
  public analysisSkill(workspaceId?: string): ISkillPackageDocument | undefined {
    return this.skill('analysis', workspaceId);
  }

  /**
   * Resolves the implementation package consumed by execution and Work metadata.
   *
   * @public
   */
  public solutionSkill(workspaceId?: string): ISkillPackageDocument | undefined {
    return this.skill('solution', workspaceId);
  }

  /**
   * Resolves the Work Item Creator package.
   *
   * @public
   */
  public issueCreatorSkill(workspaceId?: string): ISkillPackageDocument | undefined {
    return this.skill('work-item-creation', workspaceId);
  }

  /**
   * Lists shipped role instructions beside their separately editable additions.
   *
   * @public
   */
  public builtins(): readonly IBuiltinSkillConfiguration[] {
    return builtinSkills.map((skill) => ({
      role: skill.role,
      displayName: skill.displayName,
      description: skill.description,
      version: skill.version,
      promptVersion: skill.promptVersion,
      instructions: skill.instructions,
      mutatesWorkspace: skill.mutatesWorkspace,
      publishesPullRequest: skill.publishesPullRequest,
      additionalInstructions:
        this._dependencies.customizations().find((entry) => entry.role === skill.role)
          ?.additionalInstructions ?? '',
    }));
  }

  /**
   * Persists the trimmed role addition, removing an empty customization.
   *
   * @public
   */
  public customizeBuiltin(role: ProcessRole, instructions: string): void {
    const additionalInstructions = instructions.trim();
    const remaining = this._dependencies.customizations().filter((entry) => entry.role !== role);
    this._dependencies.saveCustomizations(
      additionalInstructions ? [...remaining, { role, additionalInstructions }] : remaining,
    );
  }

  private activePackages(workspaceId?: string): readonly ISkillPackageDocument[] {
    const activeIds = new Set(
      this._dependencies
        .assignmentsFor(workspaceId)
        .flatMap((assignment) => (assignment.skillId ? [assignment.skillId] : [])),
    );
    const packages = this._dependencies.packages
      .list(this._dependencies.repositorySkillRoot(workspaceId))
      .packages.filter((skill) => activeIds.has(skill.id))
      .flatMap((skill) => {
        try {
          return [
            this._dependencies.packages.get(
              skill.id,
              this._dependencies.repositorySkillRoot(workspaceId),
            ),
          ];
        } catch {
          return [];
        }
      });
    return [
      ...packages,
      ...this._dependencies
        .assignmentsFor(workspaceId)
        .filter((assignment) => !assignment.skillId)
        .map((assignment) =>
          builtinSkillPackage(
            assignment.role,
            this._dependencies.customizations(),
            this._dependencies.clock.now(),
            this._dependencies.digest,
          ),
        ),
    ];
  }

  private toManifest(skill: ISkillPackageDocument, workspaceId?: string): ISkillManifest {
    const capabilities = this._dependencies
      .assignmentsFor(workspaceId)
      .filter((assignment) => (assignment.skillId ?? `bundled:${assignment.role}`) === skill.id)
      .map((assignment) => assignment.role);
    return {
      id: skill.id,
      name: skill.name,
      version: skill.digest.slice(0, 12),
      description: skill.description,
      capabilities: capabilities.length ? capabilities : ['general'],
      source:
        skill.source === 'bundled'
          ? 'bundled'
          : skill.source === 'repository'
            ? 'workspace'
            : 'user',
    };
  }

  // #endregion
}
