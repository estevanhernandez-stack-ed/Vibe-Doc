# Vibe Doc — Technical Spec

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Plugin framework** | Cowork / Claude Code plugin system | Native distribution channel for both desktop and CLI users |
| **Skills** | Markdown SKILL.md files | Drive the conversational pipeline (intake, gap report, synthesis) |
| **CLI core** | Node.js + TypeScript | Handles scanning, classification data prep, template rendering, `vibe-doc check` |
| **Monorepo** | npm workspaces | Plugin + CLI package develop together, ship independently |
| **Document generation** | Markdown (native) + docx (via `docx` npm package) | Dual output per PRD |
| **Template registry** | Embedded JSON/MD + remote override via HTTP fetch | Works offline, stays current online |
| **Classification** | Hybrid: rule-based scoring + LLM fallback for ambiguity | Fast and deterministic when clear, flexible when ambiguous. CI runs without LLM dependency. |

**Key dependency docs:**
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference)
- [npm Workspaces](https://docs.npmjs.com/cli/using-npm/workspaces)
- [docx npm package](https://docx.js.org/)

## Runtime & Deployment

- **Primary runtime:** Cowork (desktop) and Claude Code (CLI) — the plugin runs inside the agent's sandbox
- **CI runtime:** `npx vibe-doc check` runs standalone in any Node.js 18+ environment
- **No cloud dependency:** All scanning and classification runs locally. Template updates fetched from a remote URL are optional (falls back to embedded)
- **Template update endpoint:** A public URL (GitHub raw or simple HTTP) serving versioned template bundles. Checked on scan; cached locally.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Cowork Skills │  │ Claude Code  │  │  CI Pipeline  │  │
│  │ (desktop)     │  │ Skills (CLI) │  │ (vibe-doc     │  │
│  │              │  │              │  │  check)       │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                 │                   │          │
│         └─────────┬───────┘                   │          │
│                   ▼                           ▼          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              VIBE-DOC CLI CORE (npm package)         │ │
│  │                                                     │ │
│  │  ┌──────────┐ ┌────────────┐ ┌───────────────────┐  │ │
│  │  │ Scanner  │ │ Classifier │ │ Template Engine   │  │ │
│  │  │          │ │ (rules +   │ │ (render + export) │  │ │
│  │  │          │ │  LLM fallb)│ │                   │  │ │
│  │  └────┬─────┘ └─────┬──────┘ └────────┬──────────┘  │ │
│  │       │             │                 │             │ │
│  │  ┌────▼─────────────▼─────────────────▼──────────┐  │ │
│  │  │           Project State (JSON)                 │  │ │
│  │  │  scan results, classification, gap map,        │  │ │
│  │  │  generation history, staleness data            │  │ │
│  │  └───────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                           │                              │
│                           ▼                              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           TEMPLATE REGISTRY                          │ │
│  │  Embedded (local) ← override ← Remote (HTTP fetch)  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │    USER'S PROJECT      │
              │  (mounted folder)      │
              │  ├── docs/generated/   │
              │  │   ├── *.md          │
              │  │   └── *.docx        │
              │  └── .vibe-doc/        │
              │      └── state.json    │
              └────────────────────────┘
```

### Data Flow — Full Pipeline

```
1. User runs plugin
       │
2. ┌───▼───────────────────────────┐
   │ Entry Gate                     │
   │ "Add context?" or "Start scan" │
   └───┬──────────────┬────────────┘
       │              │
   [context]     [cold start]
       │              │
3. ┌───▼──────────────▼────────────┐
   │ Intake Interview (if chosen)   │
   │ 4-6 questions → project profile│
   └───┬───────────────────────────┘
       │
4. ┌───▼───────────────────────────┐
   │ Artifact Scanner               │
   │ Reads mounted folder:          │
   │ .md, .claude/, .agent/, .ai/,  │
   │ docs/, git log, package.*,     │
   │ CI configs, code structure     │
   │ → artifact inventory JSON      │
   └───┬───────────────────────────┘
       │
5. ┌───▼───────────────────────────┐  CHECKPOINT: user confirms
   │ Classification                 │  or corrects
   │ Rule engine scores signals     │
   │ If confidence >= 0.85 → done   │
   │ If ambiguous → LLM resolves    │
   │ → app category + context       │
   └───┬───────────────────────────┘
       │
6. ┌───▼───────────────────────────┐
   │ Gap Analysis                   │
   │ (category × context) → matrix  │
   │ For each doc type:             │
   │   breadcrumb scan → found/miss │
   │   tier assignment (R/R/O)      │
   │ → gap report JSON              │
   └───┬───────────────────────────┘
       │
7. ┌───▼───────────────────────────┐  CHECKPOINT: user reviews
   │ Gap Report Presentation        │  summary, then interactive
   │ Summary → walk-through         │  walkthrough per gap
   └───┬───────────────────────────┘
       │ (per approved gap)
       │
8. ┌───▼───────────────────────────┐
   │ Synthesis                      │
   │ 2-3 targeted questions         │
   │ Extract from artifacts         │
   │ Merge with user answers        │
   │ Render template → md + docx    │
   └───┬───────────────────────────┘
       │
9. ┌───▼───────────────────────────┐
   │ Output                         │
   │ Write to docs/generated/       │
   │ Update .vibe-doc/state.json    │
   │ Show completion summary        │
   └───────────────────────────────┘
```

---

## Plugin Shell (Cowork/Claude Code)

### SKILL.md Files
The conversational layer. Each skill drives one phase of the pipeline and reads/writes project state through the CLI core.

**PRD ref:** `prd.md > Epic: Initial Setup & Entry`, `Epic: Gap Analysis & Reporting`, `Epic: Document Synthesis`

### Skills

| Skill | Trigger | Responsibility |
|-------|---------|---------------|
| `scan` | "scan my project", "run vibe doc", "check my documentation" | Entry gate → intake interview (optional) → artifact scan → classification → gap report presentation |
| `generate` | "generate docs", "fix my gaps", "write the runbook" | Walk through approved gaps → synthesis questions → document generation → output |
| `check` | "check my docs", "am I ready to deploy" | Run `vibe-doc check` → present pass/fail with details |
| `guide` | (internal, not user-invocable) | Shared behavior: tone, state management, template loading, output formatting |

### Commands

| Command | Description |
|---------|------------|
| `scan` | Quick-invoke: run full scan pipeline |
| `generate` | Quick-invoke: generate docs for identified gaps |
| `check` | Quick-invoke: CI-style documentation check |
| `status` | Show current scan results, classification, and gap summary |

### State Management Across Skills

All skills share state through `.vibe-doc/state.json` in the user's project folder. The CLI core reads and writes this file. Skills invoke CLI commands via bash and read the resulting state.

```json
// .vibe-doc/state.json
{
  "version": "1.0.0",
  "lastScan": "2026-04-11T14:30:00Z",
  "projectProfile": {
    "interviewAnswers": { /* ... */ },
    "providedContext": true
  },
  "artifactInventory": {
    "totalArtifacts": 132,
    "categories": {
      "architectureDocs": [{ "path": ".ai/ARCHITECTURE.md", "summary": "..." }],
      "agentSkills": [{ "path": ".agent/skills/debugging/SKILL.md", "summary": "..." }],
      /* ... */
    },
    "gitStats": {
      "commitCount": 455,
      "authorDistribution": { /* ... */ },
      "conventionalCommitRate": 1.0,
      "dateRange": ["2025-01-15", "2026-04-11"]
    }
  },
  "classification": {
    "primaryCategory": "Web Application",
    "secondaryCategory": "API/Microservice",
    "deploymentContext": ["Internal Tooling"],
    "confidence": 0.87,
    "rationale": "React frontend with Express API routes, Firebase backend...",
    "userConfirmed": true
  },
  "gapReport": {
    "summary": {
      "required": 2,
      "recommended": 4,
      "optional": 3,
      "coveragePercent": 45
    },
    "gaps": [
      {
        "docType": "runbook",
        "tier": "required",
        "domain": "operational",
        "artifactsScanned": ["CLAUDE.md", ".github/workflows/deploy.yml"],
        "found": ["deployment target mentioned", "CI pipeline exists"],
        "missing": ["incident response procedures", "rollback steps", "monitoring details"],
        "rationale": "Cloud Functions with 14 domains and no operational docs"
      }
      /* ... */
    ]
  },
  "generatedDocs": [
    {
      "docType": "runbook",
      "generatedAt": "2026-04-11T15:00:00Z",
      "paths": {
        "markdown": "docs/generated/runbook.md",
        "docx": "docs/generated/runbook.docx"
      },
      "sourceArtifacts": [".claude/CLAUDE.md", "functions/src/index.ts"],
      "confidenceSections": {
        "high": ["deployment-procedure", "environment-config"],
        "low": ["incident-response", "disaster-recovery"]
      },
      "stateHash": "abc123"
    }
  ],
  "history": [
    {
      "docType": "runbook",
      "version": 1,
      "generatedAt": "2026-04-11T15:00:00Z",
      "path": "docs/generated/.history/runbook-v1-2026-04-11.md"
    }
  ]
}
```

---

## CLI Core (`vibe-doc` npm package)

### Package Structure

The CLI core is a TypeScript Node.js package that handles all deterministic operations. Skills invoke it via bash; CI pipelines invoke it directly.

**PRD ref:** `prd.md > Epic: Artifact Scanning & Inventory`, `Epic: Application Classification`, `Epic: CI/CD Documentation Gate`, `Epic: Auto-Update & Staleness Detection`, `Epic: Document Versioning`, `Epic: Multi-Language Support`

### CLI Commands

```bash
# Full scan: inventory artifacts, prepare classification data, run gap analysis
vibe-doc scan [--path <project-path>] [--profile <profile.json>]

# Check: CI-safe pass/fail check for Required docs
vibe-doc check [--path <project-path>] [--threshold <commits>]

# Generate: render a specific doc type from current state
vibe-doc generate <doc-type> [--format md|docx|both] [--answers <answers.json>]

# Status: print current state summary
vibe-doc status [--path <project-path>]

# Templates: manage template registry
vibe-doc templates update    # fetch latest from remote
vibe-doc templates list      # list available doc types
vibe-doc templates show <type>  # show template details + breadcrumbs
```

### Module Architecture

```
packages/vibe-doc/
├── src/
│   ├── index.ts                 # CLI entry point (commander.js)
│   ├── scanner/
│   │   ├── index.ts             # Orchestrates all scanners
│   │   ├── file-scanner.ts      # Discovers and catalogs files by type
│   │   ├── git-scanner.ts       # Extracts git history, authors, patterns
│   │   ├── code-scanner.ts      # Language detection, entry points, routes
│   │   └── artifact-scanner.ts  # Reads and summarizes vibe coding artifacts
│   ├── classifier/
│   │   ├── index.ts             # Orchestrates rule engine + LLM fallback
│   │   ├── scoring-engine.ts    # Rule-based signal scoring matrix
│   │   ├── signals.ts           # Signal extraction from scan results
│   │   └── llm-prompt.ts        # Structured prompt for ambiguity resolution
│   ├── gap-analyzer/
│   │   ├── index.ts             # Runs breadcrumb heuristics against inventory
│   │   ├── matrix.ts            # (category × context) → required doc types
│   │   ├── breadcrumbs.ts       # Heuristic search patterns per doc type
│   │   └── tier-assigner.ts     # Assigns Required/Recommended/Optional
│   ├── templates/
│   │   ├── index.ts             # Template loading (embedded + remote override)
│   │   ├── registry.ts          # Remote template fetching and caching
│   │   ├── renderer.ts          # Populates templates with extracted data
│   │   └── embedded/            # Default templates shipped with package
│   │       ├── adr.md
│   │       ├── runbook.md
│   │       ├── threat-model.md
│   │       ├── api-spec.md
│   │       ├── deployment-procedure.md
│   │       ├── test-plan.md
│   │       └── data-model.md
│   ├── generator/
│   │   ├── index.ts             # Orchestrates doc generation
│   │   ├── markdown-writer.ts   # Writes .md files
│   │   └── docx-writer.ts       # Converts markdown → .docx via docx package
│   ├── checker/
│   │   ├── index.ts             # CI check logic
│   │   └── staleness.ts         # Timestamp-based staleness detection
│   ├── versioning/
│   │   ├── index.ts             # Version tracking and history management
│   │   └── differ.ts            # Diff summary generation between versions
│   ├── state/
│   │   ├── index.ts             # Read/write .vibe-doc/state.json
│   │   └── schema.ts            # TypeScript interfaces for state shape
│   └── utils/
│       ├── git.ts               # Git command wrappers
│       ├── language-detect.ts   # Detect project language from package files
│       └── logger.ts            # Structured logging
├── package.json
├── tsconfig.json
└── README.md
```

---

## Scanner

### File Scanner
Walks the project directory and categorizes files by type.

**PRD ref:** `prd.md > Epic: Artifact Scanning & Inventory`

**Detection rules:**

| Signal | Category |
|--------|----------|
| `CLAUDE.md`, `.cursorrules`, `.windsurfrules` | Config-as-docs |
| `.ai/`, `.agent/skills/` | Agent artifacts |
| `.claude/`, `.claude/commands/` | Session/IDE context |
| `docs/`, `*.md` in root | Documentation |
| `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod` | Package config |
| `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile` | CI/CD config |
| `Dockerfile`, `docker-compose.yml`, `*.tf` | Infrastructure |
| `*.test.*`, `*.spec.*`, `__tests__/`, `tests/` | Test files |
| `swagger.json`, `openapi.yaml`, `*.graphql` | API specs |

### Git Scanner
Extracts development history patterns.

**Extracts:**
- Commit count, date range, frequency distribution
- Author distribution (identifies bot/agent authors)
- Conventional commit compliance rate
- Message pattern analysis (feat/fix/refactor distribution)
- File churn (most-changed files)

### Code Scanner
Language-aware code structure analysis.

**PRD ref:** `prd.md > Epic: Multi-Language Support`

**Language detection heuristics:**

| Package File | Language | Entry Point Patterns | Route Patterns |
|-------------|----------|---------------------|----------------|
| `package.json` | Node.js/TypeScript | `main`, `src/index.*` | Express routes, Next.js pages, API routes |
| `pyproject.toml` / `setup.py` | Python | `__main__.py`, `app.py` | Flask/FastAPI routes, Django urls |
| `Cargo.toml` | Rust | `src/main.rs` | Actix/Axum routes |
| `go.mod` | Go | `main.go`, `cmd/` | net/http handlers, Gin routes |
| `pom.xml` / `build.gradle` | Java/Kotlin | `src/main/java/` | Spring controllers |

### Artifact Scanner
Reads and summarizes vibe coding artifacts (markdown files, configs, session context). Produces structured summaries suitable for LLM classification and breadcrumb matching.

---

## Classifier

### Design: Hybrid (Rules First, LLM for Ambiguity)
Two-layer classification: a deterministic rule-based scoring engine handles clear-cut projects instantly, and an LLM fallback fires only when the rules can't reach confidence. This means `vibe-doc check` in CI runs fast and without an LLM dependency for the 70-80% of projects that have obvious classifications.

**Input:** Artifact inventory JSON (scan results + git stats + code analysis)

### Layer 1: Rule-Based Scoring Engine
Each signal from the scan is assigned points toward one or more categories. The engine sums scores and checks whether a clear winner emerges.

**Signal scoring table (representative subset):**

| Signal | Category Points |
|--------|----------------|
| Has Express/Fastify/Koa routes | Web App +3, API +3 |
| Has React/Vue/Svelte components | Web App +4 |
| Has `Dockerfile` | +1 to all (infra signal, not category) |
| Has `*.tf` or `*.tfvars` | Infrastructure +4 |
| Has Flask/FastAPI/Django routes | Web App +3, API +3 |
| Has ML model files (`.pkl`, `.h5`, `.onnx`) | AI/ML +5 |
| Has `transformers`, `torch`, `tensorflow` deps | AI/ML +4 |
| Has ETL/pipeline keywords in configs | Data Pipeline +4 |
| Has mobile platform configs (`Info.plist`, `AndroidManifest.xml`) | Mobile +5 |
| Has third-party API clients without own routes | Integration +3 |
| Has `HIPAA`, `SOX`, `PCI` in any doc | Regulated context +5 |
| Has RBAC/tenant ID patterns in code | Multi-Tenant context +3 |
| Has SLA/uptime mentions in docs | Customer-Facing context +3 |
| Has `internal`, `tooling`, `admin` in project description | Internal Tooling context +3 |

**Confidence threshold:** If the top-scoring category has >= 2x the score of the runner-up, confidence is HIGH (>= 0.85) and the rule engine returns the classification directly. If the gap is smaller, confidence is MEDIUM (0.5-0.84) and the LLM is invoked.

**Context modifiers** are scored independently and can co-occur (a project can be both Regulated and Customer-Facing).

### Layer 2: LLM Fallback (Ambiguity Resolution)
Fires only when rule-based confidence < 0.85. The CLI core prepares a structured prompt including the scan summary AND the rule engine's top candidates with scores.

**Prompt structure:**
```
Given this project scan summary:
- Files: [categorized file list]
- Dependencies: [package dependencies]
- Code patterns: [routes, models, test files found]
- Git history: [commit stats, author patterns]
- Existing docs: [what documentation already exists]
- User context: [interview answers, if provided]

Rule-based scoring produced these candidates:
- Web Application: 12 points
- API/Microservice: 10 points
- AI/ML System: 8 points

The scores are close. Based on the full project context, classify:
1. Primary function category (one of: Web Application, API/Microservice, Data Pipeline, Infrastructure/Platform, Mobile Application, AI/ML System, Integration/Connector)
2. Secondary category (if applicable)
3. Deployment context modifiers (any of: Regulated, Customer-Facing, Internal Tooling, Multi-Tenant, Edge/Embedded)
4. Confidence score (0.0-1.0)
5. Rationale (2-3 sentences explaining why this classification over the alternatives)

Respond in JSON format.
```

**Output:** Classification object stored in `state.json`, presented to user for confirmation.

**Non-determinism mitigation:** User confirms or corrects at checkpoint. Corrected classification overrides engine output and is stored as `userConfirmed: true`. When the rule engine resolves with high confidence, the result is deterministic — same project always gets the same classification.

---

## Gap Analyzer

### Documentation Matrix
Maps (category × context) to required document types with tier assignments.

**PRD ref:** `prd.md > Epic: Gap Analysis & Reporting`, `Epic: Document Types (v1 Focus)`

**Tier assignment logic:**

| Doc Type | Web App | API/Micro | Data Pipeline | Infra/Platform | AI/ML | Integration |
|----------|---------|-----------|--------------|----------------|-------|-------------|
| ADR | Recommended | Recommended | Recommended | Recommended | Recommended | Recommended |
| Runbook | Required | Required | Required | Required | Required | Recommended |
| Threat Model | Recommended | Required | Recommended | Recommended | Required | Recommended |
| API Spec | Required | Required | Optional | Optional | Recommended | Required |
| Deploy Procedure | Required | Required | Required | Required | Required | Recommended |
| Test Plan | Recommended | Recommended | Required | Recommended | Required | Recommended |
| Data Model | Required | Recommended | Required | Optional | Required | Optional |

**Context modifiers elevate tiers:**
- Regulated → elevates ALL security docs to Required, elevates ADR to Required
- Customer-Facing → elevates Runbook, API Spec, Test Plan to Required
- Multi-Tenant → adds Tenant Isolation Proof (Required), elevates Threat Model to Required

### Breadcrumb Heuristics
Each doc type has search patterns the gap analyzer runs against the artifact inventory.

**Example — Runbook breadcrumbs:**
```json
{
  "docType": "runbook",
  "searchPatterns": [
    { "target": "artifacts", "keywords": ["restart", "rollback", "deploy", "monitor", "health check", "incident", "on-call"] },
    { "target": "files", "patterns": ["**/Dockerfile", "**/*.yml", "**/ecosystem.config.*"] },
    { "target": "git", "patterns": ["fix:", "hotfix:", "revert:"] },
    { "target": "code", "patterns": ["healthCheck", "gracefulShutdown", "process.exit", "retry"] }
  ],
  "requiredSections": ["service-overview", "startup-procedure", "health-checks", "common-issues", "rollback-procedure", "escalation-path"],
  "gapQuestions": [
    "What's the process for restarting the service if it goes down?",
    "Who gets paged when something breaks, and what do they check first?",
    "What's your rollback procedure if a deployment goes wrong?"
  ]
}
```

---

## Template Engine

### Embedded Templates
Ship with the package in `src/templates/embedded/`. Each template is a markdown file with:
- Section headers matching `requiredSections` from breadcrumbs
- Placeholder tokens (`{{extracted.service-overview}}`, `{{user.rollback-procedure}}`)
- Guidance comments for empty sections
- Metadata header (doc type, version, generated date)

### Remote Override
On scan, the CLI checks a remote URL for a template manifest:
```
GET https://templates.vibe-doc.dev/v1/manifest.json
→ { "version": "1.2.0", "templates": { "runbook": { "hash": "..." }, ... } }
```
If the remote version is newer than embedded, download and cache locally in `.vibe-doc/templates/`. Fall back to embedded if offline or fetch fails.

### Renderer
Takes a template + extraction data + user answers and produces the final document:
1. Replace `{{extracted.*}}` tokens with data from artifact scanning
2. Replace `{{user.*}}` tokens with data from synthesis interview
3. Mark empty sections with `<!-- NEEDS INPUT: [guidance text] -->`
4. Tag confidence levels per section based on source quality

---

## Generator

### Markdown Writer
Writes rendered templates to `docs/generated/<doc-type>.md` with metadata header:
```markdown
<!-- Generated by Vibe Doc v1.0.0 -->
<!-- Date: 2026-04-11T15:00:00Z -->
<!-- Classification: Web Application + Internal Tooling -->
<!-- Source artifacts: 12 files scanned -->
<!-- Confidence: 3 high, 2 medium, 1 low sections -->
```

### Docx Writer
Converts markdown to .docx using the `docx` npm package. Applies professional formatting:
- Navy/steel color scheme
- Properly styled headings and tables
- Header with doc title, footer with page numbers
- Confidence annotations rendered as margin comments

**PRD ref:** `prd.md > Epic: Document Synthesis`

---

## Checker

### CI Check Logic
`vibe-doc check` runs without interactive prompts. Reads `.vibe-doc/state.json`:

1. If no state exists → FAIL ("Run `vibe-doc scan` first")
2. Load classification and gap report from state
3. For each Required doc type:
   - Check if `docs/generated/<type>.md` exists
   - Check staleness: compare doc generation timestamp against git log
4. Exit 0 (pass) if all Required docs exist and are current
5. Exit 1 (fail) with list of missing/stale docs

### Staleness Detection
Timestamp-based (PRD default: 20 commits threshold, configurable):

```typescript
function isStale(doc: GeneratedDoc, threshold: number = 20): boolean {
  const commitsSinceGeneration = getCommitCountSince(doc.generatedAt);
  return commitsSinceGeneration >= threshold;
}
```

**PRD ref:** `prd.md > Epic: Auto-Update & Staleness Detection`

---

## Versioning

### History Management
When regenerating an existing doc:
1. Move current version to `docs/generated/.history/<type>-v<N>-<date>.md`
2. Generate new version in place
3. Produce diff summary (sections added, removed, changed)
4. Update version counter in state.json

**PRD ref:** `prd.md > Epic: Document Versioning`

---

## File Structure

```
vibe-doc/                           # Monorepo root
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest
├── skills/
│   ├── scan/
│   │   └── SKILL.md               # Full scan pipeline skill
│   ├── generate/
│   │   └── SKILL.md               # Document generation skill
│   ├── check/
│   │   └── SKILL.md               # Documentation check skill
│   └── guide/
│       ├── SKILL.md               # Shared behavior (internal)
│       ├── templates/
│       │   └── project-profile-template.md
│       └── references/
│           ├── classification-taxonomy.md
│           ├── documentation-matrix.md
│           └── breadcrumb-heuristics.md
├── commands/
│   ├── scan.md                    # Quick-invoke: scan
│   ├── generate.md                # Quick-invoke: generate
│   ├── check.md                   # Quick-invoke: check
│   └── status.md                  # Quick-invoke: status
├── packages/
│   └── vibe-doc/                  # npm package (CLI core)
│       ├── src/
│       │   ├── index.ts           # CLI entry (commander.js)
│       │   ├── scanner/
│       │   │   ├── index.ts
│       │   │   ├── file-scanner.ts
│       │   │   ├── git-scanner.ts
│       │   │   ├── code-scanner.ts
│       │   │   └── artifact-scanner.ts
│       │   ├── classifier/
│       │   │   ├── index.ts
│       │   │   ├── scoring-engine.ts
│       │   │   ├── signals.ts
│       │   │   └── llm-prompt.ts
│       │   ├── gap-analyzer/
│       │   │   ├── index.ts
│       │   │   ├── matrix.ts
│       │   │   ├── breadcrumbs.ts
│       │   │   └── tier-assigner.ts
│       │   ├── templates/
│       │   │   ├── index.ts
│       │   │   ├── registry.ts
│       │   │   ├── renderer.ts
│       │   │   └── embedded/
│       │   │       ├── adr.md
│       │   │       ├── runbook.md
│       │   │       ├── threat-model.md
│       │   │       ├── api-spec.md
│       │   │       ├── deployment-procedure.md
│       │   │       ├── test-plan.md
│       │   │       └── data-model.md
│       │   ├── generator/
│       │   │   ├── index.ts
│       │   │   ├── markdown-writer.ts
│       │   │   └── docx-writer.ts
│       │   ├── checker/
│       │   │   ├── index.ts
│       │   │   └── staleness.ts
│       │   ├── versioning/
│       │   │   ├── index.ts
│       │   │   └── differ.ts
│       │   ├── state/
│       │   │   ├── index.ts
│       │   │   └── schema.ts
│       │   └── utils/
│       │       ├── git.ts
│       │       ├── language-detect.ts
│       │       └── logger.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── package.json                    # Monorepo root (workspaces)
├── tsconfig.json                   # Root TypeScript config
├── docs/                           # Planning artifacts
│   ├── scope.md
│   ├── prd.md
│   └── spec.md
├── process-notes.md
└── README.md
```

---

## Key Technical Decisions

### 1. Hybrid Classification (Rules + LLM Fallback)
**Decision:** Use a deterministic rule-based scoring engine as the primary classifier, with an LLM fallback that fires only when the rules can't reach high confidence (>= 0.85).
**Why:** Rules handle 70-80% of projects instantly and deterministically — critical for CI where `vibe-doc check` shouldn't depend on an LLM. The LLM fires only for genuinely ambiguous cases (e.g., a project with both Express routes and Terraform modules). User confirmation at the checkpoint catches any misclassification from either layer.
**Tradeoff:** The scoring table needs tuning across diverse projects. Mitigated by starting with conservative weights and adjusting based on user correction data.

### 2. Monorepo With npm Workspaces
**Decision:** Plugin and CLI package live in one repo with npm workspaces.
**Why:** They share types, templates, and development lifecycle. Shipping independently (plugin via .plugin file, CLI via npm) serves different audiences without duplication.
**Tradeoff:** Slightly more complex build setup. Worth it for code reuse and atomic versioning.

### 3. Embedded Templates With Remote Override
**Decision:** Ship all templates locally; check remote for updates.
**Why:** Works offline (essential for CI and air-gapped environments). Stays current without requiring plugin updates for new doc types or improved heuristics.
**Tradeoff:** Cache invalidation complexity. Mitigated by version-hash comparison in manifest.

### 4. State in Project Folder (`.vibe-doc/`)
**Decision:** Store all plugin state in the user's project folder, not in a central location.
**Why:** State travels with the project (git-committable), visible and auditable, no cross-project contamination, works on any machine.
**Tradeoff:** Adds files to the project. Mitigated by adding `.vibe-doc/` to standard .gitignore recommendations (or making it committable if the team wants shared state).

---

## Dependencies & External Services

| Dependency | Purpose | Docs |
|-----------|---------|------|
| `commander` | CLI argument parsing | [commander.js](https://github.com/tj/commander.js) |
| `docx` | Word document generation | [docx.js.org](https://docx.js.org/) |
| `glob` / `fast-glob` | File pattern matching | [fast-glob](https://github.com/mrmlnc/fast-glob) |
| `simple-git` | Git history extraction | [simple-git](https://github.com/steveukx/git-js) |
| `diff` | Text diffing for versioning | [diff](https://github.com/kpdecker/jsdiff) |
| `marked` | Markdown parsing for template rendering | [marked](https://marked.js.org/) |

**No API keys required.** All external services are optional (template registry fetch). No paid dependencies.

---

## Open Issues

1. **Template registry URL** — needs to be decided before build. GitHub raw content is simplest; a dedicated domain (templates.vibe-doc.dev) is more professional. Can start with GitHub and migrate.
2. **docx formatting depth** — how much visual polish for generated .docx files? The docx skill in Cowork produces very polished output; the CLI package may need a simpler approach. Consider shipping pre-formatted templates.
3. **Breadcrumb heuristic validation** — the 7 v1 doc types need breadcrumb patterns validated against multiple real projects. 626Labs is the first; need 2-3 more to be confident.
4. **Plugin manifest schema** — need to verify exact `.claude-plugin/plugin.json` fields supported for skills + commands + npm package reference.
