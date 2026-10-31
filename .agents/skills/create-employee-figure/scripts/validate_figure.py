#!/usr/bin/env python3
"""Inspect employee PNGs without changing their pixels or files. Requires Pillow."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, UnidentifiedImageError


def inspect(path: Path) -> dict[str, object]:
    errors: list[str] = []
    try:
        data = path.read_bytes()
        with Image.open(path) as image:
            image.load()
            width, height = image.size
            if image.format != "PNG":
                errors.append("Expected PNG format.")
            if width != height or width < 512:
                errors.append("Expected a square canvas of at least 512 pixels.")
            if len(data) > 1_000_000:
                errors.append("Exceeds Symphony's 1 MB custom-image budget.")
            alpha = image.convert("RGBA").getchannel("A")
            alpha_range = alpha.getextrema()
            if alpha_range[0] != 0 or alpha_range[1] == 0:
                errors.append("Expected both transparent background and visible artwork.")
            corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
            if any(alpha.getpixel(point) != 0 for point in corners):
                errors.append("Every canvas corner must be transparent.")
            return {
                "path": str(path),
                "ok": not errors,
                "width": width,
                "height": height,
                "bytes": len(data),
                "alpha_range": alpha_range,
                "artwork_bounds": alpha.getbbox(),
                "sha256": hashlib.sha256(data).hexdigest(),
                "errors": errors,
            }
    except (OSError, UnidentifiedImageError, Image.DecompressionBombError) as error:
        return {"path": str(path), "ok": False, "errors": [str(error)]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", type=Path, nargs="+")
    args = parser.parse_args()
    reports = [inspect(path) for path in args.images]
    ok = all(report["ok"] for report in reports)
    print(json.dumps({"ok": ok, "images": reports}, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
