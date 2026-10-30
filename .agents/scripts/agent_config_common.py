#!/usr/bin/env python3
# .agents/scripts/agent_config_common.py
"""Frontmatter and repository helpers shared by the agent configuration scripts."""

from __future__ import annotations

import json
import re
from pathlib import Path

BLOCK_SCALAR = re.compile(r"^([|>])[+-]?$")


def find_root(explicit: Path | None, *required: str) -> Path:
    if explicit:
        return explicit.resolve()
    current = Path.cwd().resolve()
    for candidate in (current, *current.parents):
        if (candidate / "package.json").is_file() and all((candidate / part).is_dir() for part in required):
            return candidate
    raise RuntimeError("Could not locate repository root.")


def unquote_yaml_scalar(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] == "'":
        return value[1:-1].replace("''", "'")
    if len(value) >= 2 and value[0] == value[-1] == '"':
        return json.loads(value)
    return value


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Parse YAML frontmatter, including folded (>) and literal (|) block scalars."""
    match = re.match(r"\A---\n(.*?)\n---\n(.*)\Z", text, re.DOTALL)
    if not match:
        return {}, text
    metadata: dict[str, str] = {}
    lines = match.group(1).splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        index += 1
        if not line.strip() or line[:1].isspace():
            continue
        key, separator, value = line.partition(":")
        if not separator:
            continue
        block = BLOCK_SCALAR.fullmatch(value.strip())
        if not block:
            metadata[key.strip()] = unquote_yaml_scalar(value.strip())
            continue
        collected: list[str] = []
        while index < len(lines) and (not lines[index].strip() or lines[index][:1].isspace()):
            collected.append(lines[index].strip())
            index += 1
        if block.group(1) == ">":
            metadata[key.strip()] = " ".join(part for part in collected if part).strip()
        else:
            metadata[key.strip()] = "\n".join(collected).strip()
    return metadata, match.group(2)


def plugin_provided_skills(root: Path) -> set[str]:
    """Skills vendored under .github/skills are upstream Claude Code plugin skills.

    Codex and OpenCode need the vendored copy in .agents/skills, but Claude Code loads them from the
    plugins enabled in .claude/settings.json, so they are neither mirrored nor expected in .claude/skills.
    """
    directory = root / ".github" / "skills"
    return {path.parent.name for path in directory.glob("*/SKILL.md")} if directory.is_dir() else set()
