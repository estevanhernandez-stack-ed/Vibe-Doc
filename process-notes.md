# Process Notes — Vibe Coding Artifacts Plugin

## /evolve port — 2026-04-28 (autonomous Cart use)

**Date:** 2026-04-28T16:25 CST
**Mode:** Builder, autonomous (no per-step checkpoints)
**Persona:** The Architect (from `~/.claude/CLAUDE.md`)
**Trigger:** v0.6.0 just shipped after triaging proposed-changes.md manually. Finding #11 (the `/evolve` build itself) was explicitly deferred to a separate session. Este: "How about you autonomously use Vibe Cartographer to port it from cartographer that'll be a new stretch for vibe cartographer and so meta it's not even funny."

**Posture:** Cart's planning chain (scope → spec → checklist → build → reflect) compressed into one doc at `docs/evolve-build.md` because this is a port, not a greenfield design. Cart's reference SKILLs at `C:\Users\estev\Projects\app-readinessplugin\plugins\vibe-cartographer\skills\` are the source of truth — adapt namespace, drop `mode`, drop `last_seen_complements` for v1.

### Load-bearing decisions
- One combined planning doc instead of four (scope/prd/spec/checklist) because the requirements are derivative — we're porting an existing pattern, not designing from scratch.
- `mode` field dropped from session-log schema (vibe-doc has no learner/builder dichotomy).
- `last_seen_complements` snapshot deferred — Cart-specific telemetry, not load-bearing for v0.7.0 ship.
- Friction calibration (Cart 1.5) deferred — second JSONL stream + `/reflect`-time UI is its own scope.
- `/check` gets no friction surface in v0.7.0 — pass/fail CI command, no interactive friction.
- Atomic scripts ported verbatim (no plugin-name coupling in their interface).

### What landed
- 2 zero-dep helper scripts: `scripts/atomic-append-jsonl.js`, `scripts/atomic-write-json.js`.
- 2 JSON Schemas: `skills/guide/schemas/{friction,session-log}.schema.json`.
- 1 trigger map: `skills/guide/references/friction-triggers.md` scoped to scan/generate/check (and self-reference for /evolve).
- 3 new SKILLs: `skills/{friction-logger,session-logger,evolve}/SKILL.md`.
- 1 new slash command: `commands/evolve.md`.
- Wired session+friction logging into `skills/{scan,generate}/SKILL.md` (Session Logging + Friction Logging sections at the top of each).
- `/check` left untouched (no friction surface in v0.7.0 by design — pass/fail CI command).
- `package.json` `files` array now includes both atomic scripts so they ship via npm.
- CLAUDE.md updated: file map gets the new SKILLs + scripts + schemas + friction-triggers entries; framework section gets the v0.7.0 reflective-loop note.
- SKILLS_README.md updated: new section per added SKILL.

### Build status
- `npm run type-check` — clean (no source changes, just SKILL/markdown/JSON additions).
- `npm run build` — clean. dist/ regenerated. 11 templates copied.

### Outcome
- Versions bumped 0.6.0 → 0.7.0 in both `packages/vibe-doc/package.json` and `packages/vibe-doc/.claude-plugin/plugin.json`.
- Commit pending. Publish pending.

### Friction notes (Cart-style, this session)
- None. Autonomous run, no checkpoints, no pushback. Pre-vetted-flow rhythm from MEMORY held.

## Onboard

**Technical experience:** Experienced full-stack developer. Very comfortable with plugin/skill building — has shipped multiple Cowork plugins, MCP servers, and agent workflows. No hand-holding needed on toolchain or patterns.

**Project goals:** Dual-purpose — solve real documentation gaps in his own 626Labs project (validated by thesis case study), then generalize into a distributable plugin. The thesis provides both the problem analysis and the proposed architecture.

**Design direction:** Skill-based CLI/Cowork plugin. Phased pipeline with checkpoints (Inventory → Extraction → Synthesis → Validation). Dual output: markdown for repos, docx for stakeholders. No visual UI needed.

**Mode selection:** Builder mode. Rationale: experienced builder who knows the ecosystem, high velocity preference, wants to move fast on decisions.

**Architecture docs status:** Using thesis Section 7 (five proposed skills) plus existing 626Labs ecosystem patterns (Gold Standard, spec-driven-dev plugin structure, agent skills). No additional architecture docs needed.

**Energy/engagement:** High energy, decisive. Picked "Both" on motivation (personal use + general tool) without hesitation. Clear vision for the pipeline interaction pattern. Active decision-maker — every answer was specific and directional.

## Scope

**Idea evolution:** Came in with a fully formed thesis and clear pipeline vision. The key insight surfaced during conversation: existing doc-gen tools (DocuWriter, Mintlify, Swimm) generate docs from code, but none read *development process artifacts*. Vibe Doc documents the building process, not just the code. That's the differentiator.

**Pushback received:** Pushed back on scope — offered to cut CI/CD integration, auto-update, versioning, and multi-language from v1. Builder refused all cuts twice. Accepted the decision and noted the risk in the scope doc. Will manage through build sequencing.

**Deepening rounds:** 1 round. Focused on the "should exist vs. has to exist" distinction. Landed on a three-tier priority model (Required / Recommended / Optional) driven by (app type × deployment context) matrix. This was a clean resolution — turns a philosophical distinction into a mechanical classification.

**Active shaping:** Very active. The brain dump was rich — called out that spec-driven-dev doesn't cover documentation, noted that vibe coding isn't taken seriously despite producing great apps, and identified the hardest problem (should vs. has-to). Every answer was directional. Zero passivity.

## PRD

**Key decisions:**
- Entry point is a fork: user chooses "add context" (intake interview) or "start scanning" (cold start). This was the builder's first answer — unprompted, shows strong UX instinct.
- Gap report is summary-first, then interactive walkthrough. User sees the full landscape before acting on individual gaps.
- Synthesis asks 2-3 targeted questions per doc before generating — not a black box. Breadcrumb heuristics identify what's missing and the agent asks specifically about those gaps.
- Graceful degradation: works even with zero vibe coding artifacts (falls back to code-only analysis). No minimum artifact threshold.
- CI/CD gate is a simple `vibe-doc check` pass/fail command. No framework coupling.
- Staleness detection is timestamp-based for v1. Content-aware diffing deferred.

**"What if" moments:**
- Sparse artifact edge case: builder immediately said "still works" — broadens the tool from vibe-coding-only to any codebase.
- Multi-language monorepo: identified during PRD interview, added as an edge case.

**Deepening rounds:** 1 round on auto-update mechanics. Landed on timestamp-based staleness with configurable threshold. Clean resolution — avoids the complexity of re-running extraction on every check.

**Active shaping:** Consistently decisive. Every answer was first-option-or-clear-counter. The "add context or start scanning" fork was the builder's original idea — not prompted. Strong product instinct throughout.

## Spec

**Technical decisions:**
- Stack: Skills (conversational) + Node.js CLI package (deterministic). Monorepo with npm workspaces. Plugin and CLI ship independently.
- Classification: LLM-assisted (structured prompt, user-confirmed at checkpoint). Builder chose this over rule-based or hybrid — leans into the agent nature of the platform.
- Templates: Embedded with remote override. Works offline, stays current online.
- State: `.vibe-doc/state.json` in user's project folder. Travels with the project, git-committable.
- No external dependencies or API keys. Template registry fetch is optional.

**Deepening round:** 1 round on classification algorithm. Builder went with pure LLM-assisted over hybrid. Reasoning: the plugin already runs in an LLM context, and user confirmation bounds non-determinism.

**Architecture confidence:** High. The spec maps cleanly to the PRD epics. Every component has a clear responsibility and a clear data flow path. The file structure follows established Cowork plugin patterns.

**Active shaping:** Builder chose monorepo, embedded+override templates, and ultimately hybrid classification (rules + LLM fallback). Initially chose pure LLM, then accepted the pushback to go hybrid after hearing the rationale (CI speed, determinism, LLM only for ambiguity). Strong collaborative pattern — opinionated but willing to revise when the argument is sound.

## Checklist

**Sequencing:** Bottom-up agreed — scaffold → scanners → classifier → gap analyzer → templates → generator → checker → skills → commands/manifest → final verification. Builder immediately agreed with proposed sequence.
**Build mode:** Autonomous, no verification. "Full send." Builder trusts the process and wants speed.
**Item count:** 11 items covering the full pipeline from monorepo scaffold through security verification.
**Deepening rounds:** 0 — builder was ready to move immediately.

## Iterate

**What the builder asked for:** "All of that and anything else you see. We have time." Gave carte blanche for a thorough iteration pass.

**Review pass surfaced:**
- CRITICAL: Context mapping bug in classifier → gap-analyzer pipeline. The classifier compresses Context enum values (Regulated, CustomerFacing, etc.) into platform/environment/scale strings, losing the original context names. The gap-analyzer tries to reverse-engineer them and fails for 90%+ of real projects. The three-tier priority system — the thesis's core innovation — is broken for context-modified tiers.
- CRITICAL: Generator's `extracted` data is hardcoded `{}`. Templates always render with empty extracted sections, defeating the "pre-populated from artifacts" promise.
- Missing: `templates` CLI subcommands never wired up despite being in the spec.
- Build: Unix-only `mkdir/cp` in package.json breaks Windows builds.
- Type safety: `as any` cast in DOCX writer for Table vs Paragraph union.
- Safety: Staleness check defaults to "not stale" on git errors (should fail safe).
- State: `userConfirmed` never gets set, interview answers never persist.
- Polish: Build artifact files in repo root, AGENT_GUIDE.md misplaced.

**Iteration items:** 8 items (12-19) covering the full range — 2 critical bugs, 2 missing features, 2 hardening fixes, 1 polish/cleanup, 1 end-to-end verification.

**Builder dynamic:** Completely autonomous. "All of that" with no negotiation or pushback. High trust in the review findings. This is the builder working as a principal — delegating the entire fix scope to the engineering loop.

## Iteration 2

**What the builder asked for:** "keep iterating" — continuing the momentum.

**Review pass surfaced from E2E results:**
- CRITICAL: When the classifier returns low confidence, the scan command only updates `rationale` — it leaves `primaryCategory`, `confidence`, and `contextModifiers` at empty/zero defaults from `initState()`. This means the gap analyzer runs against a blank classification and produces all-optional tiers. The "0% confidence, 0 required docs" E2E result was caused by this, NOT by the context mapping bug (which was separately fixed).
- Signal detection needs broadening: 626Labs uses Firebase/Firestore (not Express/Prisma/etc.), so the existing signals don't match. Need Firebase-specific signals.
- Low-confidence path should still populate best-candidate classification, just with `userConfirmed: false`.
- PRD "What we'd add with more time" has a quick win: pre-built GitHub Action wrapper around `vibe-doc check`.

**Iteration items:** 4 items (20-23) — 1 critical bug, 1 signal enrichment, 1 new feature, 1 validation.
