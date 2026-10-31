import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { relative, resolve, basename, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const ROOT = process.cwd();
const isEntryPoint = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

const TYPE_ONLY_KINDS = new Set(['interface', 'type']);

/**
 * File stem for an exported symbol. Classes, types and constants use PascalCase
 * (`shellConfig` and `SHELL_CONFIG` both give `ShellConfig`); a module whose single export is a
 * function keeps the function's own lowercase-first name so functions and classes stay
 * distinguishable from the file name alone.
 */
export function fileStemFor(symbol, kind) {
  if (kind === 'function') return symbol;
  if (/^[A-Z0-9_]+$/.test(symbol))
    return symbol
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join('');
  return symbol.charAt(0).toUpperCase() + symbol.slice(1);
}

function declarationInfo(statement) {
  if (ts.isInterfaceDeclaration(statement)) return { kind: 'interface', name: statement.name.text };
  if (ts.isTypeAliasDeclaration(statement)) return { kind: 'type', name: statement.name.text };
  if (ts.isClassDeclaration(statement) && statement.name)
    return { kind: 'class', name: statement.name.text };
  if (ts.isEnumDeclaration(statement)) return { kind: 'enum', name: statement.name.text };
  if (ts.isFunctionDeclaration(statement) && statement.name)
    return { kind: 'function', name: statement.name.text };
  if (ts.isVariableStatement(statement)) {
    const declarations = statement.declarationList.declarations;
    if (declarations.length === 1 && ts.isIdentifier(declarations[0].name))
      return { kind: 'const', name: declarations[0].name.text };
  }
  return null;
}

const isExported = (statement) =>
  (ts.getModifiers(statement) ?? []).some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );

function isReferencePosition(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isQualifiedName(parent) && parent.right === node) return false;
  if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent))
    return false;
  if (
    (ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isEnumMember(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isParameter(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent)) &&
    parent.name === node
  )
    return false;
  return true;
}

function referencedIdentifiers(statement, ownName) {
  const found = new Set();
  const visit = (node) => {
    if (ts.isIdentifier(node) && isReferencePosition(node) && node.text !== ownName)
      found.add(node.text);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(statement, visit);
  return found;
}

/** Text of the statement including its attached leading comments, without leading blank lines. */
function statementText(statement, sourceText, bodyStart) {
  const raw = sourceText.slice(Math.max(statement.getFullStart(), bodyStart), statement.getEnd());
  return raw.replace(/^[\r\n]+/, '').replace(/^\s*\n/, '');
}

export function analyseModule(filePath) {
  const sourceText = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ES2023,
    true,
    ts.ScriptKind.TS,
  );

  const pathCommentMatch = /^\/\/ \S+\.ts\r?\n/.exec(sourceText);
  const bodyStart = pathCommentMatch ? pathCommentMatch[0].length : 0;

  const imports = [];
  const units = [];
  const passthrough = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      const entry = {
        specifier,
        typeOnly: Boolean(clause?.isTypeOnly),
        named: [],
        defaultName: null,
        namespace: null,
      };
      if (clause?.name) entry.defaultName = clause.name.text;
      if (clause?.namedBindings) {
        if (ts.isNamespaceImport(clause.namedBindings))
          entry.namespace = clause.namedBindings.name.text;
        else
          for (const element of clause.namedBindings.elements)
            entry.named.push({
              local: element.name.text,
              imported: element.propertyName?.text ?? element.name.text,
              typeOnly: Boolean(element.isTypeOnly),
            });
      }
      imports.push(entry);
      continue;
    }
    if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) {
      passthrough.push({ text: statementText(statement, sourceText, bodyStart), reexport: true });
      continue;
    }
    const info = declarationInfo(statement);
    if (!info) {
      passthrough.push({
        text: statementText(statement, sourceText, bodyStart),
        unsupported: true,
        statement,
      });
      continue;
    }
    units.push({
      ...info,
      exported: isExported(statement),
      text: statementText(statement, sourceText, bodyStart),
      references: referencedIdentifiers(statement, info.name),
    });
  }

  return { sourceFile, sourceText, imports, units, passthrough };
}

/** Stable topological order for declarations that reference one another. */
function orderByDependency(units) {
  const byName = new Map(units.map((unit) => [unit.name, unit]));
  const ordered = [];
  const visited = new Set();
  const visit = (unit) => {
    if (visited.has(unit.name)) return;
    visited.add(unit.name);
    for (const reference of unit.references) {
      const dependency = byName.get(reference);
      if (dependency && dependency !== unit) visit(dependency);
    }
    ordered.push(unit);
  };
  for (const unit of units) visit(unit);
  return ordered;
}

function importedNameOwners(imports) {
  const owners = new Map();
  for (const entry of imports) {
    if (entry.defaultName) owners.set(entry.defaultName, { entry, mode: 'default' });
    if (entry.namespace) owners.set(entry.namespace, { entry, mode: 'namespace' });
    for (const named of entry.named) owners.set(named.local, { entry, mode: 'named', named });
  }
  return owners;
}

/** Rewrites a relative specifier so it still resolves from the emitted file's directory. */
export function rebaseSpecifier(specifier, fromDirectory, toDirectory) {
  if (!specifier.startsWith('.') || fromDirectory === toDirectory) return specifier;
  const target = resolve(fromDirectory, specifier);
  let rebased = relative(toDirectory, target).split('\\').join('/');
  if (!rebased.startsWith('.')) rebased = `./${rebased}`;
  return rebased;
}

function renderImports(neededExternal, neededSiblings, unitKinds) {
  const lines = [];
  for (const [specifier, group] of neededExternal) {
    if (group.namespace) {
      lines.push(`import * as ${group.namespace} from '${specifier}';`);
      continue;
    }
    const parts = [];
    if (group.defaultName) parts.push(group.defaultName);
    const named = [...group.named].sort((left, right) => left.local.localeCompare(right.local));
    const namedText = named
      .map((item) => {
        const prefix = !group.typeOnly && item.typeOnly ? 'type ' : '';
        return item.imported === item.local
          ? `${prefix}${item.local}`
          : `${prefix}${item.imported} as ${item.local}`;
      })
      .join(', ');
    if (namedText) parts.push(`{ ${namedText} }`);
    if (parts.length === 0) continue;
    lines.push(`import ${group.typeOnly ? 'type ' : ''}${parts.join(', ')} from '${specifier}';`);
  }
  for (const sibling of [...neededSiblings].sort()) {
    const typeOnly = TYPE_ONLY_KINDS.has(unitKinds.get(sibling));
    lines.push(
      `import ${typeOnly ? 'type ' : ''}{ ${sibling} } from './${fileStemFor(sibling, unitKinds.get(sibling))}';`,
    );
  }
  return lines;
}

export function planSplit(filePath, options = {}) {
  const analysis = analyseModule(filePath);
  const { imports, units, passthrough } = analysis;
  const unsupported = passthrough.filter((entry) => entry.unsupported);

  const exportedUnits = units.filter((unit) => unit.exported);
  const internalUnits = units.filter((unit) => !unit.exported);
  if (exportedUnits.length <= 1)
    return { filePath, skipped: 'not a multi-export module', files: [] };

  const owners = importedNameOwners(imports);
  const unitByName = new Map(units.map((unit) => [unit.name, unit]));
  const unitKinds = new Map(units.map((unit) => [unit.name, unit.kind]));

  // An internal helper used by exactly one exported unit travels with it; otherwise it becomes
  // its own internal module (internal exports are exempt from the one-public-export rule).
  const internalConsumers = new Map(internalUnits.map((unit) => [unit.name, new Set()]));
  const consumersOf = (name) => internalConsumers.get(name);
  for (const unit of units) {
    for (const reference of unit.references) {
      if (internalConsumers.has(reference) && reference !== unit.name)
        consumersOf(reference).add(unit.name);
    }
  }
  const inlined = new Map(); // internal unit name -> owning exported unit name
  const promoted = new Set(); // internal unit names that get their own file
  for (const unit of internalUnits) {
    const consumers = [...consumersOf(unit.name)];
    const exportedConsumers = consumers.filter((name) => unitByName.get(name)?.exported);
    if (consumers.length === 1 && exportedConsumers.length === 1)
      inlined.set(unit.name, exportedConsumers[0]);
    else promoted.add(unit.name);
  }
  // An internal helper that another promoted helper needs must itself be promoted.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, owner] of [...inlined]) {
      if (promoted.has(owner) || !unitByName.get(owner)?.exported) {
        inlined.delete(name);
        promoted.add(name);
        changed = true;
      }
    }
  }

  const directory = options.outputDirectory ?? join(dirname(filePath), basename(filePath, '.ts'));
  const emitted = [];

  const buildFile = (primary, attachedInternals) => {
    // Internal helpers are dependencies of the exported declaration, so they must be emitted
    // first: a `const` referenced before its declaration is a temporal-dead-zone error.
    const bodyUnits = [...orderByDependency(attachedInternals), primary];
    const combinedReferences = new Set();
    for (const unit of bodyUnits)
      for (const reference of unit.references) combinedReferences.add(reference);
    const localNames = new Set(bodyUnits.map((unit) => unit.name));

    const externalGroups = new Map();
    const siblings = new Set();
    for (const reference of combinedReferences) {
      if (localNames.has(reference)) continue;
      if (owners.has(reference)) {
        const owner = owners.get(reference);
        const specifier = owner.entry.specifier;
        if (!externalGroups.has(specifier))
          externalGroups.set(specifier, {
            typeOnly: owner.entry.typeOnly,
            named: [],
            defaultName: null,
            namespace: null,
          });
        const group = externalGroups.get(specifier);
        if (owner.mode === 'default') group.defaultName = reference;
        else if (owner.mode === 'namespace') group.namespace = reference;
        else group.named.push(owner.named);
        continue;
      }
      if (unitByName.has(reference)) siblings.add(reference);
    }

    const bodyText = bodyUnits.map((unit) => (unit.exported ? unit.text : unit.text)).join('\n\n');
    // Only keep an import the emitted body actually mentions.
    const mentions = (name) => new RegExp(`\\b${name.replace(/[$]/g, '\\$')}\\b`).test(bodyText);
    for (const [specifier, group] of externalGroups) {
      group.named = group.named.filter((item) => mentions(item.local));
      if (group.defaultName && !mentions(group.defaultName)) group.defaultName = null;
      if (group.namespace && !mentions(group.namespace)) group.namespace = null;
      if (!group.defaultName && !group.namespace && group.named.length === 0)
        externalGroups.delete(specifier);
    }
    for (const sibling of [...siblings]) if (!mentions(sibling)) siblings.delete(sibling);

    const targetPath = join(directory, `${fileStemFor(primary.name, primary.kind)}.ts`);
    const rebasedGroups = new Map(
      [...externalGroups].map(([specifier, group]) => [
        rebaseSpecifier(specifier, dirname(filePath), directory),
        group,
      ]),
    );
    const importLines = renderImports(rebasedGroups, siblings, unitKinds);
    const header = [`// ${relative(ROOT, targetPath)}`];
    if (importLines.length > 0)
      header.push('', '// #region Imports', '', ...importLines, '', '// #endregion');
    return {
      path: targetPath,
      contents: `${[...header, '', bodyText].join('\n').replace(/\n{3,}/g, '\n\n')}\n`,
    };
  };

  for (const unit of exportedUnits) {
    const attached = internalUnits.filter((internal) => inlined.get(internal.name) === unit.name);
    emitted.push(buildFile(unit, attached));
  }
  for (const name of promoted) {
    const unit = internalUnits.find((candidate) => candidate.name === name);
    emitted.push(
      buildFile(
        { ...unit, text: `export ${unit.text.replace(/^(\/\*[\s\S]*?\*\/\s*)?/, (m) => m)}` },
        [],
      ),
    );
  }

  const exportsByName = Object.fromEntries(
    exportedUnits.map((unit) => [
      unit.name,
      join(directory, `${fileStemFor(unit.name, unit.kind)}.ts`),
    ]),
  );

  if (options.emitBarrel === false)
    return {
      filePath,
      directory,
      files: emitted,
      exports: exportsByName,
      unsupported,
      promoted: [...promoted],
      inlined: [...inlined.keys()],
    };

  const barrelPath = join(directory, 'index.ts');
  const barrelNames = [...exportedUnits]
    .sort((left, right) =>
      fileStemFor(left.name, left.kind).localeCompare(fileStemFor(right.name, right.kind)),
    )
    .map((unit) => unit.name);

  const stems = new Map();
  for (const unit of [...exportedUnits, ...[...promoted].map((name) => unitByName.get(name))]) {
    const stem = fileStemFor(unit.name, unit.kind);
    if (stems.has(stem))
      throw new Error(
        `File name collision in ${filePath}: ${stems.get(stem)} and ${unit.name} both map to ${stem}.ts`,
      );
    stems.set(stem, unit.name);
  }
  // Re-export statements belong to the module's public surface and move to the barrel.
  const carriedReexports = passthrough
    .filter((entry) => entry.reexport)
    .map((entry) => entry.text.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '').trim())
    .map((text) =>
      text.replace(
        /from '(\.[^']*)'/,
        (_, specifier) => `from '${rebaseSpecifier(specifier, dirname(filePath), directory)}'`,
      ),
    );
  const barrelContents = `// ${relative(ROOT, barrelPath)}\n\n${[
    ...barrelNames.map((name) => `export * from './${fileStemFor(name, unitKinds.get(name))}';`),
    ...carriedReexports,
  ].join('\n')}\n`;
  emitted.push({ path: barrelPath, contents: barrelContents });

  return {
    filePath,
    directory,
    files: emitted,
    unsupported,
    promoted: [...promoted],
    inlined: [...inlined.keys()],
  };
}

// --- CLI -------------------------------------------------------------------
const cliArguments = process.argv.slice(2);
if (isEntryPoint && cliArguments.length > 0) {
  const apply = cliArguments.includes('--apply');
  const targets = cliArguments.filter((argument) => !argument.startsWith('--'));
  for (const target of targets) {
    const filePath = resolve(ROOT, target);
    const plan = planSplit(filePath);
    if (plan.skipped) {
      process.stdout.write(`skip ${target}: ${plan.skipped}\n`);
      continue;
    }
    process.stdout.write(
      `${apply ? 'split' : 'plan '} ${relative(ROOT, filePath)} -> ${plan.files.length} files in ${relative(ROOT, plan.directory)}/\n`,
    );
    if (plan.unsupported.length > 0)
      process.stdout.write(
        `  WARNING ${plan.unsupported.length} unsupported top-level statement(s) - not emitted\n`,
      );
    if (plan.promoted.length > 0)
      process.stdout.write(`  internal modules: ${plan.promoted.join(', ')}\n`);
    if (apply) {
      if (plan.unsupported.length > 0) {
        process.stdout.write('  ABORT: refusing to split a module with unsupported statements\n');
        process.exitCode = 1;
        continue;
      }
      mkdirSync(plan.directory, { recursive: true });
      for (const file of plan.files) writeFileSync(file.path, file.contents, 'utf8');
      const emittedHere = plan.files.some(
        (file) => file.path.toLowerCase() === filePath.toLowerCase(),
      );
      if (existsSync(filePath) && !emittedHere) rmSync(filePath);
    }
  }
}
