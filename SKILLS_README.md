# Vibe Doc Plugin Skills

Complete skill definitions for the Vibe Doc Cowork/Claude Code plugin. All SKILL.md files and reference guides ready for agent execution.

## Plugin Structure

```
vibe-doc/
├── skills/
│   ├── scan/
│   │   └── SKILL.md              (216 lines) — Scan & classify pipeline
│   ├── generate/
│   │   └── SKILL.md              (387 lines) — Document generation pipeline
│   ├── check/
│   │   └── SKILL.md              (298 lines) — CI validation skill
│   └── guide/
│       ├── SKILL.md              (212 lines) — Shared behavior guide (internal reference)
│       └── references/
│           ├── classification-taxonomy.md     (348 lines) — 7 categories × 5 contexts
│           ├── documentation-matrix.md        (256 lines) — Tier mapping
│           └── breadcrumb-heuristics.md       (441 lines) — Extraction strategies & questions
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

### 4. Guide (`skills/guide/SKILL.md`)
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
