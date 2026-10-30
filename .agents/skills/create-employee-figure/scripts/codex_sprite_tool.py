#!/usr/bin/env python3
"""Run the installed Codex sprite pipeline without copying or modifying its tools."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

TOOLS = frozenset({
    "prepare_pet_run", "extract_strip_frames", "inspect_frames", "compose_atlas",
    "make_contact_sheet", "render_animation_previews", "extract_cardinal_anchors",
    "compose_cardinal_anchor_strip", "assemble_extended_atlas", "despill_chroma_edges",
    "validate_atlas", "make_direction_qa_sheet", "measure_direction_continuity",
    "validate_pet_quality", "make_direction_blind_qa_sheet", "combine_direction_blind_verdicts",
    "validate_direction_blind_verdicts", "derive_running_left_from_running_right",
})


def locate() -> Path:
    explicit = os.environ.get("SYMPHONY_CODEX_SPRITE_SKILL")
    if explicit:
        candidates = [Path(explicit).expanduser()]
    else:
        codex_root = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
        candidates = list(codex_root.glob("plugins/cache/*/work-pets/*/skills/create-pet"))
        candidates.sort(key=lambda path: tuple(int(part) for part in path.parents[1].name.split(".") if part.isdigit()), reverse=True)
    for candidate in candidates:
        if (candidate / "SKILL.md").is_file() and all((candidate / "scripts" / f"{tool}.py").is_file() for tool in TOOLS):
            return candidate.resolve()
    raise SystemExit("The installed Codex create-pet sprite toolkit is required. Install work-pets or set SYMPHONY_CODEX_SPRITE_SKILL to its create-pet skill directory. No artwork was changed.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tool", choices=sorted(TOOLS | {"locate"}))
    parser.add_argument("arguments", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    skill = locate()
    if args.tool == "locate":
        print(json.dumps({"skill_dir": str(skill), "skill": str(skill / "SKILL.md"), "contract": str(skill.parent.parent / "references" / "sprite-sheet-contract.md")}))
        return 0
    try:
        from PIL import Image  # noqa: F401
    except ImportError as error:
        raise SystemExit("Use a Python runtime with Pillow; the sprite toolkit has not run.") from error
    return subprocess.run([sys.executable, str(skill / "scripts" / f"{args.tool}.py"), *args.arguments], check=False).returncode


if __name__ == "__main__":
    sys.exit(main())
