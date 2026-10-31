#!/usr/bin/env python3
"""Render motion evidence from the exact validated employee atlas, without drawing poses."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

ROWS = {
    # FLAMOX/Symphony slows the breathing row by six; preserve runtime timing.
    "idle": [duration * 6 for duration in (280, 110, 110, 140, 140, 320)],
    "running-right": [120] * 7 + [220],
    "running-left": [120] * 7 + [220],
    "waving": [140] * 3 + [280],
    "jumping": [140] * 4 + [280],
    "failed": [140] * 7 + [240],
    "waiting": [150] * 5 + [260],
    "running": [120] * 5 + [220],
    "review": [150] * 5 + [280],
}


def panel(frame: Image.Image, label: str, time_ms: int) -> Image.Image:
    image = Image.new("RGBA", (384, 304), (248, 248, 248, 255))
    image.alpha_composite(frame, (96, 48))
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=18)
    draw.text((16, 12), label, fill=(25, 25, 25), font=font)
    draw.text((16, 276), f"{time_ms / 1000:.2f}s", fill=(60, 60, 60), font=font)
    return image.convert("RGB")


def gif(sequence: list[tuple[Image.Image, int]], path: Path) -> None:
    sequence[0][0].save(path, save_all=True, append_images=[frame for frame, _duration in sequence[1:]], duration=[duration for _frame, duration in sequence], loop=0, disposal=2, optimize=False)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--atlas", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    atlas_path = Path(args.atlas).resolve()
    output = Path(args.output_dir).resolve()
    output.mkdir(parents=True, exist_ok=True)
    with Image.open(atlas_path) as opened:
        if opened.size != (1536, 2288):
            raise SystemExit("A complete validated v2 atlas is required")
        atlas = opened.convert("RGBA")
    cells = {}
    for row, (state, durations) in enumerate(ROWS.items()):
        destination = output / "frames" / state
        destination.mkdir(parents=True, exist_ok=True)
        cells[state] = []
        for column in range(len(durations)):
            cell = atlas.crop((column * 192, row * 208, (column + 1) * 192, (row + 1) * 208))
            cell.save(destination / f"{column:02d}.png")
            cells[state].append(cell)
    bridge = Path(__file__).with_name("codex_sprite_tool.py")
    subprocess.run([sys.executable, str(bridge), "render_animation_previews", "--frames-root", str(output / "frames"), "--output-dir", str(output / "states")], check=True)

    story = []
    timings = []
    elapsed = 0
    for state, durations in ROWS.items():
        for _cycle in range(2):
            for index, duration in enumerate(durations):
                story.append((panel(cells[state][index], state, elapsed), duration))
                timings.append({"state": state, "frame": index, "time_ms": elapsed, "duration_ms": duration})
                elapsed += duration
    gif(story, output / "all-states.gif")

    transition = []
    time_ms = 0
    for state in ("idle", "jumping", "idle"):
        for index, duration in enumerate(ROWS[state]):
            transition.append((panel(cells[state][index], state, time_ms), duration))
            time_ms += duration
    gif(transition, output / "idle-jump-idle.gif")

    looks = []
    for index in range(16):
        row, column = 9 + index // 8, index % 8
        cell = atlas.crop((column * 192, row * 208, (column + 1) * 192, (row + 1) * 208))
        looks.append((panel(cell, f"look {index * 22.5:05.1f} degrees", index * 180), 180))
    gif(looks, output / "ordered-looks.gif")

    stills = []
    for state, desired in (("idle", 0), ("jumping", 2), ("running", 2), ("review", 2)):
        index = next(i for i, item in enumerate(timings) if item["state"] == state and item["frame"] == desired)
        name = f"still-{state}-{timings[index]['time_ms']}ms.png"
        story[index][0].save(output / name)
        stills.append({**timings[index], "path": name})

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("State GIFs and stills were saved; ffmpeg is required for the combined MP4 preview")
    movie_frames = output / "movie-frames"
    movie_frames.mkdir(exist_ok=True)
    concat = []
    for index, (frame, duration) in enumerate(story):
        path = movie_frames / f"{index:04d}.png"
        frame.save(path)
        escaped = str(path).replace("'", "'\\''")
        concat.extend([f"file '{escaped}'", f"duration {duration / 1000:.3f}"])
    concat.append(concat[-2])
    list_path = output / "motion.ffconcat"
    list_path.write_text("\n".join(concat) + "\n")
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(list_path), "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-movflags", "+faststart", str(output / "all-states.mp4")], check=True)
    report = {"atlas": str(atlas_path), "duration_ms": elapsed, "frames": timings, "stills": stills, "mp4": "all-states.mp4", "gif": "all-states.gif", "looks": "ordered-looks.gif", "transition": "idle-jump-idle.gif"}
    (output / "motion-manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"output_dir": str(output), "duration_ms": elapsed, "stills": len(stills)}))


if __name__ == "__main__":
    main()
