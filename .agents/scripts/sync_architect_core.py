#!/usr/bin/env python3
"""Validate Symphony's installed, versioned Architecture foundation and local derivation."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--check", action="store_true", help="Read-only validation (the default).")
    args = parser.parse_args()
    root = args.root.resolve()
    checker = root / ".agents/skills/architecture/scripts/check_inheritance.py"
    if not checker.is_file():
        print("Architecture base is missing; restore the immutable revision in skills-lock.json through the Skills CLI.", file=sys.stderr)
        return 1
    return subprocess.run(
        [sys.executable, str(checker), "--root", str(root), "--derived", "symphony-architect"],
        cwd=root,
        check=False,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())
