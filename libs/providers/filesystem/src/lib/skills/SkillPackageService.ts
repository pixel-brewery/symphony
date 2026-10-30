// #region Imports

import type { ISkillPackagePort } from '@symphony/application-skills';
import { createHash, randomUUID } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { parse } from 'yaml';
import type {
  IEditableSkillPackage,
  ISkillPackageCatalog,
  ISkillPackageDocument,
  ISkillPackageFile,
  SkillPackageSource,
  ISkillPackageSummary,
} from '@symphony/domain-skills';

// #endregion

const SKILL_NAME = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const MAX_FILE_COUNT = 250;
const MAX_PACKAGE_BYTES = 8 * 1024 * 1024;
const RESOURCE_ROOTS = ['scripts', 'references', 'assets'] as const;

interface IFrontmatter {
  name?: unknown;
  description?: unknown;
  [key: string]: unknown;
}

interface IPackageLocation {
  source: SkillPackageSource;
  directory: string;
  editable: boolean;
}

export class SkillPackageService implements ISkillPackagePort {
  // #region Ctor

  public constructor(
    private readonly _sharedRoot: string = join(homedir(), '.agents', 'skills'),
    private readonly _legacyRoot: string = join(homedir(), '.codex', 'skills'),
  ) {}

  // #endregion

  // #region Methods

  /**
   * Lists.
   *
   * @param repositoryRoot - Repository root.
   * @public
   */
  public list(repositoryRoot?: string): ISkillPackageCatalog {
    mkdirSync(this._sharedRoot, { recursive: true });
    const locations = [
      ...this.scanRoot(this._sharedRoot, 'user', true),
      ...(repositoryRoot ? this.scanRoot(repositoryRoot, 'repository', false) : []),
      ...this.scanRoot(this._legacyRoot, 'legacy', false),
    ];
    const packages = locations
      .map((location) => this.tryReadSummary(location))
      .filter((item): item is ISkillPackageSummary => item !== undefined)
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
    return { sharedRoot: this._sharedRoot, repositoryRoot, packages };
  }

  /**
   * Returns the get.
   *
   * @param id - Id.
   * @param repositoryRoot - Repository root.
   * @public
   */
  public get(id: string, repositoryRoot?: string): ISkillPackageDocument {
    return this.readDocument(this.resolveLocation(id, repositoryRoot));
  }

  /**
   * Saves.
   *
   * @param input - Input.
   * @public
   */
  public save(input: IEditableSkillPackage): ISkillPackageDocument {
    this.validateName(input.name);
    if (!input.description.trim()) throw new Error('Skill description is required.');
    if (!input.instructions.trim()) throw new Error('Skill instructions are required.');
    if (input.originalName) this.validateName(input.originalName);

    mkdirSync(this._sharedRoot, { recursive: true });
    const target = join(this._sharedRoot, input.name);
    if (input.originalName && input.originalName !== input.name && existsSync(target)) {
      throw new Error(`A shared skill named "${input.name}" already exists.`);
    }

    const staging = join(this._sharedRoot, `.staging-${randomUUID()}`);
    mkdirSync(staging, { recursive: false });
    try {
      this.writeDocument(staging, input);
      this.replaceDirectory(staging, target);
      if (input.originalName && input.originalName !== input.name) {
        this.moveToTrash(join(this._sharedRoot, input.originalName));
      }
    } catch (cause) {
      rmSync(staging, { force: true, recursive: true });
      throw cause;
    }
    return this.readDocument({ source: 'user', directory: target, editable: true });
  }

  /**
   * Validates.
   *
   * @param input - Input.
   * @public
   */
  public validate(input: IEditableSkillPackage): void {
    this.validateName(input.name);
    if (!input.description.trim()) throw new Error('Skill description is required.');
    if (!input.instructions.trim()) throw new Error('Skill instructions are required.');
    mkdirSync(this._sharedRoot, { recursive: true });
    const staging = join(this._sharedRoot, `.validation-${randomUUID()}`);
    mkdirSync(staging, { recursive: false });
    try {
      this.writeDocument(staging, input);
      this.readDocument({ source: 'user', directory: staging, editable: true });
    } finally {
      rmSync(staging, { force: true, recursive: true });
    }
  }

  /**
   * Imports.
   *
   * @param sourcePath - Source path.
   * @public
   */
  public import(sourcePath: string): ISkillPackageDocument {
    const expanded = this.expandPath(sourcePath);
    const sourceDirectory = statSync(expanded).isDirectory() ? expanded : dirname(expanded);
    const imported = this.readDocument({
      source: 'repository',
      directory: sourceDirectory,
      editable: false,
    });
    if (existsSync(join(this._sharedRoot, imported.name))) {
      throw new Error(
        `A shared skill named "${imported.name}" already exists. Open it and update it instead.`,
      );
    }
    return this.save({
      name: imported.name,
      description: imported.description,
      instructions: imported.instructions,
      openaiYaml: imported.openaiYaml,
      files: imported.files,
    });
  }

  /**
   * Exports.
   *
   * @param id - Id.
   * @param destinationRoot - Destination root.
   * @public
   */
  public export(id: string, destinationRoot: string): { path: string; message: string } {
    const source = this.resolveLocation(id);
    const root = this.expandPath(destinationRoot);
    mkdirSync(root, { recursive: true });
    const target = join(root, basename(source.directory));
    if (existsSync(target)) throw new Error(`Export target already exists: ${target}`);
    cpSync(source.directory, target, { errorOnExist: true, recursive: true });
    return { path: target, message: 'Portable OpenAI skill folder exported.' };
  }

  /**
   * Deletes.
   *
   * @param name - Name.
   * @public
   */
  public delete(name: string): { message: string } {
    this.validateName(name);
    const directory = join(this._sharedRoot, name);
    if (!existsSync(directory)) throw new Error(`Shared skill "${name}" does not exist.`);
    const trashed = this.moveToTrash(directory);
    return { message: `Skill moved to the recoverable trash folder: ${trashed}` };
  }

  private scanRoot(
    root: string,
    source: SkillPackageSource,
    editable: boolean,
  ): IPackageLocation[] {
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => ({ source, directory: join(root, entry.name), editable }))
      .filter((location) => existsSync(join(location.directory, 'SKILL.md')));
  }

  private tryReadSummary(location: IPackageLocation): ISkillPackageSummary | undefined {
    try {
      const document = this.readDocument(location);
      return {
        id: document.id,
        name: document.name,
        displayName: document.displayName,
        description: document.description,
        source: document.source,
        location: document.location,
        editable: document.editable,
        implicitInvocation: document.implicitInvocation,
        updatedAt: document.updatedAt,
        digest: document.digest,
        resourceCount: document.files.length,
        warnings: document.warnings,
      };
    } catch {
      return undefined;
    }
  }

  private readDocument(location: IPackageLocation): ISkillPackageDocument {
    const skillPath = join(location.directory, 'SKILL.md');
    if (!existsSync(skillPath)) throw new Error(`No SKILL.md found in ${location.directory}.`);
    const raw = readFileSync(skillPath, 'utf8');
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
    if (!match) throw new Error(`SKILL.md in ${location.directory} has no YAML frontmatter.`);
    const frontmatter = parse(match[1] ?? '') as IFrontmatter;
    const name = typeof frontmatter.name === 'string' ? frontmatter.name : '';
    const description = typeof frontmatter.description === 'string' ? frontmatter.description : '';
    this.validateName(name);
    if (!description.trim()) throw new Error(`Skill "${name}" has no description.`);

    const warnings: string[] = [];
    const extraKeys = Object.keys(frontmatter).filter(
      (key) => key !== 'name' && key !== 'description',
    );
    if (extraKeys.length) warnings.push(`Unsupported SKILL.md fields: ${extraKeys.join(', ')}`);
    if (basename(location.directory) !== name) {
      warnings.push(`Folder name should match the skill name "${name}".`);
    }
    const openaiPath = join(location.directory, 'agents', 'openai.yaml');
    const openaiYaml = existsSync(openaiPath) ? readFileSync(openaiPath, 'utf8') : '';
    const files = this.readResources(location.directory);
    const stat = statSync(skillPath);
    const digest = this.digest(raw, openaiYaml, files);
    const metadata = this.openaiMetadata(openaiYaml);

    return {
      id: `${location.source}:${name}`,
      name,
      displayName: metadata.displayName ?? name,
      description,
      source: location.source,
      location: location.directory,
      editable: location.editable,
      implicitInvocation: metadata.implicitInvocation,
      updatedAt: stat.mtime.toISOString(),
      digest,
      resourceCount: files.length,
      warnings,
      instructions: (match[2] ?? '').trim(),
      openaiYaml,
      files,
    };
  }

  private readResources(directory: string): ISkillPackageFile[] {
    const files: ISkillPackageFile[] = [];
    let totalBytes = 0;
    for (const resourceRoot of RESOURCE_ROOTS) {
      const root = join(directory, resourceRoot);
      if (!existsSync(root)) continue;
      const visit = (current: string): void => {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
          const absolute = join(current, entry.name);
          if (entry.isSymbolicLink())
            throw new Error(`Symbolic resource links are not supported: ${absolute}`);
          if (entry.isDirectory()) {
            visit(absolute);
            continue;
          }
          if (!entry.isFile()) continue;
          const buffer = readFileSync(absolute);
          totalBytes += buffer.byteLength;
          if (files.length >= MAX_FILE_COUNT || totalBytes > MAX_PACKAGE_BYTES) {
            throw new Error('Skill resources exceed the local safety limit.');
          }
          const decoded = buffer.toString('utf8');
          const isUtf8 = !decoded.includes('\u0000') && Buffer.from(decoded).equals(buffer);
          files.push({
            path: relative(directory, absolute).split(sep).join('/'),
            kind:
              resourceRoot === 'scripts'
                ? 'script'
                : resourceRoot === 'references'
                  ? 'reference'
                  : 'asset',
            encoding: isUtf8 ? 'utf8' : 'base64',
            content: isUtf8 ? decoded : buffer.toString('base64'),
            size: buffer.byteLength,
          });
        }
      };
      visit(root);
    }
    return files.sort((left, right) => left.path.localeCompare(right.path));
  }

  private writeDocument(directory: string, input: IEditableSkillPackage): void {
    const instructions = input.instructions.trim();
    const skillMarkdown = `---\nname: ${input.name}\ndescription: ${JSON.stringify(input.description.trim())}\n---\n\n${instructions}\n`;
    writeFileSync(join(directory, 'SKILL.md'), skillMarkdown, 'utf8');
    if (input.openaiYaml.trim()) {
      parse(input.openaiYaml);
      mkdirSync(join(directory, 'agents'), { recursive: true });
      writeFileSync(
        join(directory, 'agents', 'openai.yaml'),
        `${input.openaiYaml.trim()}\n`,
        'utf8',
      );
    }

    let totalBytes = 0;
    if (input.files.length > MAX_FILE_COUNT)
      throw new Error('A skill can contain at most 250 resources.');
    for (const file of input.files) {
      this.validateResource(file);
      const buffer = Buffer.from(file.content, file.encoding === 'base64' ? 'base64' : 'utf8');
      totalBytes += buffer.byteLength;
      if (totalBytes > MAX_PACKAGE_BYTES) throw new Error('Skill resources exceed 8 MB.');
      const target = this.safeResourcePath(directory, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, buffer);
    }
  }

  private validateResource(file: ISkillPackageFile): void {
    if (file.kind === 'metadata') throw new Error('Metadata files are managed separately.');
    const normalized = normalize(file.path).split(sep).join('/');
    if (normalized.startsWith('../') || isAbsolute(file.path)) {
      throw new Error(`Resource path escapes the skill folder: ${file.path}`);
    }
    const expectedRoot =
      file.kind === 'script' ? 'scripts/' : file.kind === 'reference' ? 'references/' : 'assets/';
    if (!normalized.startsWith(expectedRoot) || normalized.endsWith('/')) {
      throw new Error(`Resource path does not match its kind: ${file.path}`);
    }
  }

  private safeResourcePath(directory: string, path: string): string {
    const target = resolve(directory, path);
    const prefix = `${resolve(directory)}${sep}`;
    if (!target.startsWith(prefix)) throw new Error(`Unsafe resource path: ${path}`);
    return target;
  }

  private resolveLocation(id: string, repositoryRoot?: string): IPackageLocation {
    const separator = id.indexOf(':');
    if (separator < 1) throw new Error('Invalid skill identifier.');
    const source = id.slice(0, separator) as SkillPackageSource;
    const name = id.slice(separator + 1);
    this.validateName(name);
    if (source === 'user') {
      return { source, directory: join(this._sharedRoot, name), editable: true };
    }
    if (source === 'legacy') {
      return { source, directory: join(this._legacyRoot, name), editable: false };
    }
    if (source === 'repository' && repositoryRoot) {
      return { source, directory: join(repositoryRoot, name), editable: false };
    }
    throw new Error(`Skill source is not available: ${source}`);
  }

  private replaceDirectory(staging: string, target: string): void {
    if (!existsSync(target)) {
      renameSync(staging, target);
      return;
    }
    const backup = `${target}.backup-${randomUUID()}`;
    renameSync(target, backup);
    try {
      renameSync(staging, target);
      rmSync(backup, { force: true, recursive: true });
    } catch (cause) {
      if (existsSync(target)) rmSync(target, { force: true, recursive: true });
      renameSync(backup, target);
      throw cause;
    }
  }

  private moveToTrash(directory: string): string {
    const trash = join(this._sharedRoot, '.trash');
    mkdirSync(trash, { recursive: true });
    const target = join(
      trash,
      `${basename(directory)}-${new Date().toISOString().replaceAll(':', '-')}`,
    );
    renameSync(directory, target);
    return target;
  }

  private validateName(name: string): void {
    if (!SKILL_NAME.test(name)) {
      throw new Error('Skill names use 1–64 lowercase letters, digits and hyphens.');
    }
  }

  private expandPath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) throw new Error('A folder path is required.');
    return resolve(
      trimmed === '~'
        ? homedir()
        : trimmed.startsWith('~/')
          ? join(homedir(), trimmed.slice(2))
          : trimmed,
    );
  }

  private openaiMetadata(openaiYaml: string): {
    displayName?: string;
    implicitInvocation: boolean;
  } {
    if (!openaiYaml.trim()) return { implicitInvocation: true };
    try {
      const metadata = parse(openaiYaml) as {
        interface?: { display_name?: unknown };
        policy?: { allow_implicit_invocation?: unknown };
      };
      return {
        displayName:
          typeof metadata.interface?.display_name === 'string'
            ? metadata.interface.display_name
            : undefined,
        implicitInvocation: metadata.policy?.allow_implicit_invocation !== false,
      };
    } catch {
      return { implicitInvocation: true };
    }
  }

  private digest(
    skillMarkdown: string,
    openaiYaml: string,
    files: readonly ISkillPackageFile[],
  ): string {
    const hash = createHash('sha256').update(skillMarkdown).update('\u0000').update(openaiYaml);
    for (const file of files)
      hash.update('\u0000').update(file.path).update('\u0000').update(file.content);
    return hash.digest('hex');
  }

  // #endregion
}
