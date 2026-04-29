# Privacy Policy — Vibe Doc

**Effective:** 2026-04-28
**Plugin:** vibe-doc (npm: `@esthernandez/vibe-doc`)
**Author:** 626Labs LLC

## Summary

Vibe Doc collects no telemetry, runs no analytics, and transmits no
personal data. Everything the plugin produces lives on your local
machine.

## What the plugin reads and writes

All on your local filesystem:

- **Your project's source files** — Vibe Doc reads files in the project
  directory you run it against to inventory artifacts, classify the
  project type, and identify documentation gaps. Read-only on source
  files; writes only happen in the locations below.
- `.vibe-doc/state.json` — the per-project scan output (classification,
  artifact inventory, gap report). Written into the project directory you
  ran the scan on. Local only.
- **Generated documentation** — when you opt into doc generation, the
  produced `.md` files (runbook, threat-model, ADRs, etc.) are written
  into the project's `docs/` directory or wherever you point them. Local
  only.
- `~/.claude/profiles/builder.json` — the unified builder profile (shared
  with other 626Labs plugins). Vibe Doc reads it for persona /
  preferences, and updates the `plugins.vibe-doc` namespace with
  scan-completion metadata (last scan project, scan count, last
  classification). Local only.

## What the plugin transmits

One class of outbound network call: **`update-notifier`** checks the
public npm registry for newer versions of `@esthernandez/vibe-doc` and
displays a one-line "update available" banner if one exists. This is the
same kind of call that any npm-installed CLI with `update-notifier` makes
— your machine asks npm's public registry whether you're behind. 626Labs
does not operate the npm registry and does not receive any data from
this call.

## What the plugin does NOT do

- No telemetry, no usage analytics, no install counters, no first-run
  pings.
- No personal data collection of any kind.
- No third-party sharing, advertising, or tracking.
- No remote configuration — the plugin's behavior is fully determined by
  the SKILL files shipped in the release you installed.
- No exfiltration of your project contents. The classifier and gap
  analyzer run entirely in the local Node.js process.

## What about the LLM that calls these skills?

Vibe Doc's skills are loaded by Claude Code (or a compatible plugin
host). The host sends parts of the skill instructions and the
conversation context to Anthropic's API to drive the agent. **That
traffic is governed by Anthropic's privacy policy, not this one.** Vibe
Doc itself does not send any data to Anthropic or anywhere else; the
plugin host is the entity making those API calls on your behalf.

## Contact

Questions or concerns: open an issue at
[github.com/estevanhernandez-stack-ed/Vibe-Doc/issues](https://github.com/estevanhernandez-stack-ed/Vibe-Doc/issues).

## Changes

If we ever change what the plugin reads, writes, or transmits, this file
will be updated and a corresponding CHANGELOG entry will reference the
change. Versioned by the same release tag as the plugin.
