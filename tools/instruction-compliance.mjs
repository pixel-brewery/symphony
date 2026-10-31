import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { relative, resolve, basename, dirname, join, sep } from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOTS = ['apps', 'libs', 'tools'];
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'out',
  '.nx',
  '.git',
  'coverage',
  'browser',
]);

function collectTypeScriptFiles(directory, accumulator) {
  for (const entry of readdirSync(directory)) {
    if (IGNORED_DIRECTORIES.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) collectTypeScriptFiles(absolute, accumulator);
    else if (entry.endsWith('.ts')) accumulator.push(absolute);
  }
  return accumulator;
}

function collectSourceFiles(directory, accumulator) {
  for (const entry of readdirSync(directory)) {
    if (IGNORED_DIRECTORIES.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) collectSourceFiles(absolute, accumulator);
    else if (/\.(?:cjs|css|html|js|mjs|scss|ts|tsx)$/u.test(entry)) accumulator.push(absolute);
  }
  return accumulator;
}

const files = SCAN_ROOTS.filter((root) => existsSync(resolve(ROOT, root)))
  .flatMap((root) => collectTypeScriptFiles(resolve(ROOT, root), []))
  .sort();
const sourceFiles = SCAN_ROOTS.filter((root) => existsSync(resolve(ROOT, root)))
  .flatMap((root) => collectSourceFiles(resolve(ROOT, root), []))
  .sort();

const EXPORT_PATTERN =
  /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(const|let|var|class|interface|type|enum|function)\s+([A-Za-z0-9_$]+)/;
const REEXPORT_PATTERN = /^export\s+(?:type\s+)?(?:\*|\{)/;
const MEMBER_PATTERN =
  /^ {2}(?!\/\/|\/\*|\*|\}|#region|#endregion)(?:(public|private|protected|static|readonly|abstract|override|declare|accessor|get|set|async)\s+)*([A-Za-z0-9_$[\]'"`]+)\s*[(<:=?!]/;
const ACCESS_MODIFIER_PATTERN = /^ {2}(?:@[\w.]+\([^)]*\)\s*)?(public|private|protected)\b/;

/** True when `(` opens before `=` after the member name, ignoring type-parameter brackets. */
function declaresParameterList(lines, index, memberName) {
  const text = lines.slice(index, index + 14).join('\n');
  const nameAt = text.indexOf(memberName);
  if (nameAt < 0) return false;
  let angleDepth = 0;
  for (let cursor = nameAt + memberName.length; cursor < text.length; cursor += 1) {
    const character = text[cursor];
    if (character === '<') angleDepth += 1;
    else if (character === '>') angleDepth = Math.max(0, angleDepth - 1);
    else if (angleDepth === 0) {
      if (character === '(') return true;
      if (character === '=' || character === ';' || character === ':') return false;
    }
  }
  return false;
}

const normalizeSymbol = (value) => value.replace(/_/g, '').toLowerCase();

const RULES = [
  { id: 'no-path-header', title: 'Source files do not repeat their repository path' },
  { id: 'imports-region', title: 'Import block wrapped in `// #region Imports`' },
  { id: 'import-contiguous', title: 'No blank lines between import statements' },
  { id: 'single-export', title: 'One public export per file' },
  { id: 'file-name-pascal-case', title: 'File name is PascalCase' },
  { id: 'file-name-matches-export', title: 'File name matches its single public export' },
  { id: 'interface-i-prefix', title: 'Exported interfaces are prefixed with `I`' },
  { id: 'private-field-underscore', title: 'Private fields prefixed with `_`' },
  { id: 'private-method-no-underscore', title: 'Private methods are not prefixed with `_`' },
  { id: 'member-access-modifier', title: 'Every class member declares an access modifier' },
  {
    id: 'class-regions',
    title: 'Class bodies use Fields -> Ctor -> Properties -> Methods regions',
  },
  { id: 'no-any', title: 'No `any` type' },
  { id: 'no-arrow-method', title: 'Methods are real functions, not arrow properties' },
  { id: 'tsdoc-public-member', title: 'Public members carry TSDoc with an access tag' },
  { id: 'view-triple-file', title: 'Every View owns sibling .ts / .html / .scss files' },
  {
    id: 'presenter-command-only',
    title: 'ViewPresenters expose Commands and Signals, not public methods',
  },
  {
    id: 'spec-file-matches-source',
    title: 'Non-E2E specs use the exact production-file basename',
  },
  { id: 'spec-aaa-markers', title: 'Specs mark // arrange, // act and // assert' },
];

const findings = new Map(RULES.map((rule) => [rule.id, []]));
const report = (ruleId, file, line, detail) =>
  findings.get(ruleId).push({ file: relative(ROOT, file).split(sep).join('/'), line, detail });

for (const file of sourceFiles) {
  const firstLine = readFileSync(file, 'utf8').split('\n', 1)[0];
  if (/^(?:\/\/|\/\*|<!--)\s+(?:apps|libs|tools)\//u.test(firstLine)) {
    report('no-path-header', file, 1, firstLine);
  }
}

function classBodyRanges(lines) {
  const ranges = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^(export\s+)?(abstract\s+)?class\s+[A-Za-z0-9_$]/.test(lines[index])) continue;
    let depth = 0;
    let started = false;
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const stripped = lines[cursor].replace(/\/\/.*$/, '');
      for (const character of stripped) {
        if (character === '{') {
          depth += 1;
          started = true;
        } else if (character === '}') depth -= 1;
      }
      if (started && depth === 0) {
        ranges.push([index, cursor]);
        index = cursor;
        break;
      }
    }
  }
  return ranges;
}

for (const file of files) {
  const relativePath = relative(ROOT, file).split(sep).join('/');
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const name = basename(file, '.ts');
  const isSpec = file.endsWith('.spec.ts');
  const isRepositoryPolicySpec = /^tools\/[^/]+\.policy\.spec\.ts$/u.test(relativePath);
  const isBarrel = name === 'index' || name === 'public-api' || name === 'mobile';
  const isScript = relativePath.startsWith('tools/');
  // Framework-mandated file names (vitest.config.ts, playwright.config.ts) and ambient
  // declaration files cannot be renamed to match an export.
  const isFrameworkFile = /\.(config|d)\.ts$/.test(relativePath);

  // --- spec file name ----------------------------------------------------
  if (isSpec && !isRepositoryPolicySpec && !relativePath.startsWith('apps/renderer-e2e/')) {
    const subjectName = basename(file, '.spec.ts');
    const ownsAdjacentProductionFile = ['.ts', '.tsx', '.js', '.mjs', '.cjs'].some((extension) =>
      existsSync(join(dirname(file), `${subjectName}${extension}`)),
    );
    if (!ownsAdjacentProductionFile) {
      report(
        'spec-file-matches-source',
        file,
        1,
        `no adjacent production file named ${subjectName}.{ts,tsx,js,mjs,cjs}`,
      );
    }
  }

  // --- imports-region / import-contiguous ---------------------------------
  const importLineNumbers = lines
    .map((line, index) => (/^import[\s{('"]/.test(line) ? index : -1))
    .filter((index) => index >= 0);
  if (importLineNumbers.length > 0) {
    if (!source.includes('// #region Imports'))
      report('imports-region', file, importLineNumbers[0] + 1, 'missing');
    let inMultiline = 0;
    for (let index = importLineNumbers[0]; index <= importLineNumbers.at(-1); index += 1) {
      const line = lines[index];
      inMultiline += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (line.trim() === '' && inMultiline === 0) {
        report('import-contiguous', file, index + 1, 'blank line');
        break;
      }
    }
  }

  // --- exports ------------------------------------------------------------
  const exportedSymbols = [];
  const reexportOnly = lines
    .filter((line) => line.startsWith('export '))
    .every((line) => REEXPORT_PATTERN.test(line));
  for (const [index, line] of lines.entries()) {
    const match = EXPORT_PATTERN.exec(line);
    if (!match) continue;
    exportedSymbols.push({ kind: match[1], symbol: match[2], line: index + 1 });
    if (match[1] === 'interface' && !/^I[A-Z]/.test(match[2]))
      report('interface-i-prefix', file, index + 1, match[2]);
  }
  if (!isBarrel && !reexportOnly && !isFrameworkFile) {
    if (exportedSymbols.length > 1)
      report(
        'single-export',
        file,
        exportedSymbols[1].line,
        `${exportedSymbols.length} public exports`,
      );
    if (!isSpec && !isScript) {
      const onlyExport = exportedSymbols[0];
      const isFunctionModule =
        exportedSymbols.length === 1 &&
        (onlyExport.kind === 'function' ||
          new RegExp(
            `^export const ${onlyExport.symbol}[^=]*=\\s*(async\\s*)?(\\(|function\\b)`,
            'm',
          ).test(source));
      if (isFunctionModule) {
        // A function module is named after the function itself, so a lowercase-first file name
        // marks it as functions rather than a class. Mixin factories keep their PascalCase name.
        if (name !== onlyExport.symbol)
          report(
            'file-name-pascal-case',
            file,
            1,
            `${name} != ${onlyExport.symbol} (function module)`,
          );
      } else if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) report('file-name-pascal-case', file, 1, name);
      // A role suffix is allowed (`VIEW_PRESENTER` -> `ViewPresenterToken.ts`) so two exports
      // that normalise to the same concept can still own separate files.
      else if (
        exportedSymbols.length === 1 &&
        !normalizeSymbol(name).startsWith(normalizeSymbol(onlyExport.symbol))
      )
        report(
          'file-name-matches-export',
          file,
          onlyExport.line,
          `${name} != ${onlyExport.symbol}`,
        );
    }
  }

  // --- any ----------------------------------------------------------------
  for (const [index, line] of lines.entries()) {
    const suppressed = /eslint-disable(-next-line)?[^\n]*no-explicit-any/.test(
      lines[index - 1] ?? '',
    );
    if (
      /\bas any\b|:\s*any\b|<any>|\bany\[\]/.test(line) &&
      !line.trim().startsWith('*') &&
      !suppressed
    )
      report('no-any', file, index + 1, line.trim().slice(0, 70));
  }

  // --- class-scoped rules -------------------------------------------------
  for (const [start, end] of classBodyRanges(lines)) {
    const regionOrder = [];
    for (let index = start; index <= end; index += 1) {
      const line = lines[index];
      const regionMatch = /\/\/\s*#region\s+(Fields|Ctor|Properties|Methods)\b/.exec(line);
      if (regionMatch) regionOrder.push(regionMatch[1]);

      const memberMatch = MEMBER_PATTERN.exec(line);
      if (!memberMatch) continue;
      const memberName = memberMatch[2];
      if (memberName === 'constructor') continue;

      const hasModifier = ACCESS_MODIFIER_PATTERN.test(line);
      if (!hasModifier) report('member-access-modifier', file, index + 1, memberName);

      // `protected` members stay unprefixed: Angular templates bind to them, and the rule
      // names private fields specifically.
      const isPrivate = /^ {2}private\b/.test(line);
      const isPrivateOrProtected = /^ {2}(?:private|protected)\b/.test(line);
      // A member is a method when a parameter list opens before any initialiser. Type
      // parameters may wrap across lines and may themselves contain `=` defaults, so the scan
      // ignores anything inside angle brackets.
      const isMethodLike = declaresParameterList(lines, index, memberName);
      if (
        isPrivate &&
        !isMethodLike &&
        !memberName.startsWith('_') &&
        !/\bget\s|\bset\s/.test(line)
      )
        report('private-field-underscore', file, index + 1, memberName);
      if (isPrivateOrProtected && isMethodLike && memberName.startsWith('_'))
        report('private-method-no-underscore', file, index + 1, memberName);

      // Only a *method* written as an arrow property is a violation. A function-valued field
      // that is registered or passed on (an `EventListener` kept for removal, a key extractor
      // bound to a component input) is legitimately a property, so it is flagged only when the
      // class also calls it like a method.
      if (
        /^ {2}(?:public|private|protected|static|readonly|override)?[\w\s]*\b[A-Za-z0-9_$]+\s*(?::[^=]+)?=\s*(?:async\s*)?\(/.test(
          line,
        ) &&
        /=>/.test(lines.slice(index, index + 3).join(' ')) &&
        new RegExp(`this\\.${memberName}\\s*\\(`).test(source)
      )
        report('no-arrow-method', file, index + 1, memberName);

      if (/^ {2}public\b/.test(line) && !isSpec) {
        const preceding = lines.slice(Math.max(start, index - 12), index).join('\n');
        const closesDoc =
          /\*\/\s*$/.test(lines[index - 1] ?? '') || /\*\/\s*$/.test(lines[index - 2] ?? '');
        if (!closesDoc || !/@(public|readonly|protected|private)\b/.test(preceding))
          report('tsdoc-public-member', file, index + 1, memberName);
      }
    }
    const expected = ['Fields', 'Ctor', 'Properties', 'Methods'];
    // An empty class body has nothing to group.
    const hasMembers = lines
      .slice(start, end + 1)
      .some((bodyLine) => MEMBER_PATTERN.test(bodyLine));
    if (regionOrder.length === 0 && hasMembers)
      report('class-regions', file, start + 1, 'no regions');
    else if (regionOrder.length > 0) {
      const ordered = regionOrder.every(
        (region, position) =>
          position === 0 || expected.indexOf(region) >= expected.indexOf(regionOrder[position - 1]),
      );
      if (!ordered) report('class-regions', file, start + 1, regionOrder.join(' -> '));
    }
  }

  // --- View triple --------------------------------------------------------
  if (name.endsWith('View') && !isSpec && source.includes('@Component')) {
    for (const extension of ['html', 'scss']) {
      if (!existsSync(join(dirname(file), `${name}.${extension}`)))
        report('view-triple-file', file, 1, `missing ${name}.${extension}`);
    }
    if (!source.includes(`styleUrl: './${name}.scss'`))
      report('view-triple-file', file, 1, 'no styleUrl');
  }

  // --- ViewPresenter surface ---------------------------------------------
  if (name.endsWith('ViewPresenter') && !isSpec) {
    for (const [index, line] of lines.entries()) {
      const match = /^ {2}public\s+(?:override\s+)?(?:async\s+)?([A-Za-z0-9_$]+)\s*\(/.exec(line);
      if (!match) continue;
      // Lifecycle and the documented behaviour extension points stay public: they are
      // overridden by subclasses, not called by the view.
      if (
        [
          'initialize',
          'dispose',
          'hydrate',
          'onHydrate',
          'onHydrationError',
          'onClose',
          'setCanClose',
          'constructor',
        ].includes(match[1]) ||
        /^ng[A-Z]/.test(match[1])
      )
        continue;
      report('presenter-command-only', file, index + 1, match[1]);
    }
  }

  // --- spec AAA -----------------------------------------------------------
  if (isSpec) {
    for (const marker of ['// act', '// assert'])
      if (!source.includes(marker)) report('spec-aaa-markers', file, 1, `missing ${marker}`);
    // `// arrange` is required only where a test actually has setup: a test that acts directly
    // on literal inputs has no Arrange phase to mark.
    if (!source.includes('// arrange')) {
      const needsArrange = lines.some((line, position) => {
        if (!line.includes('// act')) return false;
        for (let cursor = position - 1; cursor >= 0; cursor -= 1) {
          const previous = lines[cursor].trim();
          if (previous === '') continue;
          return !previous.endsWith('{') && !previous.startsWith('//');
        }
        return false;
      });
      if (needsArrange) report('spec-aaa-markers', file, 1, 'missing // arrange');
    }
  }
}

const arguments_ = process.argv.slice(2);
const ruleFilter = arguments_.find((argument) => argument.startsWith('--rule='))?.slice(7);
const wantsList = arguments_.includes('--list');
const wantsJson = arguments_.includes('--json');
const limit = Number(
  arguments_.find((argument) => argument.startsWith('--limit='))?.slice(8) ?? 40,
);

if (wantsJson) {
  process.stdout.write(`${JSON.stringify(Object.fromEntries(findings), null, 2)}\n`);
} else if (ruleFilter) {
  const entries = findings.get(ruleFilter) ?? [];
  process.stdout.write(`${ruleFilter}: ${entries.length} violation(s)\n`);
  for (const entry of entries.slice(0, limit)) {
    process.stdout.write(`  ${entry.file}:${entry.line}  ${entry.detail}\n`);
  }
  if (entries.length > limit) process.stdout.write(`  ... ${entries.length - limit} more\n`);
} else {
  const scannedFiles = files.length;
  process.stdout.write(`Instruction compliance - ${scannedFiles} TypeScript files\n\n`);
  let total = 0;
  for (const rule of RULES) {
    const entries = findings.get(rule.id);
    total += entries.length;
    const affected = new Set(entries.map((entry) => entry.file)).size;
    const status = entries.length === 0 ? 'PASS' : 'FAIL';
    process.stdout.write(
      `${status.padEnd(5)} ${rule.id.padEnd(30)} ${String(entries.length).padStart(6)} violations  ${String(affected).padStart(4)} files   ${rule.title}\n`,
    );
    if (wantsList && entries.length > 0) {
      for (const entry of entries.slice(0, limit))
        process.stdout.write(`        ${entry.file}:${entry.line}  ${entry.detail}\n`);
      if (entries.length > limit)
        process.stdout.write(`        ... ${entries.length - limit} more\n`);
    }
  }
  process.stdout.write(`\nTotal: ${total} violations across ${RULES.length} rules.\n`);

  if (arguments_.includes('--strict')) {
    // A ratchet, not a cliff: every completed rule is pinned at zero and the rules still being
    // migrated may only ever shrink. `--update-baseline` records the current counts.
    const baselinePath = resolve(ROOT, 'tools/instruction-compliance.baseline.json');
    const counts = Object.fromEntries(RULES.map((rule) => [rule.id, findings.get(rule.id).length]));
    if (arguments_.includes('--update-baseline')) {
      writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`, 'utf8');
      process.stdout.write(`Baseline written to ${relative(ROOT, baselinePath)}.\n`);
    } else {
      const baseline = existsSync(baselinePath)
        ? JSON.parse(readFileSync(baselinePath, 'utf8'))
        : {};
      const regressions = RULES.map((rule) => ({
        rule: rule.id,
        actual: counts[rule.id],
        allowed: baseline[rule.id] ?? 0,
      })).filter((entry) => entry.actual > entry.allowed);
      if (regressions.length > 0) {
        process.stdout.write('\nInstruction compliance regressed:\n');
        for (const entry of regressions)
          process.stdout.write(
            `  ${entry.rule}: ${entry.actual} violations, at most ${entry.allowed} allowed\n`,
          );
        process.exitCode = 1;
      } else {
        const improved = RULES.filter((rule) => counts[rule.id] < (baseline[rule.id] ?? 0));
        if (improved.length > 0)
          process.stdout.write(
            `\nImproved since the baseline: ${improved.map((rule) => rule.id).join(', ')}. ` +
              'Run `yarn instruction:check --update-baseline` to lock the gain in.\n',
          );
      }
    }
  }
}
