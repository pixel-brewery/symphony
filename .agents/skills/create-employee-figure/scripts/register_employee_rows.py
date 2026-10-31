#!/usr/bin/env python3
"""Fit extracted pixels with one transform per row, preserving airborne displacement."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import statistics

from PIL import Image

STATES = ("idle", "running-right", "running-left", "waving", "jumping", "failed", "waiting", "running", "review")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frames-root", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--json-out", required=True)
    args = parser.parse_args()
    source = Path(args.frames_root)
    output = Path(args.output_dir)
    rows = []
    for state in STATES:
        paths = sorted((source / state).glob("*.png"))
        if not paths:
            raise SystemExit(f"Missing extracted row: {state}")
        bounds = []
        for path in paths:
            with Image.open(path) as opened:
                if opened.size != (192, 208):
                    raise SystemExit(f"Invalid extracted cell: {path}")
                bound = opened.convert("RGBA").getchannel("A").point(lambda alpha: 255 if alpha > 16 else 0).getbbox()
            if not bound:
                raise SystemExit(f"Empty extracted frame: {path}")
            bounds.append(bound)
        rows.append({"state": state, "paths": paths, "bounds": bounds, "body_height": statistics.median(b[3] - b[1] for b in bounds)})

    # The jump's complete vertical range constrains the shared body size. Fit each
    # row with one transform, never resize or register individual poses separately.
    target_height = min(row["body_height"] for row in rows)
    report = []
    for row in rows:
        scale = min(1.0, target_height / row["body_height"])
        baseline = max(bound[3] for bound in row["bounds"])
        width, height = round(192 * scale), round(208 * scale)
        offset = (round((192 - width) / 2), 200 - round(baseline * scale))
        destination = output / row["state"]
        destination.mkdir(parents=True, exist_ok=True)
        hashes = []
        for path in row["paths"]:
            with Image.open(path) as opened:
                fitted = opened.convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
            cell = Image.new("RGBA", (192, 208), (0, 0, 0, 0))
            cell.alpha_composite(fitted, offset)
            cell.save(destination / path.name)
            hashes.append(hashlib.sha256((destination / path.name).read_bytes()).hexdigest())
        report.append({"state": row["state"], "scale": scale, "offset": offset, "input_bounds": row["bounds"], "sha256": hashes})
    result = {"target_body_height": target_height, "baseline": 200, "transforms": report}
    target = Path(args.json_out)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"output_dir": str(output), "registration_report": str(target)}))


if __name__ == "__main__":
    main()
