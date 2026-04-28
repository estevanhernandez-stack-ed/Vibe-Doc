# Vibe Doc

> **Persona:** This repo inherits **The Architect** from `~/.claude/CLAUDE.md`. No need to re-establish — just adds project context below.

## Tech Stack & Voice

- **Stack:** TypeScript (strict) + Node.js ≥18. npm workspaces monorepo. Commander for CLI surface, fast-glob + simple-git for scan, marked + docx for generation, chalk + ora + cli-table3 for terminal UI, update-notifier for upgrade nudges.
- **Distribution surfaces:** (1) npm `@esthernandez/vibe-doc` — global CLI binary for terminals + CI; (2) Claude marketplace `estevanhernandez-stack-ed/vibe-plugins` — slash commands `/scan`, `/generate`, `/check`, `/status`; (3) `.plugin` archives in `bundles/` — manual upload path (currently unstable in Cowork; not the recommended surface); (4) `action/action.yml` — GitHub Action wrapper around `vibe-doc check`.
- **Brand:** Cyan `#17d4fa` + magenta `#f22f89`, always paired. Navy `#0f1f31` field. Space Grotesk display, Inter body, JetBrains Mono code/meta (uppercase + 0.12em tracking on small labels).
- **Voice:** Builder-to-builder, second person, sentence case. No "empower / leverage / seamlessly / unlock / unleash." Em-dashes welcome. No emoji in UI copy or marketing surfaces. Tagline: *Imagine Something Else.*

## Design system

Canonical brand spec lives at `~/.claude/skills/626labs-design/` (globally available — same skill across every 626 Labs repo). Vibe Doc itself is terminal-shaped, so brand tokens mostly govern the README, marketplace blurb, and any docs site copy — not the CLI output.

## What's where

| Path | What it is |
|---|---|
| `packages/vibe-doc/` | The single npm workspace. Ships both ways — npm CLI and Claude plugin from one tree. |
| `packages/vibe-doc/src/` | TypeScript source for the CLI. Pipeline modules: `scanner/`, `classifier/`, `gap-analyzer/`, `generator/`, `checker/`, plus `state/`, `templates/`, `versioning/`, `utils/`. |
| `packages/vibe-doc/src/index.ts` | Commander entry point. Wires every subcommand. |
| `packages/vibe-doc/skills/` | Plugin skills — `scan/`, `generate/`, `check/`, `evolve/` (user-facing); `friction-logger/`, `session-logger/`, `guide/` (internal). Each is a SKILL.md + optional `references/` and `schemas/`. |
| `packages/vibe-doc/skills/guide/schemas/` | JSON Schema Draft-07 schemas — `friction.schema.json` (friction.jsonl entries), `session-log.schema.json` (sessions/*.jsonl entries). |
| `packages/vibe-doc/skills/guide/references/friction-triggers.md` | Per-command trigger map — when each command should call `friction-logger.log()` and at what confidence. |
| `packages/vibe-doc/scripts/atomic-append-jsonl.js`, `atomic-write-json.js` | Zero-dep Node helpers for append-only JSONL writes and atomic-rename JSON writes. Used by friction-logger and session-logger. |
| `packages/vibe-doc/commands/` | Slash command markdown — one file per `/scan`, `/generate`, `/check`, `/evolve`, `/status`. |
| `packages/vibe-doc/.claude-plugin/plugin.json` | Plugin manifest (name, version, description). Version must match `packages/vibe-doc/package.json`. |
| `packages/vibe-doc/scripts/` | `copy-templates.js` (build-time, runs after `tsc`) and `postinstall.js` (onboarding nudge after npm install). |
| `packages/vibe-doc/README.md` | The npm-shipped README — what users see on npmjs.com. |
| `.claude-plugin/marketplace.json` | Top-level marketplace manifest. Points the marketplace listing at `./packages/vibe-doc`. |
| `bundles/` | Released `.plugin` archives, one per version. Built by `scripts/build-plugin.py`. |
| `scripts/build-plugin.py` | Reproducible bundle builder. The canonical way to produce a `.plugin`. |
| `scripts/stats.py` | Ecosystem stats helper (downloads, install paths). |
| `action/action.yml` | GitHub Action composite — installs the CLI globally and runs `vibe-doc check`. |
| `docs/` | PRD, spec, scope, builder profile, Self-Evolving Plugin Framework whitepaper, research context. |
| `SKILLS_README.md` | Skill-system overview — the architecture of the plugin's conversational layer. |
| `process-notes.md` | Build journal kept across iterations. Project history, not active state. |
| `proposed-changes.md` (top-level + inside `packages/vibe-doc/`) | Pattern #14 reflective-loop output. Never auto-applied — reviewed and merged manually. |
| `README.md` (root) | User-facing overview for the GitHub repo. |

## How the system works at runtime

Vibe Doc is a **dual-layer** plugin: the same classification engine and templates back both a conversational skill flow and a deterministic CLI. Both surfaces share state through `.vibe-doc/state.json` in the user's project.

**The pipeline** (skills and CLI both walk it):

1. **Scan** — `scanner/` walks the repo, extracts artifacts (files, git, code patterns), produces an inventory.
2. **Classify** — `classifier/` runs hybrid rules + LLM fallback. Rules first (deterministic, fast); LLM only when signals are ambiguous. User confirms at a checkpoint.
3. **Gap analyze** — `gap-analyzer/` cross-references the classification against the 7×7 documentation matrix (category × deployment context) and applies modifier rules (Regulated, Customer-Facing, Multi-Tenant, etc.). Produces a tiered gap list (Required / Recommended / Optional).
4. **Generate** — `generator/` reads breadcrumb heuristics for the requested doc type, asks the user 2–3 synthesis questions, then renders both `.md` and `.docx` from templates with extracted artifact context.
5. **Check** — `checker/` runs in CI: pass/fail on Required-tier presence + staleness threshold. Exit codes only, no prompts.

**The skill layer** (`skills/scan/`, `skills/generate/`, `skills/check/`) wraps the CLI commands with conversational checkpoints, intake interviews, and review gates. The internal `skills/guide/` defines shared behavior (tone, state pattern, error handling) and references the classification taxonomy, documentation matrix, and breadcrumb heuristics.

**Self-Evolving Plugin Framework integration:** Vibe Doc reads `~/.claude/profiles/builder.json` (the unified builder profile) to calibrate tone and depth, writes only to its own `plugins.vibe-doc` namespace, and emits a `proposed-changes.md` from its own reflective loop. See `docs/self-evolving-plugins-framework.md` for the 12-pattern catalog.

**Reflective loop (v0.7.0+):** `/vibe-doc:evolve` reads session logs at `~/.claude/plugins/data/vibe-doc/sessions/<date>.jsonl` and friction signals at `~/.claude/plugins/data/vibe-doc/friction.jsonl`, weights findings via Pattern #14 absence-of-friction inference, and appends triaged proposals as a new section in `packages/vibe-doc/proposed-changes.md`. Nothing auto-applies. The `friction-logger` and `session-logger` internal SKILLs implement Pattern #6 (Friction Log) and Level 2 (session memory) of the framework.

## Common tasks

| You want to… | Path / command |
|---|---|
| Build the CLI | `cd packages/vibe-doc && npm run build` (runs `tsc` then `copy-templates.js`) |
| Type-check without emitting | `cd packages/vibe-doc && npm run type-check` |
| Run the CLI locally during dev | `cd packages/vibe-doc && npm run dev -- <subcommand>` (uses `tsx watch`) |
| Bump the version | Edit `packages/vibe-doc/package.json` AND `packages/vibe-doc/.claude-plugin/plugin.json` together — they must stay in sync |
| Build a `.plugin` bundle for release | `python scripts/build-plugin.py` — output lands in `bundles/` |
| Publish to npm | `cd packages/vibe-doc && npm publish` (workspace ships from this directory) |
| Edit a skill | `packages/vibe-doc/skills/{scan,generate,check}/SKILL.md` — agent reads these directly |
| Edit the classification matrix | `packages/vibe-doc/skills/guide/references/documentation-matrix.md` (load-bearing — this is the thesis core) |
| Edit a slash command | `packages/vibe-doc/commands/<name>.md` |
| Edit a friction trigger | `packages/vibe-doc/skills/guide/references/friction-triggers.md` (and pair with the matching `friction-logger.log()` call in the command SKILL) |
| Edit the friction or session-log shape | `packages/vibe-doc/skills/guide/schemas/{friction,session-log}.schema.json` (load-bearing — bump `schema_version` if breaking) |
| Edit the GitHub Action | `action/action.yml` |
| Run the ecosystem stats script | `python scripts/stats.py` |

## Conventions

- **Commits:** Conventional commits — `docs`, `chore`, `feat`, `fix`. Version-bump commits use the `v0.X.Y:` prefix (see `bf0ac9e`, `d0bc1f7`). Match the existing rhythm.
- **Style:** TypeScript strict mode (see `tsconfig.json`). Commander for the CLI surface, chalk + ora for terminal feedback, cli-table3 for tabular output. Keep `src/` modular by pipeline stage — don't pile cross-cutting logic into `index.ts`.
- **File rules:**
  - `packages/vibe-doc/dist/` is generated by `npm run build`. Never hand-edit. Edit `src/` and rebuild.
  - `packages/vibe-doc/src/templates/` is the canonical template source — `copy-templates.js` mirrors it into `dist/templates/` at build time.
  - `bundles/*.plugin` are committed release artifacts. Don't regenerate without bumping the version.
  - `.vibe-doc/state.json` (in users' projects, not this repo) is git-committable and travels with the project — schema changes ripple.
  - `proposed-changes.md` is reflective-loop output, never auto-merged.

## Decisions log

Significant decisions log to the **626Labs Dashboard** via MCP (`mcp__626Labs__manage_decisions log`). Tag with the bound project ID. The bar: *would future-you (or someone debugging "why this approach?") want to know this in 3–6 months?*

Especially:

- **Documentation matrix or modifier rule changes** — the 7×7 category × context grid plus modifier rules is the load-bearing thesis output. Any tier reassignment, new category, or new context modifier is a thesis-level decision.
- **Classifier algorithm changes** — rules-vs-LLM split, signal additions, confidence-threshold changes. The 626Labs case study (Firebase signal-detection blind spot, commit `e2471e0` era) is the precedent for why these are load-bearing.
- **State schema changes to `.vibe-doc/state.json`** — users commit it to their repos. A breaking shape change orphans every install. Always pair with a versioning migration in `src/versioning/`.
- **Distribution surface tradeoffs** — which install path do we recommend in user-facing copy, when does the `.plugin` upload path become stable again, when do we sunset a surface.
- **Self-Evolving Plugin Framework pattern adoption** — when Vibe Doc adopts a new pattern from the framework or revises one it already uses, the rationale matters for the rest of the ecosystem.
- **Ecosystem composition decisions** — which sibling plugins Vibe Doc composes with (Vibe Cartographer, Vibe Test, app-project-readiness), profile namespace conventions, shared-state contracts.

Skip the routine: ran tests, fixed a typo, renamed a variable, bumped a patch dep without behavior change.

If unbound (no 626Labs project for this repo): tag with the repo name in the description and set `projectId: null`.

## What NOT to do

- **Don't hand-edit `packages/vibe-doc/dist/`** — it's generated by `tsc` + `copy-templates.js`. Edit `src/` (and `src/templates/` for templates) and rebuild. Edits to `dist/` will be silently overwritten.
- **Don't bump the version in only one place** — `packages/vibe-doc/package.json` and `packages/vibe-doc/.claude-plugin/plugin.json` must stay synced. Commit `8b8d71f` exists specifically because they drifted; it's a real failure mode.
- **Don't break `.vibe-doc/state.json` schema without a migration** — users commit that file. A breaking shape change orphans every existing install. Add a migration to `src/versioning/` and a schema-version bump.
- **Don't write outside the `plugins.vibe-doc` namespace in `~/.claude/profiles/builder.json`** — that profile is shared across the ecosystem. Stomping a sibling plugin's data violates Pattern #5 (Namespace Discipline) of the Self-Evolving Plugin Framework.
- **Don't auto-apply `proposed-changes.md`** — it's the reflective-loop output. Always reviewed and merged manually. Silent merging defeats the whole point of the loop.
- **Don't recommend the `.plugin` upload path in user-facing copy** — Cowork's upload is currently unstable for these bundles. Marketplace install is the recommended surface; npm install is the secondary. Top-level `README.md` already reflects this — keep it that way.
- **Don't ship a Unix-only build step** — Windows builds are first-class. The `mkdir/cp`-in-`package.json` regression (fixed in `f5ecb6c`) is the precedent. Use `scripts/copy-templates.js` (Node) instead of shell commands.
- **Don't fabricate signals in the classifier** — every signal in `src/classifier/signals.ts` should map to a real artifact pattern. The 626Labs Firebase blind spot was a *missing* signal, not a wrong one; resist the urge to add speculative signals to chase confidence.

## References

- PRD / spec / scope: `docs/prd.md`, `docs/spec.md`, `docs/scope.md`
- Self-Evolving Plugin Framework whitepaper: `docs/self-evolving-plugins-framework.md`
- Builder profile contract: `docs/builder-profile.md`
- Q2-2026 research context: `docs/q2-2026-research-context.md`
- Skill-system architecture overview: `SKILLS_README.md`
- Build journal (project history, not active state): `process-notes.md`
- npm-shipped README: `packages/vibe-doc/README.md`
- Internal agent guide: `packages/vibe-doc/skills/guide/AGENT_GUIDE.md`
