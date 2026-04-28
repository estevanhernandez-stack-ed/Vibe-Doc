# /vibe-doc:evolve — Build Plan

> Compressed Cart-style planning artifact (scope + spec + checklist in one doc) for porting Cart's `/evolve` reflective loop into vibe-doc. Written autonomously by The Architect on 2026-04-28 after the proposed-changes.md triage shipped as v0.6.0. Finding #11 from that triage was deferred specifically to be the headline of v0.7.0.

## Scope

**What we're building.** The Level-3 reflective loop for vibe-doc — the same pattern Cart and Vibe Test ship. The plugin reads its own session logs and friction signals, weights them, and writes proposed SKILL / classifier / matrix improvements to `packages/vibe-doc/proposed-changes.md`. Nothing auto-applies.

**Why now.** Vibe Doc was the only sibling plugin without L3 parity. The proposed-changes.md file already exists (we just used it manually to ship v0.6.0); without `/evolve`, every triage cycle requires a human to author it. With `/evolve`, the loop closes — the plugin observes its own friction during scans/generations/checks and proposes its own next triage round.

**In scope:**
- `scripts/atomic-append-jsonl.js`, `scripts/atomic-write-json.js` (zero-dep Node 18+ helpers ported verbatim from app-readinessplugin)
- `skills/guide/schemas/friction.schema.json`, `skills/guide/schemas/session-log.schema.json` (Draft-07, namespace adapted to vibe-doc)
- `skills/guide/references/friction-triggers.md` (per-command trigger map for scan/generate/check)
- `skills/friction-logger/SKILL.md` (internal — log() + detect_orphans())
- `skills/session-logger/SKILL.md` (internal — start() + end())
- `skills/evolve/SKILL.md` (the L3 reflective command itself)
- `commands/evolve.md` (slash command surface)
- Friction-trigger wiring into `skills/scan/SKILL.md` + `skills/generate/SKILL.md`
- CLAUDE.md + SKILLS_README.md updates

**Out of scope (defer to later releases):**
- Friction calibration (Cart 1.5's false-positive marking) — adds a second JSONL stream and a `/reflect`-time check-in. Not load-bearing for v0.7.0.
- `last_seen_complements` snapshot on the unified profile — Cart-specific telemetry for Pattern #4 environment-shift detection. Vibe Doc doesn't need it yet; add when a real use-case shows up.
- `reconnect` procedure (process-notes.md backfill) — orchestrator-context support. Edge case for v1.
- `/vibe-doc:friction` and `/vibe-doc:vitals` companion commands — Cart has them; vibe-doc can grow into them later if the friction stream gets noisy.

## Spec

### Data paths

| Concern | Path |
|---|---|
| Friction log | `~/.claude/plugins/data/vibe-doc/friction.jsonl` |
| Session logs | `~/.claude/plugins/data/vibe-doc/sessions/<YYYY-MM-DD>.jsonl` |
| Proposed changes (output) | `<repo>/packages/vibe-doc/proposed-changes.md` (canonical location per project CLAUDE.md) |
| Plugin manifest | `<repo>/packages/vibe-doc/.claude-plugin/plugin.json` |

### Schema deltas from Cart

Both schemas port mostly verbatim. Vibe-doc-specific changes:

- `session-log.schema.json` — `plugin` const flips `vibe-cartographer` → `vibe-doc`. Drop the `mode` field (vibe-doc has no learner/builder dichotomy). Keep `persona`.
- `friction.schema.json` — `$id` updated to vibe-doc; `plugin_version` description references vibe-doc's `.claude-plugin/plugin.json`. Friction-type enum stays identical (the seven canonical types are framework-level, not plugin-level).

### Friction triggers (vibe-doc surface)

| Command | Trigger | Friction type | Confidence |
|---|---|---|---|
| `/scan` | User declines an offered Pattern #13 complement (e.g., `context7` for tech-stack lookups) | `complement_rejected` | high |
| `/scan` | User skips the intake interview when classification confidence is low | `default_overridden` | medium |
| `/scan` | User overrides the auto-classification result at the confirmation checkpoint | `artifact_rewritten` | high |
| `/scan` | User runs `/generate` or `/check` before the scan terminal entry lands | `sequence_revised` | medium |
| `/generate` | User declines a Pattern #13 complement (typically `context7` for library refs) | `complement_rejected` | high |
| `/generate` | User overrides the recommended tier for a doc (asks for Optional when Required is the unsatisfied gap) | `default_overridden` | medium |
| `/generate` | User rewrites >50% of a generated doc within the same session | `artifact_rewritten` | medium |
| `/generate` | User skips Required-tier gaps and goes straight to Optional | `sequence_revised` | low |
| `/check` | (none) | — | `/check` is CI-style pass/fail; no interactive friction surface in v0.7.0. |

Universal triggers (apply to every command): `repeat_question` (with quoted-prior gate), `rephrase_requested` (with quoted-prior gate), `command_abandoned` (emitted by `detect_orphans()` only).

### `/evolve` flow (compressed from Cart's)

1. Announce + frame ("Reading session history from `~/.claude/plugins/data/vibe-doc/sessions/`…").
2. Analyze: read friction.jsonl, weight entries (high=1.0, medium=0.6, low=0.3), group by command/friction-type, surface 2–5 patterns. Pattern #14 absence-of-friction inference applies — runs that completed without friction are wins.
3. Classify each observation as Plugin / Personal / Community track (Cart's three-track rubric).
4. Present each finding with proposed track. Stop and invite reframing (two prompts: "is the read accurate?" + "is the track right?"). Today's triage memory says: when Este pre-vets, skip the two-prompt dance.
5. Propose a concrete diff per finding. `[apply]` / `[modify]` / `[reject]` / `[skip]`.
6. Apply on yes. Plugin-track changes write to vibe-doc's own files. Personal-track writes to `plugins.vibe-doc.*` on `~/.claude/profiles/builder.json`. Community-track writes to `~/.claude/plugins/data/vibe-doc/community-signals.jsonl` only on per-observation explicit opt-in.
7. Append the run summary as a new section in `packages/vibe-doc/proposed-changes.md` (idempotent — preserves existing entries' triage status).
8. Log a session-log terminal entry with this `/evolve` run's outcome.

### Pattern #11 namespace isolation

Every write this build adds honors the rule: vibe-doc only writes inside `plugins.vibe-doc.*` on the unified profile. Never `shared.*`. Never `plugins.<other-name>.*`. Defensive invariant check before every profile write.

## Checklist

1. Write `scripts/atomic-append-jsonl.js` and `scripts/atomic-write-json.js`.
2. Write `skills/guide/schemas/friction.schema.json` + `session-log.schema.json`.
3. Write `skills/guide/references/friction-triggers.md` scoped to scan/generate/check.
4. Write `skills/friction-logger/SKILL.md` (port from Cart with vibe-doc paths).
5. Write `skills/session-logger/SKILL.md` (port + simplify — drop `mode`, drop `last_seen_complements` snapshot for v1).
6. Write `skills/evolve/SKILL.md` (port + adapt — read vibe-doc's data paths, write to packages/vibe-doc/proposed-changes.md).
7. Write `commands/evolve.md` (slash command stub).
8. Wire `session-logger.start()` + `end()` and friction-logger calls into `skills/scan/SKILL.md` + `skills/generate/SKILL.md` at the triggers above. `/check` left untouched.
9. Update `CLAUDE.md` (project keystone) — add the new SKILLs to the file map. Update `SKILLS_README.md` — note the L3 reflective loop.
10. Type-check (`npm run type-check`). Bump version to 0.7.0 in both `package.json` and `.claude-plugin/plugin.json`. Run `npm run build`. Commit with `v0.7.0: /evolve framework parity` style.

## /reflect (post-build summary) — to be appended below after build completes
