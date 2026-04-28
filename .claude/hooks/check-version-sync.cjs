#!/usr/bin/env node
// PostToolUse hook for vibe-doc.
// Warns if packages/vibe-doc/package.json#version drifts from
// packages/vibe-doc/.claude-plugin/plugin.json#version. Non-blocking.
// Wired into .claude/settings.json on Edit|Write|MultiEdit.

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const filePath = (payload?.tool_response?.filePath || payload?.tool_input?.file_path || '').replace(/\\/g, '/');
    const isPkg = /(^|\/)packages\/vibe-doc\/package\.json$/.test(filePath);
    const isPlugin = /(^|\/)packages\/vibe-doc\/\.claude-plugin\/plugin\.json$/.test(filePath);
    if (!isPkg && !isPlugin) {
      process.exit(0);
    }
    const repoRoot = path.resolve(__dirname, '..', '..');
    const pkgPath = path.join(repoRoot, 'packages', 'vibe-doc', 'package.json');
    const pluginPath = path.join(repoRoot, 'packages', 'vibe-doc', '.claude-plugin', 'plugin.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
    if (pkg.version !== plugin.version) {
      const msg =
        `Version drift detected after edit:\n` +
        `  packages/vibe-doc/package.json:               ${pkg.version}\n` +
        `  packages/vibe-doc/.claude-plugin/plugin.json: ${plugin.version}\n` +
        `These must stay synced (precedent: commit 8b8d71f). Update the lagging file.`;
      process.stdout.write(JSON.stringify({
        systemMessage: msg,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: msg
        }
      }));
    }
  } catch {
    // fail silently — guardrail, not a security boundary
  }
  process.exit(0);
});
