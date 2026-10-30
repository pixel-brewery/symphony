#!/usr/bin/env python3
"""Regression coverage for portable skill archive bytes and checkout inputs."""

from __future__ import annotations

import io
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path, PurePath
from unittest.mock import patch

from package_skills import archive_bytes


def windows_path_less_than(left: PurePath, right: PurePath) -> bool:
    """Model Windows' case-insensitive component comparison on any test host."""
    return tuple(part.lower() for part in left.parts) < tuple(part.lower() for part in right.parts)


class PortableSkillArchiveTests(unittest.TestCase):
    def test_unix_and_windows_builders_create_identical_bytes_and_metadata(self) -> None:
        # arrange
        with tempfile.TemporaryDirectory(prefix="portable skills ") as directory:
            skill = Path(directory) / "fixture-skill"
            (skill / "references").mkdir(parents=True)
            (skill / "SKILL.md").write_bytes(b"# Portable fixture\n")
            (skill / "references" / "workflow.md").write_bytes(b"Keep LF source bytes.\n")

            # act: exercise ZipInfo's real platform-dependent initialization.
            with patch("zipfile.sys.platform", "linux"):
                unix = archive_bytes(skill)
            with patch("zipfile.sys.platform", "win32"):
                windows = archive_bytes(skill)

        # assert: both the root directory and every file retain canonical metadata.
        self.assertEqual(windows, unix)
        with zipfile.ZipFile(io.BytesIO(windows)) as archive:
            self.assertEqual(len(archive.infolist()), 3)
            for entry in archive.infolist():
                self.assertEqual(entry.create_system, 3)
                self.assertEqual(entry.date_time, (1980, 1, 1, 0, 0, 0))
                self.assertEqual(entry.external_attr, (0o755 if entry.is_dir() else 0o644) << 16)

    def test_archive_order_uses_case_sensitive_components_on_windows(self) -> None:
        # arrange: uppercase names and directory prefixes distinguish both ordering pitfalls.
        with tempfile.TemporaryDirectory(prefix="skill path ordering ") as directory:
            skill = Path(directory) / "fixture-skill"
            files = ["SKILL.md", "agents/openai.yaml", "dir/workflow.md", "dir.md"]
            for relative in files:
                path = skill / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"Portable source.\n")
            native = archive_bytes(skill)

            # act: exercise the filesystem path comparator as well as ZipInfo's platform default.
            with patch("zipfile.sys.platform", "win32"), patch.object(PurePath, "__lt__", windows_path_less_than):
                windows = archive_bytes(skill)

        # assert: retain POSIX component ordering, including dir/file before dir.md.
        self.assertEqual(windows, native)
        with zipfile.ZipFile(io.BytesIO(windows)) as archive:
            self.assertEqual(archive.namelist(), ["fixture-skill/", *[f"fixture-skill/{name}" for name in files]])

    def test_existing_canonical_archive_does_not_change_on_windows(self) -> None:
        # arrange
        root = Path(__file__).resolve().parents[2]
        expected = (root / ".agents" / "packages" / "maintain-i18n.skill").read_bytes()

        # act
        with patch("zipfile.sys.platform", "win32"), patch.object(PurePath, "__lt__", windows_path_less_than):
            actual = archive_bytes(root / ".agents" / "skills" / "maintain-i18n")

        # assert
        self.assertEqual(actual, expected)

    def test_windows_style_git_checkout_keeps_lf_sources_and_binary_archives(self) -> None:
        # arrange: isolate all Git writes in a test-owned repository, without making a commit.
        root = Path(__file__).resolve().parents[2]
        git = shutil.which("git")
        if not git:
            self.fail("The checkout regression requires the repository Git toolchain.")
        with tempfile.TemporaryDirectory(prefix="skill checkout ") as directory:
            fixture = Path(directory)
            payloads = {
                fixture / ".agents" / "skills" / "fixture-skill" / "SKILL.md": b"# Skill source\n\nKeep deterministic input.\n",
                fixture / "src" / "example.ts": b"export const ready = true;\n",
                fixture / "settings.json": b'{ "enabled": true }\n',
                # Text-like bytes deliberately require the explicit binary rule to preserve CRLF.
                fixture / ".agents" / "packages" / "fixture-skill.skill": b"portable archive\r\n",
            }
            for path, payload in payloads.items():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(payload)
            (fixture / ".gitattributes").write_bytes((root / ".gitattributes").read_bytes())
            command = [git, "-c", "core.autocrlf=true", "-c", "core.eol=crlf"]
            subprocess.run([*command, "init", "--quiet"], cwd=fixture, capture_output=True, check=True)
            subprocess.run([*command, "add", "."], cwd=fixture, capture_output=True, check=True)
            for path in payloads:
                path.unlink()

            # act: reconstruct the working tree with CRLF conversion explicitly enabled.
            subprocess.run(
                [*command, "checkout-index", "--all", "--force"], cwd=fixture, capture_output=True, check=True
            )

            # assert: formatted source, text package inputs and binary package bytes stay unchanged.
            for path, payload in payloads.items():
                with self.subTest(path=path.relative_to(fixture)):
                    self.assertEqual(path.read_bytes(), payload)


if __name__ == "__main__":
    unittest.main()
