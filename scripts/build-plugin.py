#!/usr/bin/env python3
"""
Build a Cowork-compatible .plugin file for Vibe Doc.

Vibe Doc is a dual-layer project: the CLI lives in packages/vibe-doc/
with dist/ + node_modules/ + src/ for the TypeScript build, and the
Claude Code plugin skill files live alongside it in the same package.
Cowork only needs the plugin surface: .claude-plugin/, skills/,
commands/, README, and package.json. It does not need dist/ or
node_modules/ — the CLI is a separate `npm install -g` concern.

See memory/reference_cowork_personal_plugin_format.md for the full spec.

Usage:
    python scripts/build-plugin.py

Output:
    bundles/vibe-doc-<version>.plugin
"""
import json
import os
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_ROOT = REPO_ROOT / "packages" / "vibe-doc"
BUNDLES_DIR = REPO_ROOT / "bundles"
# Cowork's personal plugin format excludes runtime/build artifacts.
EXCLUDE_DIRS = {
    "dist",
    "node_modules",
    "src",
    "scripts",
    "test",
    "__tests__",
    ".vscode",
    ".idea",
    "__pycache__",
    ".vibe-doc",
}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", "tsconfig.json"}


def read_version() -> str:
    """Read the plugin version from .claude-plugin/plugin.json."""
    manifest = PLUGIN_ROOT / ".claude-plugin" / "plugin.json"
    with open(manifest, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["version"]


def build_plugin(version: str) -> tuple[Path, int]:
    """Walk the plugin root and produce a .plugin zip file."""
    if not PLUGIN_ROOT.exists():
        raise FileNotFoundError(f"Plugin root not found: {PLUGIN_ROOT}")

    BUNDLES_DIR.mkdir(exist_ok=True)
    output = BUNDLES_DIR / f"vibe-doc-{version}.plugin"

    file_count = 0
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(PLUGIN_ROOT):
            # Prune excluded dirs so os.walk doesn't descend into them
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for name in files:
                if name in EXCLUDE_FILES:
                    continue
                full = Path(root) / name
                arcname = full.relative_to(PLUGIN_ROOT).as_posix()
                if any(c in arcname for c in (":", "*", "?", '"', "<", ">", "|")):
                    print(f"  SKIP (invalid chars): {arcname}", file=sys.stderr)
                    continue
                zipf.write(full, arcname)
                file_count += 1

    return output, file_count


def main() -> int:
    try:
        version = read_version()
    except Exception as e:
        print(f"ERROR: could not read plugin version: {e}", file=sys.stderr)
        return 1

    print(f"Building vibe-doc.plugin v{version}")
    print(f"  source: {PLUGIN_ROOT}")
    print(f"  excluded dirs: {', '.join(sorted(EXCLUDE_DIRS))}")

    try:
        output, count = build_plugin(version)
    except Exception as e:
        print(f"ERROR: build failed: {e}", file=sys.stderr)
        return 1

    size_kb = output.stat().st_size / 1024
    print(f"  output: {output}")
    print(f"  entries: {count}")
    print(f"  size: {size_kb:.1f} KB")
    print()
    print("Upload via Cowork/Claude Desktop: Personal plugins -> + -> Create plugin")
    print()
    print("NOTE: This produces the plugin-only bundle. The Vibe Doc CLI is")
    print("installed separately via: npm install -g @esthernandez/vibe-doc")
    return 0


if __name__ == "__main__":
    sys.exit(main())
