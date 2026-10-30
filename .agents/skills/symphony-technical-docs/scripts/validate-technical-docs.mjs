#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const docsRoot = resolve(process.argv[2] ?? 'docs');
const architectureRoot = resolve(docsRoot, 'architecture');
const indexPath = resolve(architectureRoot, 'README.md');
const errors = [];
const allowedStatuses = new Set(['Implementierter Ist-Stand', 'Verbindliche Zielarchitektur', 'Migrationsvertrag']);
const forbiddenFeatureNames = new Set(['apps', 'backend', 'database', 'frontend', 'libs', 'shared']);

for (const requiredPath of [docsRoot, architectureRoot, indexPath]) {
    if (!existsSync(requiredPath)) {
        errors.push(`Missing required technical documentation path: ${relative(process.cwd(), requiredPath)}`);
    }
}

const featureDirectories = [];

if (existsSync(architectureRoot)) {
    for (const entry of readdirSync(architectureRoot, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
            errors.push(`Technical documentation must be feature-oriented: docs/architecture/${entry.name}`);
            continue;
        }
        if (!entry.isDirectory() || entry.name.startsWith('.')) {
            continue;
        }
        featureDirectories.push(entry.name);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.name)) {
            errors.push(`Technical feature directory must use lowercase kebab-case: docs/architecture/${entry.name}`);
        }
        if (forbiddenFeatureNames.has(entry.name)) {
            errors.push(`Repository-layer directory is not a technical feature: docs/architecture/${entry.name}`);
        }
        const featureReadme = resolve(architectureRoot, entry.name, 'README.md');
        if (!existsSync(featureReadme)) {
            errors.push(`Technical feature directory has no README.md: docs/architecture/${entry.name}`);
        }
    }
}

const index = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
for (const featureName of featureDirectories) {
    const escapedFeatureName = featureName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const indexLinkPattern = new RegExp(`\\(${escapedFeatureName}/README\\.md(?:#[^)]+)?\\)`, 'u');
    if (!indexLinkPattern.test(index)) {
        errors.push(`Technical feature is missing from docs/architecture/README.md: ${featureName}`);
    }
}

if (existsSync(architectureRoot)) {
    for (const file of walkMarkdown(architectureRoot)) {
        if (file === indexPath) {
            continue;
        }
        const markdown = readFileSync(file, 'utf8');
        if (!/^#\s+\S.+$/mu.test(markdown)) {
            errors.push(`${relative(process.cwd(), file)}: missing level-one heading`);
        }
        const statusMatches = [...markdown.matchAll(/^\*\*Dokumentstatus:\*\*\s+(.+)$/gmu)];
        if (statusMatches.length !== 1) {
            errors.push(`${relative(process.cwd(), file)}: expected exactly one document status`);
            continue;
        }
        const status = statusMatches[0][1].trim();
        if (!allowedStatuses.has(status)) {
            errors.push(`${relative(process.cwd(), file)}: unsupported document status '${status}'`);
        }
    }
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}

console.log(
    `Checked ${featureDirectories.length} technical feature directories: structure, index, and document statuses are valid.`
);

function walkMarkdown(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            return walkMarkdown(path);
        }
        return entry.name.endsWith('.md') ? [path] : [];
    });
}
