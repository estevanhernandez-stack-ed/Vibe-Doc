<!-- markdownlint-disable MD024 -->
<!-- Keep-a-Changelog uses duplicate "Added / Changed / Fixed" headings per version by design. -->

# Changelog

All notable changes to Vibe Doc are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.1] — 2026-04-28 — Submission-readiness polish

Patch release. Metadata-only. No behavioral change.

### Added

- **Root `LICENSE` file** with the MIT text (©2026 626Labs LLC). The npm `package.json` already declared MIT; this ships the actual license file alongside the source distribution.
- **`PRIVACY.md`** at the repo root — explicit "no telemetry, no analytics, no third-party sharing" statement plus the full read/write/transmit surface (project files, `.vibe-doc/state.json`, `~/.claude/profiles/builder.json`, `update-notifier`'s npm version check).
- **`CHANGELOG.md`** at the repo root — Keep-a-Changelog format, backfilled from prior releases.
- **`plugin.json` metadata fields** required for marketplace discovery: `homepage`, `repository`, `license`, `keywords`, and `author.url`. Brings the manifest in line with the [official Claude Code plugin schema](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema) so the plugin shows up cleanly in marketplace searches and discovery views.

### Notes

- Submission-readiness pass for the official Claude Code marketplace at [claude.ai/settings/plugins/submit](https://claude.ai/settings/plugins/submit). v0.7.1 is the tag the submission references.

## [0.7.0] — 2026-04-28 — `/vibe-doc:evolve` (Level-3 framework parity)

Vibe Doc gains its reflective Level-3 self-improvement loop, matching the framework parity already shipped in Vibe Cartographer and Vibe Test.

### Added

- **`/vibe-doc:evolve`** — reads the plugin's friction log + session logs from the last 30 days, weights findings with Pattern #14 absence-of-friction inference, and writes proposed SKILL edits to `packages/vibe-doc/proposed-changes.md`. Never auto-applies — builder reviews and merges manually.
- **`friction-logger`** internal SKILL — append-only friction capture invoked by every command at the trigger points listed in the friction-triggers reference doc.
- **`session-logger`** internal SKILL — two-phase append-only session log mirroring Cart's pattern (sentinel entry at command start, terminal entry at command end, paired by sessionUUID).
- **JSON schemas** for `friction.schema.json` and `session-log.schema.json` under `skills/guide/schemas/`.

### Changed

- `proposed-changes.md` is now the canonical input for the next `/evolve` cycle. Existing entries from prior manual triage runs are preserved and re-ingested.

## [0.6.0] — 2026-04-28 — Manual evolution triage (10/11 findings applied)

Manual evolution pass driven by a real `/vibe-doc:scan` walkthrough on the `vibe-plugins` aggregated marketplace. Ten of eleven proposed-changes findings landed as code edits; the eleventh (the `/evolve` command itself) shipped as v0.7.0.

### Added

- Intake interview now includes `Claude Code plugin / agent extension / developer tool` in Q2 (purpose) and `plugin marketplace / extension ecosystem` in Q5 (architecture).
- Intake answers persist to `.vibe-doc/intake-profile.json` so they actually survive into state.json (was previously dropped).
- New reference docs `classification-taxonomy.md` and `documentation-matrix.md` under `skills/guide/references/`.
- `marketplace.json` recognized as the api-spec breadcrumb for `AggregatedMarketplace` context.
- `PublicOpenSource` context modifier — compound signal (LICENSE + Claude plugin shape) — wired through scoring engine, signals, matrix, and llm-prompt.

### Changed

- `ClaudeCodePlugin` baseline tier for `ThreatModel` bumped Optional → Recommended.
- `pickSecondary()` classifier now uses a 30%-of-primary threshold to suppress weak secondary categories (e.g. WebApplication false positives).

### Fixed

- `gitStats.contributors: 0` on legitimate repos — replaced broken `--format=%an` second-call with `commit.author_name` from the existing `log.all` walk.
- `gitStats.mainLanguages: []` on multi-language and Windows repos — non-recursive glob in code-scanner + Windows-only path-split in language-detect, both root causes paired and fixed.
- `install-guide` matcher now uses strict file-name matching with documented expected file locations surfaced in gap rationales.

## [0.5.0] — 2026-04-26 — Pattern #13 ecosystem-aware composition

### Added

- Pattern #13 (ecosystem-aware composition) integration: Vibe Doc detects when sibling 626Labs plugins are present and defers to them where they own the surface (e.g., test plans defer to Vibe Test's audit when Vibe Test is installed).

## [0.4.0] — 2026-04-22 — CLI polish + renderer fallback fix

### Added

- `--verbose` flag on the CLI for diagnostic output during scan / generate / check.

### Fixed

- Renderer fallback when the docx writer fails to find templates in certain global-install layouts.

## [0.3.3] — 2026-04-21 — Unified profile write-back

### Added

- Scan and generate commands now write back to `~/.claude/profiles/builder.json` after a successful run, updating the `plugins.vibe-doc` namespace with scan count, last project, last classification, and timestamp.

## [0.3.2] — 2026-04-19 — update-notifier + ecosystem stats

### Added

- `update-notifier` integration so users see a one-line banner when a newer version of the npm package is available.
- Ecosystem stats script (separate from npm download tracking) capturing per-plugin scan counts.

## [0.3.1] — 2026-04-18 — Inner README sync + install paths

### Changed

- Inner `packages/vibe-doc/README.md` synced to npm with marketplace install docs so users running `npm view @esthernandez/vibe-doc` see the same install paths as the GitHub README.

### Added

- All three install paths (Claude Code marketplace, npm, upload `.plugin`) documented in the README.
- `.claude-plugin/marketplace.json` so Vibe-Doc installs via the Claude Desktop marketplace flow directly from this repo (canary channel).
