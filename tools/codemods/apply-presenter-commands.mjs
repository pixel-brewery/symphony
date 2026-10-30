import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');
const SOURCE_ROOTS = ['apps', 'libs'];
const EXEMPT_METHODS = new Set([
  'constructor',
  'dispose',
  'hydrate',
  'initialize',
  'onClose',
  'onHydrate',
  'onHydrationError',
  'setCanClose',
]);
const ACTION_OVERRIDES = new Set();

function collectFiles(directory, accumulator) {
  for (const entry of readdirSync(directory)) {
    if (['dist', 'node_modules', '.nx'].includes(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) collectFiles(absolute, accumulator);
    else accumulator.push(absolute);
  }
  return accumulator;
}

function pascalCase(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function actionParameterType(method, sourceFile) {
  if (method.parameters.length === 0) return 'void';
  if (method.parameters.length === 1) {
    const parameter = method.parameters[0];
    const type = parameter.type?.getText(sourceFile) ?? 'unknown';
    return parameter.questionToken || parameter.initializer ? `${type} | undefined` : type;
  }
  const elements = method.parameters.map((parameter) => {
    const name = parameter.name.getText(sourceFile);
    const type = parameter.type?.getText(sourceFile) ?? 'unknown';
    const optional = parameter.questionToken || parameter.initializer ? '?' : '';
    return `${name}${optional}: ${type}`;
  });
  return `readonly [${elements.join(', ')}]`;
}

function actionField(metadata) {
  const { method, sourceFile, commandName, privateName } = metadata;
  const type = actionParameterType(method, sourceFile);
  let execute;
  if (method.parameters.length === 0) {
    execute = `() => void this.${privateName}()`;
  } else if (method.parameters.length === 1) {
    const parameter = method.parameters[0].name.getText(sourceFile);
    execute = `(${parameter}) => void this.${privateName}(${parameter})`;
  } else {
    execute = `(parameters) => void this.${privateName}(...parameters)`;
  }
  return [
    `  private readonly _${commandName}: Command<${type}> = new Command(${execute});`,
    '',
  ].join('\n');
}

function queryField(metadata) {
  const { method, sourceFile, name, privateName } = metadata;
  if (method.parameters.length === 0) {
    return `  private readonly _${name} = computed(() => this.${privateName}());\n\n`;
  }
  const parameters = method.parameters.map((parameter) => parameter.getText(sourceFile)).join(', ');
  const arguments_ = method.parameters
    .map((parameter) => parameter.name.getText(sourceFile))
    .join(', ');
  return `  private readonly _${name} = computed(() => (${parameters}) => this.${privateName}(${arguments_}));\n\n`;
}

function commandGetter(metadata) {
  const { commandName, method, sourceFile } = metadata;
  const type = actionParameterType(method, sourceFile);
  return [
    '  /**',
    `   * The ${metadata.name} command.`,
    '   *',
    '   * @public',
    '   * @readonly',
    '   */',
    `  public get ${commandName}(): Command<${type}> {`,
    `    return this._${commandName};`,
    '  }',
    '',
  ].join('\n');
}

function queryGetter(metadata) {
  return [
    '  /**',
    `   * The ${metadata.name} projection.`,
    '   *',
    '   * @public',
    '   * @readonly',
    '   */',
    `  public get ${metadata.name}() {`,
    `    return this._${metadata.name};`,
    '  }',
    '',
  ].join('\n');
}

function findRegionEnd(source, classStart, region) {
  const start = source.indexOf(`// #region ${region}`, classStart);
  if (start < 0) throw new Error(`Missing ${region} region after offset ${classStart}.`);
  const end = source.indexOf('// #endregion', start);
  if (end < 0) throw new Error(`Missing ${region} region end after offset ${classStart}.`);
  return source.lastIndexOf('\n', end) + 1;
}

function propertyInsertion(source, classStart, getterText) {
  const properties = source.indexOf('// #region Properties', classStart);
  if (properties >= 0) {
    const end = source.indexOf('// #endregion', properties);
    if (end < 0) throw new Error(`Missing Properties region end after offset ${classStart}.`);
    return { position: source.lastIndexOf('\n', end) + 1, text: getterText };
  }
  const methods = source.indexOf('// #region Methods', classStart);
  if (methods < 0) throw new Error(`Missing Methods region after offset ${classStart}.`);
  return {
    position: source.lastIndexOf('\n', methods) + 1,
    text: `  // #region Properties\n\n${getterText}  // #endregion\n\n`,
  };
}

function findMatchingParenthesis(source, open) {
  let depth = 0;
  let quote;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unclosed parenthesis at offset ${open}.`);
}

function addEdit(editsByFile, file, start, end, text, reason) {
  const edits = editsByFile.get(file) ?? [];
  edits.push({ start, end, text, reason });
  editsByFile.set(file, edits);
}

function applyEdits(source, edits, file) {
  const ordered = [...edits].sort(
    (left, right) => right.start - left.start || right.end - left.end,
  );
  let previousStart = source.length + 1;
  let output = source;
  for (const edit of ordered) {
    if (edit.end > previousStart) {
      throw new Error(
        `Overlapping edits in ${relative(ROOT, file)} at ${edit.start}-${edit.end} (${edit.reason}).`,
      );
    }
    output = `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`;
    previousStart = edit.start;
  }
  return output;
}

function updatedNamedImport(sourceFile, declaration, names) {
  const importClause = declaration.importClause;
  const bindings = importClause?.namedBindings;
  if (!importClause || !bindings || !ts.isNamedImports(bindings)) return undefined;
  const existing = new Set(bindings.elements.map((element) => element.name.text));
  const additions = [...names]
    .filter((name) => !existing.has(name))
    .sort()
    .map((name) =>
      ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name)),
    );
  if (additions.length === 0) return undefined;
  const updated = ts.factory.updateImportDeclaration(
    declaration,
    declaration.modifiers,
    ts.factory.updateImportClause(
      importClause,
      importClause.isTypeOnly,
      importClause.name,
      ts.factory.updateNamedImports(bindings, [...bindings.elements, ...additions]),
    ),
    declaration.moduleSpecifier,
    declaration.attributes,
  );
  return ts
    .createPrinter({ removeComments: true })
    .printNode(ts.EmitHint.Unspecified, updated, sourceFile);
}

const allFiles = SOURCE_ROOTS.filter((root) => statSync(resolve(ROOT, root)).isDirectory()).flatMap(
  (root) => collectFiles(resolve(ROOT, root), []),
);
const typeScriptFiles = allFiles.filter((file) => file.endsWith('.ts'));
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(resolve(ROOT, 'tsconfig.base.json'), ts.sys.readFile).config,
  ts.sys,
  ROOT,
);
const program = ts.createProgram(typeScriptFiles, config.options);
const checker = program.getTypeChecker();
const declarationMetadata = new Map();
const metadata = [];

for (const sourceFile of program.getSourceFiles()) {
  if (!sourceFile.fileName.startsWith(ROOT) || !sourceFile.fileName.endsWith('ViewPresenter.ts'))
    continue;
  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name?.text.endsWith('ViewPresenter'))
      continue;
    for (const member of statement.members) {
      if (!ts.isMethodDeclaration(member) || !ts.isIdentifier(member.name)) continue;
      const isPublic = member.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.PublicKeyword,
      );
      if (!isPublic || EXEMPT_METHODS.has(member.name.text) || /^ng[A-Z]/u.test(member.name.text))
        continue;
      const file = sourceFile.fileName;
      const relativeFile = relative(ROOT, file);
      const name = member.name.text;
      const returnType = member.type?.getText(sourceFile) ?? '';
      const isAction =
        returnType === 'void' ||
        returnType === 'Promise<void>' ||
        ACTION_OVERRIDES.has(`${relativeFile}:${name}`);
      const entry = {
        classDeclaration: statement,
        className: statement.name.text,
        commandName: `${name}Command`,
        externalReferences: 0,
        file,
        isAction,
        hasExistingCommand:
          isAction &&
          statement.members.some(
            (candidate) =>
              candidate.name &&
              ts.isIdentifier(candidate.name) &&
              candidate.name.text === `${name}Command`,
          ),
        method: member,
        name,
        privateName: isAction
          ? `onExecute${pascalCase(name)}Command`
          : `resolve${pascalCase(name)}`,
        sourceFile,
        templateReferences: 0,
      };
      metadata.push(entry);
      declarationMetadata.set(member, entry);
    }
  }
}

const metadataByTemplate = new Map();
for (const file of htmlFiles) {
  const componentFile = file.replace(/\.html$/u, '.ts');
  const componentSource = typeScriptFiles.includes(componentFile)
    ? readFileSync(componentFile, 'utf8')
    : '';
  const viewName = basename(file, '.html');
  metadataByTemplate.set(
    file,
    metadata.filter(
      (entry) =>
        entry.className.replace(/Presenter$/u, '') === viewName ||
        componentSource.includes(entry.className),
    ),
  );
}

for (const file of htmlFiles) {
  const entries = metadataByTemplate.get(file) ?? [];
  const source = readFileSync(file, 'utf8');
  for (const entry of entries) {
    const pattern = new RegExp(`\\bpresenter\\.${entry.name}\\s*\\(`, 'gu');
    for (const match of source.matchAll(pattern)) entry.templateReferences += 1;
  }
}

const nonCallReferences = [];
for (const sourceFile of program.getSourceFiles()) {
  if (!sourceFile.fileName.startsWith(ROOT)) continue;
  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node)) {
      const symbol = checker.getSymbolAtLocation(node.name);
      const entry = symbol?.declarations
        ?.map((declaration) => declarationMetadata.get(declaration))
        .find(Boolean);
      if (entry) {
        const isDeclarationName = node === entry.method.name;
        const isCall = ts.isCallExpression(node.parent) && node.parent.expression === node;
        const isInternal =
          node.expression.kind === ts.SyntaxKind.ThisKeyword && sourceFile.fileName === entry.file;
        if (!isDeclarationName && !isInternal) entry.externalReferences += 1;
        if (!isDeclarationName && !isCall && !isInternal) {
          nonCallReferences.push({
            entry,
            file: sourceFile.fileName,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

for (const entry of metadata) {
  entry.needsSurface = entry.externalReferences > 0 || entry.templateReferences > 0;
}

const editsByFile = new Map();

for (const sourceFile of program.getSourceFiles()) {
  if (!sourceFile.fileName.startsWith(ROOT)) continue;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const access = node.expression;
      const symbol = checker.getSymbolAtLocation(access.name);
      const entry = symbol?.declarations
        ?.map((declaration) => declarationMetadata.get(declaration))
        .find(Boolean);
      if (entry?.needsSurface) {
        const isInternal =
          access.expression.kind === ts.SyntaxKind.ThisKeyword &&
          sourceFile.fileName === entry.file;
        if (isInternal) {
          addEdit(
            editsByFile,
            sourceFile.fileName,
            access.name.getStart(sourceFile),
            access.name.end,
            entry.privateName,
            'internal presenter call',
          );
        } else if (entry.isAction) {
          addEdit(
            editsByFile,
            sourceFile.fileName,
            access.name.getStart(sourceFile),
            access.name.end,
            `${entry.commandName}.execute`,
            'external command call',
          );
          if (entry.method.parameters.length > 1) {
            addEdit(
              editsByFile,
              sourceFile.fileName,
              node.arguments.pos,
              node.arguments.pos,
              '[',
              'command tuple start',
            );
            addEdit(
              editsByFile,
              sourceFile.fileName,
              node.arguments.end,
              node.arguments.end,
              ']',
              'command tuple end',
            );
          }
        } else if (entry.method.parameters.length > 0) {
          addEdit(
            editsByFile,
            sourceFile.fileName,
            access.name.end,
            access.name.end,
            '()',
            'parameterized signal read',
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

for (const file of htmlFiles) {
  const entries = metadataByTemplate.get(file) ?? [];
  const source = readFileSync(file, 'utf8');
  for (const entry of entries.filter((candidate) => candidate.needsSurface)) {
    const pattern = new RegExp(`\\bpresenter\\.${entry.name}(?=\\s*\\()`, 'gu');
    for (const match of source.matchAll(pattern)) {
      const nameStart = match.index + 'presenter.'.length;
      const nameEnd = nameStart + entry.name.length;
      if (entry.isAction) {
        addEdit(
          editsByFile,
          file,
          nameStart,
          nameEnd,
          `${entry.commandName}.execute`,
          'template command call',
        );
        if (entry.method.parameters.length > 1) {
          const open = source.indexOf('(', nameEnd);
          const close = findMatchingParenthesis(source, open);
          addEdit(editsByFile, file, open + 1, open + 1, '[', 'template command tuple start');
          addEdit(editsByFile, file, close, close, ']', 'template command tuple end');
        }
      } else if (entry.method.parameters.length > 0) {
        addEdit(editsByFile, file, nameEnd, nameEnd, '()', 'template parameterized signal read');
      }
    }
  }
}

const metadataByClass = new Map();
for (const entry of metadata) {
  const key = entry.classDeclaration;
  const entries = metadataByClass.get(key) ?? [];
  entries.push(entry);
  metadataByClass.set(key, entries);
}

for (const [classDeclaration, entries] of metadataByClass) {
  const sourceFile = classDeclaration.getSourceFile();
  const source = sourceFile.getFullText();
  const surfaced = entries.filter((entry) => entry.needsSurface);
  for (const entry of entries) {
    const publicModifier = entry.method.modifiers?.find(
      (modifier) => modifier.kind === ts.SyntaxKind.PublicKeyword,
    );
    if (!publicModifier) continue;
    addEdit(
      editsByFile,
      entry.file,
      publicModifier.getStart(sourceFile),
      publicModifier.end,
      'private',
      'private presenter implementation',
    );
    if (entry.needsSurface) {
      addEdit(
        editsByFile,
        entry.file,
        entry.method.name.getStart(sourceFile),
        entry.method.name.end,
        entry.privateName,
        'presenter implementation name',
      );
    }
    const triviaStart = entry.method.getFullStart();
    const triviaEnd = entry.method.getStart(sourceFile);
    const trivia = source.slice(triviaStart, triviaEnd);
    const publicTag = trivia.lastIndexOf('@public');
    if (publicTag >= 0) {
      addEdit(
        editsByFile,
        entry.file,
        triviaStart + publicTag,
        triviaStart + publicTag + '@public'.length,
        '@private',
        'private presenter documentation',
      );
    }
  }
  if (surfaced.length > 0) {
    const fieldText = surfaced
      .map((entry) =>
        entry.isAction ? (entry.hasExistingCommand ? '' : actionField(entry)) : queryField(entry),
      )
      .join('');
    const getterText = surfaced
      .map((entry) =>
        entry.isAction
          ? entry.hasExistingCommand
            ? ''
            : commandGetter(entry)
          : queryGetter(entry),
      )
      .join('');
    addEdit(
      editsByFile,
      sourceFile.fileName,
      findRegionEnd(source, classDeclaration.getStart(sourceFile), 'Fields'),
      findRegionEnd(source, classDeclaration.getStart(sourceFile), 'Fields'),
      fieldText,
      'presenter command and signal fields',
    );
    const properties = propertyInsertion(source, classDeclaration.getStart(sourceFile), getterText);
    addEdit(
      editsByFile,
      sourceFile.fileName,
      properties.position,
      properties.position,
      properties.text,
      'presenter command and signal getters',
    );

    const requiredImports = new Map();
    if (surfaced.some((entry) => entry.isAction)) {
      const commandModule = classDeclaration.name.text.startsWith('Mobile')
        ? '@symphony/frontend-core/mobile'
        : '@symphony/frontend-core';
      requiredImports.set(commandModule, new Set(['Command']));
    }
    if (surfaced.some((entry) => !entry.isAction))
      requiredImports.set('@angular/core', new Set(['computed']));
    for (const [moduleName, names] of requiredImports) {
      const declaration = sourceFile.statements.find(
        (statement) =>
          ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === moduleName,
      );
      if (declaration) {
        const replacement = updatedNamedImport(sourceFile, declaration, names);
        if (replacement)
          addEdit(
            editsByFile,
            sourceFile.fileName,
            declaration.getStart(sourceFile),
            declaration.end,
            replacement,
            `add ${moduleName} import`,
          );
      } else {
        const region = source.indexOf('// #region Imports');
        const insertion = source.indexOf('\n', region) + 1;
        const specifiers = [...names].sort().join(', ');
        addEdit(
          editsByFile,
          sourceFile.fileName,
          insertion,
          insertion,
          `\nimport { ${specifiers} } from '${moduleName}';`,
          `create ${moduleName} import`,
        );
      }
    }
  }
}

let changed = 0;
for (const [file, edits] of editsByFile) {
  const source = readFileSync(file, 'utf8');
  const output = applyEdits(source, edits, file);
  if (output === source) continue;
  changed += 1;
  if (WRITE) writeFileSync(file, output, 'utf8');
}

const surfaced = metadata.filter((entry) => entry.needsSurface);
const internal = metadata.filter((entry) => !entry.needsSurface);
process.stdout.write(
  `${WRITE ? 'Updated' : 'Would update'} ${changed} files: ` +
    `${surfaced.filter((entry) => entry.isAction).length} commands, ` +
    `${surfaced.filter((entry) => !entry.isAction).length} signal projections, ` +
    `${internal.length} internal methods.\n`,
);
if (nonCallReferences.length > 0) {
  process.stdout.write('Non-call references requiring review:\n');
  for (const reference of nonCallReferences) {
    process.stdout.write(
      `  ${relative(ROOT, reference.file)}:${reference.line}  ${reference.entry.className}.${reference.entry.name}\n`,
    );
  }
}
