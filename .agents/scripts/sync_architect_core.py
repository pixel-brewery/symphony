#!/usr/bin/env python3
"""Compare or explicitly synchronize the common modules of the native architect skills."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

START = "<!-- architect-core:start -->"
END = "<!-- architect-core:end -->"
BLOCK = re.compile(re.escape(START) + r".*?" + re.escape(END), re.DOTALL)
SKILLS = ("mosaik-architect", "flamox-architect", "archipel-architect", "synapse-architect", "symphony-architect")


def skill_at(root: Path) -> Path:
    matches = [root / ".agents" / "skills" / name for name in SKILLS if (root / ".agents" / "skills" / name / "SKILL.md").is_file()]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one supported architect skill in {root}.")
    return matches[0]


def core_block(path: Path) -> str:
    matches = BLOCK.findall(path.read_text(encoding="utf-8"))
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one shared architect block in {path}.")
    return matches[0]


def modules(skill: Path) -> dict[str, bytes]:
    directory = skill / "references" / "common"
    if not directory.is_dir():
        raise ValueError(f"Missing common module directory: {directory}")
    paths = sorted(directory.iterdir())
    if not paths or any(not path.is_file() or path.suffix != ".md" for path in paths):
        raise ValueError(f"Common modules must be a nonempty set of Markdown files: {directory}")
    return {path.name: path.read_bytes() for path in paths}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2], help="Source repository; defaults to this script's repository.")
    parser.add_argument("--peer", type=Path, required=True, help="Other repository checkout. Ordinary skill use never needs it.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Read-only comparison (the default).")
    mode.add_argument("--write", action="store_true", help="Copy this repository's common modules and shared block to the peer.")
    args = parser.parse_args()
    root, peer = args.root.resolve(), args.peer.resolve()
    if root == peer:
        parser.error("The source and peer must be different repositories.")
    try:
        source_skill, peer_skill = skill_at(root), skill_at(peer)
        if source_skill.name == peer_skill.name:
            raise ValueError("The two repositories must contain different architect skills.")
        source, target = modules(source_skill), modules(peer_skill)
        source_block, target_block = core_block(source_skill / "SKILL.md"), core_block(peer_skill / "SKILL.md")
        differences = [f"references/common/{name}" for name in sorted(source.keys() | target.keys()) if source.get(name) != target.get(name)]
        if source_block != target_block:
            differences.append("SKILL.md shared workflow block")
        if not args.write:
            if differences:
                print("Architect core drift:\n" + "\n".join(f"- {path}" for path in differences), file=sys.stderr)
                return 1
            print(f"Architect cores match ({len(source)} common modules and shared workflow).")
            return 0
        # Peer helpers support different project names; keep their scripts and local references local.
        # The common directory and shared entrypoint block are the only synchronized content.
        directory = peer_skill / "references" / "common"
        for name, content in source.items():
            (directory / name).write_bytes(content)
        for name in target.keys() - source.keys():
            (directory / name).unlink()
        peer_entry = peer_skill / "SKILL.md"
        peer_entry.write_text(BLOCK.sub(lambda _: source_block, peer_entry.read_text(encoding="utf-8")), encoding="utf-8")
        print(f"Synchronized {len(source)} common modules and shared workflow from {source_skill.name} to {peer_skill.name}.")
        return 0
    except (OSError, ValueError) as error:
        print(f"Cannot compare or synchronize architect core: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
