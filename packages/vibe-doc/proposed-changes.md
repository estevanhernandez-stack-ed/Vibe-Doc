# Proposed Changes — Vibe Doc

**Source:** Manual evolution pass — findings from a real `/vibe-doc:scan` run on the `vibe-plugins` aggregated marketplace repo. Run completed 2026-04-28; this file captures the meta-findings that surfaced during the walkthrough so they can be triaged and applied as SKILL / classifier / matrix edits.

**Why this file exists:** Vibe Doc doesn't have an automated `/evolve` command yet (see Finding #11 — that's the framework-parity gap). Until it does, evolution input is captured manually here, mirroring the file path Cart and Vibe Test write to (`packages/<plugin>/proposed-changes.md`). When `/evolve` ships in vibe-doc, it should write to this same file and ingest the existing entries.

**Status legend** (mirroring Cart's invite-reframing pattern from `/evolve` 2026-04-25):
- `read` — observation noted, not yet a tracked work item.
- `track` — accepted as a real work item; will land in a future change.
- `refine` — needs reframing or sharpening before it's actionable.
- `split` — should be broken into multiple smaller items.
- `defer` — real but lower-priority; revisit on the next cycle.
- `applied` — diff merged in this triage run.

---

## Triage outcome — 2026-04-28

Walked through using Cart's `/evolve` triage pattern manually (vibe-doc lacks its own `/evolve` — see #11). All findings were Plugin-track. Type-check passes after cumulative edits.

| # | Status | What landed |
|---|---|---|
| #1 | `applied` | Added `Claude Code plugin / agent extension / developer tool` to scan SKILL Q2 |
| #2 | `applied` | Added `plugin marketplace / extension ecosystem` to scan SKILL Q5 (option a) |
| #3 | `applied` | Replaced broken `--format=%an` second log call with `commit.author_name` from existing `log.all` (`scanner/git-scanner.ts`) |
| #4 | `applied` | Two paired root causes fixed: non-recursive glob in `code-scanner.ts` + Windows-only path-split in `language-detect.ts` |
| #5 | `applied` | SKILL writes `.vibe-doc/intake-profile.json` and CLI gets `--profile` flag in scan command (the CLI's `--profile` plumbing already worked) |
| #6 | `applied` | Picked option (b) — strict file-name match. Documented the convention in `breadcrumbs.ts` and improved gap rationale to surface expected file locations for every doc type |
| #7 | `applied` | `ThreatModel` baseline for `ClaudeCodePlugin` bumped Optional → Recommended. Matrix handler added for `PublicOpenSource` modifier (which #10 then introduced) |
| #8 | `applied` | Added `marketplace.json` to api-spec breadcrumb. Introduced `AggregatedMarketplace` context modifier wired end-to-end (signal handler + matrix elevation + LLM prompt doc) |
| #9 | `applied` (correction) | Investigation showed the finding's prose-mention hypothesis didn't match the code — classifier reads paths only. Real root cause: universal-floor signals (has-tests, has-dockerfile, etc.) plus no margin check on secondary picking. Added `pickSecondary()` with a 30%-of-primary threshold |
| #10 | `applied` | Introduced `PublicOpenSource` modifier as a **compound signal** (LICENSE + Claude plugin shape) so it doesn't over-fire on every repo with a license. Wired through scoring-engine, signals, matrix (elevates threat-model + runbook), and llm-prompt |
| #11 | `deferred` | The `/evolve` command itself — substantial multi-skill build (friction-logger + session-logger + schemas + evolve SKILL). Deferred to a separate `/scope` session as the next minor-release headline |

**Files touched in this run:**
- `packages/vibe-doc/skills/scan/SKILL.md` (#1, #2, #5)
- `packages/vibe-doc/src/scanner/git-scanner.ts` (#3)
- `packages/vibe-doc/src/scanner/code-scanner.ts` (#4)
- `packages/vibe-doc/src/utils/language-detect.ts` (#4)
- `packages/vibe-doc/src/gap-analyzer/breadcrumbs.ts` (#6, #8)
- `packages/vibe-doc/src/gap-analyzer/tier-assigner.ts` (#6)
- `packages/vibe-doc/src/gap-analyzer/matrix.ts` (#7, #8, #10)
- `packages/vibe-doc/src/classifier/scoring-engine.ts` (#8, #10)
- `packages/vibe-doc/src/classifier/signals.ts` (#10)
- `packages/vibe-doc/src/classifier/index.ts` (#9)
- `packages/vibe-doc/src/classifier/llm-prompt.ts` (#8, #10)

---

## A. Intake / interview gaps

### Finding #1 — Intake purpose-list doesn't include `ClaudeCodePlugin`

**Evidence:** During Question 2 of the intake interview, the SKILL prompts the user to pick from `web app / API / data pipeline / infrastructure / mobile / AI/ML / integration / something else`. None of those is `ClaudeCodePlugin`, even though the classifier's actual taxonomy includes it as a primary category. User had to answer "something else" and name it manually. The classifier later resolved it correctly with 100% confidence — proving the underlying taxonomy is right, but the conversational layer doesn't surface it.

**Proposed change:** Update `skills/scan/SKILL.md` Question 2 to include `Claude Code plugin / agent extension / developer tool` as a first-class option. Also extend the intake taxonomy docs (if any) to mirror the full classifier category list.

**Confidence:** High. The bridge between intake and classifier is straightforward.

**Suggested status:** `track`.

### Finding #2 — Intake architecture-style list doesn't include "aggregated marketplace + solo-repo-per-plugin"

**Evidence:** Question 5 asks `monolith / microservices / serverless / hybrid`. None fit a Claude Code plugin marketplace. The actual shape is "aggregated marketplace + solo-repo-per-plugin + mixed Node/Python tooling." User had to free-text it.

**Proposed change:** Either (a) add `plugin marketplace / extension ecosystem` as an architecture style option, or (b) reframe Question 5 to allow free-text input alongside the four canonical choices, with a note that free-text answers feed a "novel architecture" signal into the classifier.

**Confidence:** Medium — depends on whether vibe-doc wants to grow the architecture taxonomy or just allow free-text.

**Suggested status:** `refine` — decide between (a) and (b) before tracking.

---

## B. Classifier / scanner bugs

### Finding #3 — `gitStats.contributors: 0` despite real commits

**Evidence:** State.json reports `gitStats.totalCommits: 49` and `gitStats.contributors: 0` simultaneously. The repo has at least one author (Estevan, who authored every commit). The git-scanner is detecting commits but not enumerating their authors.

**Proposed change:** Audit `packages/vibe-doc/src/scanner/git-scanner.ts` for the contributor-extraction code path. Likely a parse / aggregation bug rather than a git invocation issue (since totalCommits works). Add a unit test fixture with known contributor count.

**Confidence:** High that it's a bug. Medium on the exact root cause.

**Suggested status:** `track`. Add to bugfix backlog.

### Finding #4 — `gitStats.mainLanguages: []` despite obvious languages

**Evidence:** Same scan: `mainLanguages: []` returned. The repo has TypeScript (`packages/core/src/*.ts`, ~20 files), Python (`scripts/*.py`), JavaScript (`scripts/copy-templates.js`, `postinstall.js`), and Markdown (extensive). Detection should at minimum return TypeScript as primary.

**Proposed change:** Audit `packages/vibe-doc/src/utils/language-detect.ts`. May be an extension-mapping issue or a threshold issue (e.g., requires N% of files to register). Cross-check against simpler repos (e.g., a pure-TypeScript single-package repo) to confirm whether this is monorepo-shape-specific or a universal bug.

**Confidence:** High that it's a bug.

**Suggested status:** `track`. Pair with #3 since both are scanner-output-quality issues.

### Finding #9 — Secondary classification = `WebApplication` (false positive)

**Evidence:** State.json: `classification.secondaryCategory: "WebApplication"`. The vibe-plugins repo has zero web app surface — no React app, no Next.js page, no HTML, no server. Likely triggered by SKILL prose mentioning React / Next.js downstream as example tech-stack options for users.

**Proposed change:** Tighten the secondary-category signal extractor. Mentions of frameworks in *prose* (especially in SKILL.md files describing options for downstream user choices) shouldn't carry the same weight as actual project files using those frameworks. Could weight signal sources: actual code/config > package.json deps > prose mentions.

**Confidence:** Medium — needs more example repos to confirm whether this is a frequent false-positive pattern.

**Suggested status:** `track`. Worth fixing because it bleeds into the gap analyzer's tier decisions.

---

## C. State persistence gaps

### Finding #5 — Intake interview answers not persisted to state.json

**Evidence:** I ran the full 6-question intake interview before the scan. State.json's `projectProfile.interviewAnswers` came back with all empty strings: `projectName: ""`, `projectDescription: ""`, `mainPurpose: ""`, etc. Either the SKILL flow doesn't write the answers it collects, or there's a serialization gap between the conversational layer and the state writer.

**Proposed change:** Audit the bridge between the scan SKILL's intake flow and `state.json` writes. The SKILL describes "Save this profile" after the intake but the field assignment may never reach disk. Add an integration test: run intake, complete scan, assert state.json fields are populated.

**Confidence:** High that the gap exists. Medium on whether the cause is in the SKILL flow or in the state-writer.

**Suggested status:** `track`. Bug fix.

---

## D. Matcher false negatives

### Finding #6 — `install-guide` flagged missing despite README having Install section

**Evidence:** The vibe-plugins README has a comprehensive `## Install` section covering three install paths. State.json reports `install-guide: { found: 0, missing: 1, rationale: "No evidence found in codebase." }`. The matcher likely scans for a dedicated INSTALL.md file or a top-level header, not for an Install section inside the README.

**Proposed change:** Two options: (a) accept README sections as evidence — match `^##\s+install` headers within README.md and credit them; (b) keep the strict file-name match but document in vibe-doc's own docs that the matcher expects a dedicated INSTALL.md. Option (a) is more user-forgiving; (b) is more deterministic. Cart's solo repo has a dedicated INSTALL.md, so the strict pattern matches the 626Labs convention — there's a reasonable argument for (b) as long as the matcher's expectation is documented.

**Confidence:** Medium — design call between strict and forgiving matching.

**Suggested status:** `refine` — pick a side, document it.

---

## E. Tier matrix calibration

### Finding #7 — `threat-model` tier = optional for ClaudeCodePlugin (debatable)

**Evidence:** Per the documentation matrix, ClaudeCodePlugin lists threat-model as `Optional`. But Claude Code plugins run inside the user's Claude Code session, read user files, execute commands with whatever permissions the user has granted. The malicious-branch-contributor scenario (someone forks a plugin, plants prompt-injection in a SKILL.md, the change rides through to users via the marketplace) is a real attack surface. For a plugin that touches user files in this way, threat-model arguably should be `Recommended` minimum, not `Optional`.

**Proposed change:** Bump ClaudeCodePlugin's threat-model tier from `Optional` to `Recommended`. Add a context modifier: when the plugin is publicly distributed (vs. internal-only / personal), threat-model tier elevates to `Required`.

**Confidence:** High that the current calibration is too lax.

**Suggested status:** `track`.

### Finding #8 — `api-spec` tier = optional, but `marketplace.json` IS the spec for aggregated marketplaces

**Evidence:** ClaudeCodePlugin's api-spec tier is `Optional`. For an aggregated marketplace (this repo's shape), the `.claude-plugin/marketplace.json` manifest IS the API specification — it's the structural contract between the marketplace and consumers (plugin host, automation, agents). The scan flagged api-spec as missing despite the manifest being load-bearing and well-structured.

**Proposed change:** Add a sub-category or context modifier for "AggregatedMarketplace" within ClaudeCodePlugin. When detected (signal: `.claude-plugin/marketplace.json` at repo root with `plugins[]` containing multiple entries), the matcher should treat that file as the api-spec evidence. Alternatively: add a "this category uses marketplace.json as api-spec" hint in the documentation matrix and cite it in the gap rationale.

**Confidence:** Medium-high. The aggregated-marketplace shape is rare today but central to this ecosystem; calibrating for it is worthwhile.

**Suggested status:** `track`.

### Finding #10 — `InternalTooling` modifier is too narrow for MIT-licensed public plugins

**Evidence:** State.json: `contextModifiers: ["InternalTooling"]`. The vibe-plugins repo is MIT-licensed, distributed publicly via npm (with thousands-per-month downloads), and one plugin is reviewed + accepted into Anthropic's official curated catalog. Calling it "InternalTooling" partly fits (the maintainer is the heaviest user) but understates the public-distribution reality. The current binary `InternalTooling | CustomerFacing | Regulated` doesn't capture "public open-source library with active distribution."

**Proposed change:** Add a `PublicOpenSource` context modifier, or extend the existing modifiers so `CustomerFacing` can apply to free-distribution scenarios (not just paying customers). Should affect the gap analyzer's tier decisions: a publicly-distributed plugin's threat-model and runbook tiers should be higher than an internal-only one's.

**Confidence:** High that the current modifier set under-classifies open-source distribution.

**Suggested status:** `track`.

---

## F. Framework parity

### Finding #11 — Vibe Doc lacks `/evolve` (Level-3 framework parity gap)

**Evidence:** Cart and Vibe Test both have `/evolve` commands implementing Pattern #6 (friction log), Pattern #14 (wins log), and reflective Level-3 self-improvement loops. Vibe Doc has scan / generate / check / status — no evolve. The Self-Evolving Plugin Framework defines L3 as "the plugin reads its own session logs and proposes SKILL improvements"; vibe-doc currently can't do that. This proposed-changes.md file is the manual stand-in until the loop ships.

**Proposed change:** Implement `/vibe-doc:evolve` mirroring Cart's pattern:
1. New SKILL at `packages/vibe-doc/skills/evolve/SKILL.md`.
2. Reads friction log (if exists) + session logs from the last 30 days at `~/.claude/plugins/data/vibe-doc/`.
3. Weights findings with Pattern #14 absence-of-friction inference.
4. Writes proposed changes to `packages/vibe-doc/proposed-changes.md` (this file). Idempotent — appends new findings; preserves existing entries' status fields if the user has already triaged them.
5. Never auto-applies. Builder reviews and merges manually (or via a future apply-proposed-changes SKILL).

Pre-requisites:
- friction-logger SKILL (`packages/vibe-doc/skills/friction-logger/SKILL.md`) — internal SKILL, append-only friction capture. Mirror Cart's.
- session-logger SKILL — mirror Cart's two-phase append-only log.
- friction.schema.json + session-log.schema.json under `packages/vibe-doc/skills/guide/schemas/`.

**Confidence:** High — pattern is well-established by Cart and Vibe Test; mostly a port.

**Suggested status:** `track`. Substantial work item — call it the headline of vibe-doc's next minor release.

---

## Triage notes

When you walk through these:

- **Quick wins** (track, ship in next patch): #1 (intake taxonomy fix), #6 (matcher behavior decision), #11's pre-requisite skills.
- **Bug fixes** (track, batch into a quality-of-output release): #3, #4, #5, #9.
- **Calibration changes** (track, batch with matrix edits): #7, #8, #10.
- **Headline feature** (track as standalone work item): #11 — the `/evolve` command itself.
- **Reframe before tracking**: #2 (architecture style intake — design choice between adding a category vs. allowing free-text).

After triaging, the corresponding findings can move from this file into your normal issue tracker (or stay here if you prefer one canonical evolve-input doc per cycle, like Cart does).

## Source data

- Scan run: 2026-04-28, on `c:\Users\estev\Projects\vibe-plugins`.
- State.json snapshot: `c:\Users\estev\Projects\vibe-plugins\.vibe-doc\state.json` (vibe-doc 0.5.0).
- Walkthrough conversation: vibe-plugins session at 2026-04-28T10:32–12:06 CST.
- Generated docs in vibe-plugins as a side-effect of the walkthrough: INSTALL.md, docs/adrs/* (4 ADRs + template + index), docs/test-plan.md, CHANGELOG.md, docs/runbook.md, docs/data-model.md, docs/threat-model.md, docs/api-spec.md.

These docs are real artifacts — vibe-doc's gap analyzer surfaced the gaps; closing them produced legitimate documentation. The meta-findings in this file are the *secondary* output: how the gap-analysis flow itself can be sharpened.
