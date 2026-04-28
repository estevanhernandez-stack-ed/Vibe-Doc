# Vibe Doc Plugin Skills

Complete skill definitions for the Vibe Doc Cowork/Claude Code plugin. All SKILL.md files and reference guides ready for agent execution.

## Plugin Structure

```
vibe-doc/
├── skills/
│   ├── scan/
│   │   └── SKILL.md              — Scan & classify pipeline (user-facing)
│   ├── generate/
│   │   └── SKILL.md              — Document generation pipeline (user-facing)
│   ├── check/
│   │   └── SKILL.md              — CI validation skill (user-facing)
│   ├── evolve/
│   │   └── SKILL.md              — Reflective L3 self-improvement loop (user-facing, v0.7.0+)
│   ├── friction-logger/
│   │   └── SKILL.md              — Append-only friction capture (internal, v0.7.0+)
│   ├── session-logger/
│   │   └── SKILL.md              — Two-phase session log: sentinel + terminal (internal, v0.7.0+)
│   └── guide/
│       ├── SKILL.md              — Shared behavior guide (internal reference)
│       ├── references/
│       │   ├── classification-taxonomy.md     — 7 categories × 5 contexts
│       │   ├── documentation-matrix.md        — Tier mapping
│       │   ├── breadcrumb-heuristics.md       — Extraction strategies & questions
│       │   └── friction-triggers.md           — Per-command trigger map (v0.7.0+)
│       └── schemas/
│           ├── friction.schema.json           — JSON Schema for friction.jsonl entries (v0.7.0+)
│           └── session-log.schema.json        — JSON Schema for sessions/*.jsonl entries (v0.7.0+)
└── SKILLS_README.md              (this file)
```

## Skill Overview

### 1. Scan (`skills/scan/SKILL.md`)
**User-facing, entry point skill.**

Conversational pipeline:
1. Entry gate: Add context or scan cold
2. Intake interview (optional): 4-6 questions about project
3. Run scan: Analyze artifacts, produce inventory
4. Classification: Determine app type + deployment context
5. Gap report: Summary + interactive walkthrough
6. Completion: Show risks and next steps

Produces: `.vibe-doc/state.json` with scan results and gaps.

### 2. Generate (`skills/generate/SKILL.md`)
**User-facing, document generation skill.**

Conversational pipeline:
1. Check state exists (redirect to Scan if not)
2. Show gaps: Required/Recommended/Optional
3. Let user select which docs to generate
4. For each doc:
   - Ask 2-3 synthesis questions (from breadcrumbs)
   - Run CLI generation command
   - Present results with confidence summary
   - Checkpoint: approve/revise/skip
5. Completion: summary of what was generated

Produces: `.md` and `.docx` files in `docs/generated/`, updates state.

### 3. Check (`skills/check/SKILL.md`)
**User-facing, CI validation skill.**

Simple pipeline:
1. Run check command
2. Show pass/fail with clear summary
3. If fail: suggest regeneration or review
4. Show CI integration example

Designed to be CI-safe (no prompts, exit codes).

### 4. Evolve (`skills/evolve/SKILL.md`)
**User-facing, reflective L3 self-improvement loop. Added in v0.7.0.**

Pipeline:
1. Read session logs from `~/.claude/plugins/data/vibe-doc/sessions/`
2. Read friction.jsonl
3. Weight findings (high=1.0, medium=0.6, low=0.3) with Pattern #14 absence-of-friction inference
4. Surface 2–5 patterns, classify each into Plugin / Personal / Community track
5. Propose concrete diffs against vibe-doc's own SKILLs / classifier / matrix
6. Apply on `[apply]`, never auto-merge
7. Append run summary as a new section to `packages/vibe-doc/proposed-changes.md`

Implements Pattern #10 (Agent-Authored Changelog) of the Self-Evolving Plugin Framework.

### 5. Friction-logger (`skills/friction-logger/SKILL.md`)
**Internal SKILL, NOT user-invocable. Added in v0.7.0.**

Two procedures:
- `log(entry)` — append a friction entry to `~/.claude/plugins/data/vibe-doc/friction.jsonl`. Schema-validated, silent-drop on failure (defensive default).
- `detect_orphans()` — scan 7 days of session logs for sentinels without matching terminals. Convert each to a `command_abandoned` friction entry.

Invoked by every command SKILL at the trigger points listed in `skills/guide/references/friction-triggers.md`.

### 6. Session-logger (`skills/session-logger/SKILL.md`)
**Internal SKILL, NOT user-invocable. Added in v0.7.0.**

Two procedures:
- `start(command, project_dir)` — write a sentinel entry (`outcome: "in_progress"`) to today's session file. Returns the sessionUUID.
- `end(entry)` — write a terminal entry with the same sessionUUID and the actual outcome.

Sentinel + terminal pairing enables `friction-logger.detect_orphans()` to identify abandoned commands.

### 7. Guide (`skills/guide/SKILL.md`)
**Internal reference, NOT user-invocable.**

Defines shared behavior for all skills:
- Tone and communication style
- State management patterns (`.vibe-doc/state.json`)
- CLI invocation patterns
- Error handling approach
- Checkpoint pattern
- Output formatting standards

Other skills reference this for consistent behavior.

## Reference Documents

All in `skills/guide/references/` — for agents to consult when building logic.

### Classification Taxonomy (`classification-taxonomy.md`)
Defines the 7 primary categories and 5 deployment contexts:

**Categories:**
- Web Application
- API / Microservice
- Data Pipeline
- Infrastructure / Platform
- Mobile Application
- AI / ML System
- Integration / Connector

**Contexts:**
- Regulated (HIPAA, PCI-DSS, SOC 2, GDPR, FedRAMP, NIST, ISO 27001)
- Customer-Facing
- Internal Tooling
- Multi-Tenant
- Edge / Embedded

Each with signals, examples, focus areas, and required doc types.

### Documentation Matrix (`documentation-matrix.md`)
Maps (Primary Category × Deployment Context) to doc type tiers (Required/Recommended/Optional).

**Core 7×7 matrix:** Category → [Threat Model, ADRs, Runbook, API Spec, Deployment Proc, Test Plan, Data Model]

**Modifier rules:**
- Regulated: elevates all docs one tier
- Customer-Facing: elevates operational docs
- Internal Tooling: lowers non-critical docs
- Multi-Tenant: requires Data Model + API Spec
- Edge/Embedded: requires deployment & test docs

**Applied examples:** Shows how modifiers combine.

### Breadcrumb Heuristics (`breadcrumb-heuristics.md`)
For each of the 7 document types, defines:
- Keywords to search for in artifacts
- File patterns to scan
- Git patterns (commit messages, branches, tags)
- Code patterns (frameworks, libraries, patterns used)
- Required sections in generated doc
- Synthesis gap questions (2-3 targeted questions for agent to ask)
- Confidence scoring guidelines

**Doc types covered:**
1. Threat Model
2. Architecture Decision Records (ADRs)
3. Runbook
4. API Specification
5. Deployment Procedure
6. Test Plan
7. Data Model Documentation

## How Agents Use These Files

### Scan Skill
1. Read `classification-taxonomy.md` to resolve ambiguous classifications
2. Consult `documentation-matrix.md` to map category + contexts → doc type tiers
3. Run `npx vibe-doc scan` via CLI
4. Present classification and gaps to user
5. Offer interactive walkthrough (one gap at a time)

### Generate Skill
1. Check state exists (user should have run Scan first)
2. Read `documentation-matrix.md` to show which gaps are Required/Recommended/Optional
3. Let user select gaps
4. For each gap, consult `breadcrumb-heuristics.md` to get synthesis questions
5. Ask those questions, save answers
6. Run `npx vibe-doc generate <docType> --format both --answers <answers.json>`
7. Present generated doc with confidence per section

### Check Skill
1. Run `npx vibe-doc check`
2. Show pass/fail status (exit code 0/1)
3. If fail: consult `documentation-matrix.md` to explain which Required docs are missing
4. Suggest regeneration or review

## Key Design Principles

### 1. Agent-Readable
- Each SKILL.md is self-contained: an agent reading it should know exactly what to do
- Explicit step numbers and decision points
- Code examples for CLI patterns
- Clear error handling guidance

### 2. Checkpoint Before Proceeding
- Classification confirmation (user can override)
- Gap walkthrough checkpoint (proceed 1 by 1 or batch)
- Synthesis answer checkpoint (before generation)
- Results approval checkpoint (before moving to next doc)

### 3. Dual-Format Output
- Markdown files in `docs/generated/` (for repo)
- DOCX versions for sharing with stakeholders
- Identical content in both formats

### 4. Extensible Taxonomy
- The 7×7 matrix handles most common cases
- Context modifiers handle special requirements (regulated, multi-tenant, etc.)
- Agents can show tier overrides if user's situation doesn't fit

### 5. Sourced Confidence
- Every extracted section attributed to source artifacts
- Low-confidence sections flagged for user review
- User can revise and regenerate with different synthesis questions

## Word Counts

| File | Lines | Purpose |
|------|-------|---------|
| `scan/SKILL.md` | 216 | Scan & classify skill |
| `generate/SKILL.md` | 387 | Document generation skill |
| `check/SKILL.md` | 298 | CI validation skill |
| `guide/SKILL.md` | 212 | Shared behavior (internal) |
| `classification-taxonomy.md` | 348 | Categories & contexts |
| `documentation-matrix.md` | 256 | Tier mapping |
| `breadcrumb-heuristics.md` | 441 | Extraction strategies |
| **TOTAL** | **2,158** | **Complete skill system** |

## Next Steps

**For checklist item 10 (Plugin Distribution):**
- Create `.claude-plugin/plugin.json` with skill metadata
- Package skills for marketplace distribution
- Write plugin README (how to install, quickstart)

**For checklist item 11 (CLI Package):**
- Integrate SKILL.md logic into CLI agent orchestration
- Ensure CLI commands (`scan`, `generate`, `check`) work as documented
- Test end-to-end: Scan → Generate → Check pipeline

---

**Built:** 2026-04-11  
**Status:** Complete — Ready for agent integration and distribution
