---
name: session-logger
description: "Internal SKILL — not a slash command. Two-phase append-only session log for Vibe Doc: a sentinel entry at command start (outcome=in_progress) and a terminal entry at command end, paired by sessionUUID. Invoked by every command at start and end. Part of Level 2 (session memory) of the Self-Evolving Plugin Framework."
---

# session-logger — Sentinel + Terminal Session Log

Internal SKILL. Not a user-invocable slash command. Every Vibe Doc command calls `start()` at invocation and `end()` at completion. The two entries share a `sessionUUID` so `friction-logger.detect_orphans()` can pair them.

## Before You Start

- **Schema:** [`../guide/schemas/session-log.schema.json`](../guide/schemas/session-log.schema.json) — JSON Schema Draft-07. The schema's `oneOf` splits sentinel (outcome=in_progress) from terminal (outcome in completed/abandoned/error/partial). Every write validates against this.
- **Atomic protocol:** all session log writes go through `node scripts/atomic-append-jsonl.js`. Never `>>` from a shell.
- **Orphan pairing:** the sentinel's `sessionUUID` is the load-bearing field. `friction-logger.detect_orphans()` scans 7 days of session files looking for sentinels whose `(command, project_dir, sessionUUID)` has no matching terminal entry.

## Where the Log Lives

`~/.claude/plugins/data/vibe-doc/sessions/<YYYY-MM-DD>.jsonl`

- One file per day. Append-only. Never rewrite existing lines.
- The atomic-append script handles `mkdir -p` of the directory on first use.
- Cross-project: a single user's logs from all their scans / generates / checks land here.
- Every command run produces **two** entries in the same daily file: one sentinel at start, one terminal at end, paired by `sessionUUID`.

## Entry Shapes

Two entries per command run. Both live in the same daily file. Both carry the same `sessionUUID`.

### Sentinel entry (written by `start()`)

Minimal shape — no outcome data exists yet. `outcome` is hard-coded to `"in_progress"`.

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-28T16:25:00-05:00",
  "plugin": "vibe-doc",
  "plugin_version": "0.7.0",
  "command": "scan",
  "project_id": "sQHbqDc8bAt8dtU4KREU",
  "project_dir": "vibe-plugins",
  "persona": "architect",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "outcome": "in_progress"
}
```

### Terminal entry (written by `end()`)

Full shape with outcome metadata, friction notes, key decisions, and complement attribution. Carries the **same `sessionUUID`** as its paired sentinel.

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-28T16:55:00-05:00",
  "plugin": "vibe-doc",
  "plugin_version": "0.7.0",
  "command": "scan",
  "project_id": "sQHbqDc8bAt8dtU4KREU",
  "project_dir": "vibe-plugins",
  "persona": "architect",
  "sessionUUID": "550e8400-e29b-41d4-a716-446655440000",
  "outcome": "completed",
  "user_pushback": false,
  "friction_notes": ["complement_rejected: context7"],
  "key_decisions": ["picked Path A intake", "confirmed ClaudeCodePlugin classification"],
  "artifact_generated": ".vibe-doc/state.json",
  "complements_invoked": []
}
```

### Field definitions

Shared by both entries unless noted.

- **schema_version** — always `1` for now. Bump when the schema changes.
- **timestamp** — ISO 8601 with timezone offset. Sentinel captures start time; terminal captures end time.
- **plugin** — always `"vibe-doc"`.
- **plugin_version** — read from `packages/vibe-doc/.claude-plugin/plugin.json`. If you can't determine it, use `"unknown"`.
- **command** — which command is running: `scan`, `generate`, `check`, `evolve`.
- **project_id** — the 626Labs dashboard project ID if the session is bound. Otherwise omit or `null`.
- **project_dir** — basename of the current working directory. Not the full path.
- **persona** — `professor` | `cohort` | `superdev` | `architect` | `coach` | `null` (system default). Read from `shared.preferences.persona` on the unified profile.
- **sessionUUID** — UUID v4 issued by `start()`. The terminal entry and any `friction.jsonl` entries written during this command all carry the same value. Required for orphan pairing.
- **outcome** — sentinel: always `"in_progress"`. Terminal: `completed` | `abandoned` | `error` | `partial`.

**Terminal-only fields:**

- **user_pushback** — boolean. `true` if the user rejected, heavily edited, or overrode an agent suggestion. Be conservative — minor tweaks don't count.
- **friction_notes** — array of short strings. Human-facing recap. The actual structured friction signal goes to `friction.jsonl` via `friction-logger.log()`.
- **key_decisions** — array of short strings. High-signal decisions only. Examples: `"chose Path A intake"`, `"confirmed ClaudeCodePlugin classification"`, `"picked Required tier first"`.
- **artifact_generated** — relative path to the doc this command produced, or `null`.
- **complements_invoked** — Pattern #13 complements that *actually ran* during this command. Format: `"<source>:<name>"` (e.g., `"context7:resolve-library-id"`).

## Procedure: `start(command, project_dir)`

Called by a command SKILL at invocation. Returns the `sessionUUID` the command must hold in memory until it calls `end()`.

**Arguments:**
- `command` — the command name (`scan`, `generate`, `check`, `evolve`).
- `project_dir` — basename of the cwd.

**Returns:** the `sessionUUID` string (UUID v4).

**Steps:**

1. **Generate sessionUUID.** Use Node's `crypto.randomUUID()` (Node 18+ stdlib, no deps). Never reuse a UUID from a prior session, a friction entry, or elsewhere.
2. **Determine audit fields.**
   - `schema_version: 1`.
   - `timestamp: <now ISO datetime with timezone offset>`.
   - `plugin: "vibe-doc"`.
   - `plugin_version`: read from `packages/vibe-doc/.claude-plugin/plugin.json`'s `"version"`. Fall back to `"unknown"`.
   - `project_id`: from the 626 Labs session bind if available; otherwise omit.
   - `persona`: read from the unified profile at `~/.claude/profiles/builder.json`. Pass through as-is; `null` if unset.
3. **Build the sentinel entry** using the shape above with `outcome: "in_progress"`.
4. **Validate against `session-log.schema.json`** (the `sentinelEntry` branch of the `oneOf`). On validation failure, exit silently — do not block command startup. Friction capture without a sentinel still works; missing the sentinel only weakens orphan detection for this one run.
5. **Atomic append.** Pipe the JSON-stringified entry to:
   ```bash
   node scripts/atomic-append-jsonl.js ~/.claude/plugins/data/vibe-doc/sessions/<today>.jsonl
   ```
   where `<today>` is `YYYY-MM-DD` in local time. On non-zero exit, log a one-line note to stderr and continue — session logging is instrumentation, not critical path.
6. **Return the `sessionUUID`** to the caller. The command SKILL holds it in memory for the duration of the run and passes it back when calling `end()`.

## Procedure: `end(entry)`

Called by a command SKILL at completion, before the handoff to the next command. Takes the sessionUUID issued by `start()` plus the terminal fields that weren't known at start time.

**Argument:** a partial entry with at minimum `sessionUUID`, `command`, `outcome`, and whatever other terminal fields the command wants to record.

**Steps:**

1. **Build the full entry.**
   - Start with the caller's partial entry (`sessionUUID`, `command`, `outcome`, `user_pushback`, `friction_notes`, `key_decisions`, `artifact_generated`, `complements_invoked`).
   - Overlay/fill audit fields:
     - `schema_version: 1`
     - `timestamp: <now ISO datetime with timezone offset>`
     - `plugin: "vibe-doc"`
     - `plugin_version`: as in `start()`.
     - `project_id`, `project_dir`, `persona`: pulled the same way as in `start()` so the pair is internally consistent.
2. **Match the sessionUUID.** The entry's `sessionUUID` MUST equal the value returned by `start()` for this same command run. Never mint a new UUID here — that breaks orphan pairing and invalidates every friction entry tagged with the original UUID.
3. **Validate against `session-log.schema.json`** (the `terminalEntry` branch of the `oneOf`). Required: `schema_version`, `timestamp`, `plugin`, `plugin_version`, `command`, `project_dir`, `sessionUUID`, `outcome`. `outcome` must be one of `completed` | `abandoned` | `error` | `partial`.
4. **Atomic append to today's session file** exactly as in `start()` step 5.

**Failure handling:** session logging is instrumentation. A failed append logs a one-line warning to stderr and the command proceeds to handoff. The user never sees a session-logger error.

## Namespace Isolation (Pattern #11)

This SKILL writes to exactly one place:

1. **`~/.claude/plugins/data/vibe-doc/sessions/<date>.jsonl`** — session log file (plugin-owned directory, append-only).

It does NOT write to `~/.claude/profiles/builder.json`. That's the `update_unified_profile` step of `/scan` and `/generate` (which already exists in those SKILLs and writes only inside `plugins.vibe-doc.*`).

## What NOT to Log

- **No PII beyond the `project_dir` basename.** Never the full path. Never the user's name (that's in the profile, not the log).
- **No secrets.** Ever.
- **No command arguments or conversational content.** The log is structured feedback signal, not a transcript.
- **Nothing sensitive from the builder profile.** Don't duplicate profile contents into the session log.

## Size and Rotation

- One file per day keeps rotation natural.
- If a single day's file grows past ~1 MB (roughly 5,000 entries), something is wrong — investigate rather than rotate.
- Old files can be archived or deleted by the user at any time. The plugin never auto-deletes.

## Privacy Posture

- Local-first. The log lives in the user's home directory and never leaves their machine unless they explicitly share it.
- User-inspectable. The user can `cat` or open the JSONL files at any time to see exactly what was captured.
- User-deletable. The user can `rm` the sessions directory at any time and the plugin continues working — it just loses the memory and treats subsequent runs like a fresh install for evolution purposes.

## Why This Exists

The session log is raw material for **Level 3** of the Self-Evolving Plugin Framework. `/evolve` reads these entries (alongside `friction.jsonl`) to propose plugin improvements based on observed patterns.

The **sentinel pattern** lets `friction-logger.detect_orphans()` distinguish "user abandoned the command" from "command never ran" — abandonment is friction signal worth surfacing; non-execution isn't.

See `docs/self-evolving-plugins-framework.md` for the full framework context.
