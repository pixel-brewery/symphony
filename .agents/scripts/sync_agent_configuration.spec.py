#!/usr/bin/env python3
"""Regression coverage for the cross-platform agent projection formatter."""

from __future__ import annotations

import os
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sync_agent_configuration import (
    claude_files,
    format_content,
    render_claude_mcp_config,
    render_codex_config,
    render_mosaik_client_files,
    render_opencode_config,
)


class CatalogConnectionTests(unittest.TestCase):
    def test_additional_clients_receive_only_the_same_local_mosaik_bin(self) -> None:
        root = Path(__file__).resolve().parents[2]
        servers = {
            "nx": {"type": "stdio", "command": "npx", "args": ["nx", "mcp"]},
            "mosaik": {"type": "stdio", "command": "yarn", "args": ["exec", "mosaik-mcp"]},
        }
        projected = render_mosaik_client_files(root, servers)
        self.assertEqual(set(projected), {root / ".github/mcp.json", root / ".cursor/mcp.json", root / ".gemini/settings.json"})
        local = {"command": "yarn", "args": ["exec", "mosaik-mcp"]}

        github = json.loads(projected[root / ".github/mcp.json"])
        self.assertEqual(github, {"mcpServers": {"mosaik": {"type": "stdio", **local, "tools": ["*"]}}})
        cursor = json.loads(projected[root / ".cursor/mcp.json"])
        self.assertEqual(cursor, {"mcpServers": {"mosaik": local}})
        gemini = json.loads(projected[root / ".gemini/settings.json"])
        self.assertEqual(gemini, {
            "context": {"fileName": ["AGENTS.md", "GEMINI.md"]},
            "mcpServers": {"mosaik": {**local, "cwd": ".", "timeout": 60000}},
        })

    def test_additional_clients_refuse_a_remote_or_malformed_mosaik_definition(self) -> None:
        root = Path(__file__).resolve().parents[2]
        with self.assertRaisesRegex(ValueError, "local stdio"):
            render_mosaik_client_files(root, {"mosaik": {"type": "http", "url": "https://example.invalid/mcp"}})
        with self.assertRaisesRegex(ValueError, "string arguments"):
            render_mosaik_client_files(root, {"mosaik": {"type": "stdio", "command": "yarn", "args": "exec mosaik-mcp"}})

    def test_clients_launch_one_preinstalled_local_mosaik_bin(self) -> None:
        servers = {
            "nx": {"type": "stdio", "command": "npx", "args": ["nx", "mcp"]},
            "mosaik": {
                "type": "stdio",
                "command": "yarn",
                "args": ["exec", "mosaik-mcp"],
                "cwd": "${workspaceFolder}",
            },
        }

        codex = render_codex_config(servers)
        mosaik = codex.split('[mcp_servers."mosaik"]', 1)[1].split("[features]", 1)[0]
        self.assertIn('command = "yarn"', mosaik)
        self.assertIn('args = [ "exec", "mosaik-mcp" ]', mosaik)
        self.assertIn('cwd = "."', mosaik)
        self.assertIn("startup_timeout_sec = 30", mosaik)
        self.assertIn("tool_timeout_sec = 60", mosaik)
        self.assertNotIn("url =", mosaik)
        self.assertNotIn("mosaik-offline", codex)

        claude = json.loads(render_claude_mcp_config(servers, {"nx"}))["mcpServers"]
        self.assertEqual(claude, {"mosaik": {"type": "stdio", "command": "yarn", "args": ["exec", "mosaik-mcp"]}})

        opencode = json.loads(render_opencode_config(servers))["mcp"]
        self.assertEqual(set(opencode), {"nx", "mosaik"})
        self.assertEqual(opencode["mosaik"], {"type": "local", "command": ["yarn", "exec", "mosaik-mcp"], "enabled": True, "timeout": 30000})


class AgentConfigurationFormatterTests(unittest.TestCase):
    def test_claude_mirror_retains_explicit_skill_derivation(self) -> None:
        with tempfile.TemporaryDirectory(prefix="inherited mirror ") as directory:
            root = Path(directory)
            skill = root / ".agents/skills/derived/SKILL.md"
            skill.parent.mkdir(parents=True)
            skill.write_text("---\nname: derived\ndescription: Local fixture.\nmetadata:\n  inherits: architect\n---\n\nRead [base](../architect/SKILL.md).\n")

            projected = claude_files(root, [], {})[root / ".claude/skills/derived/SKILL.md"]

            self.assertIn("metadata:\n  inherits: architect\n---", projected)
            self.assertIn("Read [base](../architect/SKILL.md).", projected)
            self.assertEqual(skill.read_text().count("metadata:"), 1)

    @classmethod
    def setUpClass(cls) -> None:
        cls.root = Path(__file__).resolve().parents[2]
        cls.node = shutil.which("node.exe" if os.name == "nt" else "node")
        if not cls.node:
            raise RuntimeError("The formatter regression suite requires the repository Node.js toolchain.")

    def test_formats_on_windows_without_a_yarn_shim_and_preserves_unicode_and_spaced_paths(self) -> None:
        # arrange: Windows Yarn shims need not be executable by Python at all.
        path = self.root / "generated configuration with spaces" / "settings.json"
        content = '{"enabled":true,"name":"Symphony → Codex 🎼"}'

        def resolve_native_node(command: str) -> str | None:
            # Resolve the native executable even if a command shim is earlier on PATH.
            return self.node if command == "node.exe" else None

        with (
            patch.dict(os.environ, {"PATH": ""}),
            patch("sync_agent_configuration.sys.platform", "win32"),
            patch("sync_agent_configuration.shutil.which", side_effect=resolve_native_node),
        ):
            # act: use the real installed Node and Prettier CLI, including stdin and parser inference.
            result = format_content(self.root, path, content)

        # assert
        self.assertEqual(result, '{ "enabled": true, "name": "Symphony → Codex 🎼" }\n')

    def test_invalid_generated_content_fails_instead_of_bypassing_formatting(self) -> None:
        # arrange
        path = self.root / "generated configuration with spaces" / "settings.json"
        with patch.dict(os.environ, {"PATH": ""}), patch("sync_agent_configuration.shutil.which", return_value=self.node):
            # act + assert
            with self.assertRaisesRegex(RuntimeError, "Prettier failed.*SyntaxError"):
                format_content(self.root, path, '{"enabled":}')

    def test_missing_node_reports_the_required_tool(self) -> None:
        # arrange
        with patch("sync_agent_configuration.shutil.which", return_value=None):
            # act + assert
            with self.assertRaisesRegex(FileNotFoundError, "Node.js is required"):
                format_content(self.root, self.root / "settings.json", "{}")

    def test_missing_installed_formatter_reports_the_dependency_prerequisite(self) -> None:
        # arrange
        with tempfile.TemporaryDirectory(prefix="agent formatting ") as directory:
            root = Path(directory)
            with patch("sync_agent_configuration.shutil.which", return_value=self.node):
                # act + assert
                with self.assertRaisesRegex(FileNotFoundError, "Prettier CLI is missing.*yarn install --immutable"):
                    format_content(root, root / "settings.json", "{}")


if __name__ == "__main__":
    unittest.main()
