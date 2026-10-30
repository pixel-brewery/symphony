#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const docsRoot = resolve(process.argv[2] ?? 'docs');
const productRoot = resolve(docsRoot, 'project');
const errors = [];

for (const required of [
    docsRoot,
    productRoot,
    resolve(productRoot, 'README.md'),
    resolve(productRoot, 'documentation-principles.md')
]) {
    if (!existsSync(required)) {
        errors.push(`Missing required documentation path: ${relative(process.cwd(), required)}`);
    }
}

const forbiddenProductDirectories = new Set(['apps', 'backend', 'database', 'frontend', 'libs', 'shared']);
if (existsSync(productRoot)) {
    for (const entry of readdirSync(productRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
            continue;
        }
        if (forbiddenProductDirectories.has(entry.name)) {
            errors.push(`Technical product-documentation directory is not allowed: docs/project/${entry.name}`);
        }
        const readme = resolve(productRoot, entry.name, 'README.md');
        if (!existsSync(readme)) {
            errors.push(`Feature directory has no README.md: docs/project/${entry.name}`);
        }
    }
}

const markdownFiles = existsSync(docsRoot) ? walkMarkdown(docsRoot) : [];
const anchorCache = new Map();

for (const file of markdownFiles) {
    const markdown = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
    const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
    for (const match of markdown.matchAll(linkPattern)) {
        const href = normalizeHref(match[1]);
        if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) {
            continue;
        }

        const hashIndex = href.indexOf('#');
        const rawTarget = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
        const anchor = hashIndex >= 0 ? decodeURIComponent(href.slice(hashIndex + 1)) : '';
        const target = rawTarget ? resolve(dirname(file), decodeURIComponent(rawTarget)) : file;

        if (!existsSync(target)) {
            errors.push(`${relative(process.cwd(), file)}: missing link target ${href}`);
            continue;
        }
        if (!anchor || !statSync(target).isFile() || !target.endsWith('.md')) {
            continue;
        }
        if (!anchorCache.has(target)) {
            anchorCache.set(target, collectAnchors(readFileSync(target, 'utf8')));
        }
        if (!anchorCache.get(target).has(anchor)) {
            errors.push(`${relative(process.cwd(), file)}: missing anchor ${href}`);
        }
    }
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
}

console.log(`Checked ${markdownFiles.length} Markdown files: product structure, local links, and anchors are valid.`);

function walkMarkdown(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            return walkMarkdown(path);
        }
        return entry.name.endsWith('.md') ? [path] : [];
    });
}

function normalizeHref(value) {
    let href = value.trim();
    if (href.startsWith('<') && href.endsWith('>')) {
        href = href.slice(1, -1);
    }
    return href.replace(/\s+["'][^"']*["']$/, '');
}

function collectAnchors(markdown) {
    const anchors = new Set();
    const duplicates = new Map();

    for (const line of markdown.split(/\r?\n/)) {
        const explicitAnchor = line.match(/<a\s+(?:name|id)=["']([^"']+)["']/i);
        if (explicitAnchor) {
            anchors.add(explicitAnchor[1]);
        }

        const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
        if (!heading) {
            continue;
        }

        const base = heading[1]
            .replace(/<[^>]+>/g, '')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/[\`*_~]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .replace(/\s+/g, '-');
        const duplicate = duplicates.get(base) ?? 0;
        duplicates.set(base, duplicate + 1);
        anchors.add(duplicate === 0 ? base : `${base}-${duplicate}`);
    }

    return anchors;
}
