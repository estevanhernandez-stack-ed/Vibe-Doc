# Vibe Doc — Product Requirements

## Problem Statement
Developers building with AI-assisted workflows produce applications at unprecedented speed, but the artifacts of that process — chat transcripts, planning docs, agent skills, decision logs — don't translate into the standard technical documentation that corporate production environments require. Existing documentation tools generate docs from code, but none read development process artifacts to understand *why* things were built, *what was rejected*, or *what's missing*. The result: vibe-coded applications either stall at deployment gates or ship with undocumented risk.

## User Stories

### Epic: Initial Setup & Entry

- As a developer, I want to run the plugin and immediately choose whether to provide context about my project or let the scanner start cold, so that I'm not forced through an interview if I just want results.
  - [ ] First interaction presents two clear paths: "Add context first" or "Start scanning"
  - [ ] Choosing "Start scanning" immediately begins artifact inventory on the mounted folder
  - [ ] Choosing "Add context first" enters a focused intake interview (~10-15 min)
  - [ ] Edge case: if no folder is mounted, the plugin prompts the user to select one before proceeding

- As a developer providing context, I want the intake interview to be focused and fast, asking only what the scanner can't figure out on its own, so that I'm not wasting time on things the artifacts already show.
  - [ ] Interview asks about: deployment target (where is this going?), compliance requirements (any regulatory context?), known documentation gaps (anything you already know is missing?), and team context (solo dev or team?)
  - [ ] Interview completes in 4-6 questions maximum
  - [ ] Answers are stored as a project profile that persists between sessions
  - [ ] Edge case: user gives minimal answers — plugin proceeds with defaults and leans on artifact analysis

### Epic: Artifact Scanning & Inventory

- As a developer, I want the plugin to automatically discover and catalog all vibe coding artifacts in my project, so that I don't have to manually point it at files.
  - [ ] Scans for: markdown docs (.md), CLAUDE.md, .cursorrules, .ai/ directory, .agent/skills/, .claude/ directory, docs/ directory, git history (commit messages, authors, frequency), package configs (package.json, requirements.txt, Cargo.toml, etc.), CI/CD configs (.github/workflows/, .gitlab-ci.yml), code structure (file tree, entry points, route definitions), test files and coverage configs
  - [ ] Produces an artifact inventory listing each discovered artifact, its type, location, and a content summary
  - [ ] Inventory is presented to the user as a checkpoint before proceeding
  - [ ] Edge case: sparse artifacts — plugin notes what categories are empty and proceeds with code-only analysis. No minimum threshold required.

- As a developer, I want the plugin to read git history to understand development patterns, so that commit frequency, author patterns, and message quality feed into the analysis.
  - [ ] Extracts: commit count, date range, author distribution, conventional commit compliance rate, commit message patterns (feat/fix/refactor distribution)
  - [ ] Identifies: AI-generated commit patterns (batch commits, formulaic messages, bot authors)
  - [ ] Flags: commits without meaningful messages, large diffs without explanation

### Epic: Application Classification

- As a developer, I want the plugin to classify my application's type and deployment context, so that the gap report is tailored to what my specific app actually needs.
  - [ ] Determines primary function category: Web Application, API/Microservice, Data Pipeline, Infrastructure/Platform, Mobile Application, AI/ML System, Integration/Connector
  - [ ] Determines deployment context modifiers: Regulated (HIPAA, SOX, PCI-DSS, FedRAMP), Customer-Facing, Internal Tooling, Multi-Tenant, Edge/Embedded
  - [ ] Classification is presented to the user for confirmation or correction before proceeding
  - [ ] If user provided intake interview context, classification uses both artifact signals and interview answers
  - [ ] Edge case: ambiguous classification (e.g., app is both a Web App and an API) — plugin identifies the primary and secondary categories and asks the user to confirm

### Epic: Gap Analysis & Reporting

- As a developer, I want to see a comprehensive gap report showing what documentation exists, what's missing, and how critical each gap is, so that I can prioritize what to produce.
  - [ ] Gap report organizes findings by domain: Architecture, Operational, Security, Change Management
  - [ ] Each gap is tagged with a priority tier: Required (deployment blocker), Recommended (should do), Optional (nice-to-have)
  - [ ] Priority tier is determined by the (app type × deployment context) classification matrix
  - [ ] For each gap: shows what artifacts were scanned, what was found, what's missing, and the rationale for the tier
  - [ ] For existing documentation: notes what's present and whether it appears complete or partial
  - [ ] Summary statistics: total gaps by tier, percentage coverage, highest-risk domains

- As a developer, I want the gap report presented as a summary overview first, then be able to walk through each gap interactively, so that I see the full picture before acting on individual items.
  - [ ] Summary overview is a single scrollable output with all gaps, tiers, and stats
  - [ ] After summary, plugin offers to walk through gaps one at a time starting with Required tier
  - [ ] For each gap: user can approve generation, skip, or mark as not-applicable
  - [ ] Edge case: zero Required gaps — plugin congratulates the user and offers to walk through Recommended items

### Epic: Document Synthesis

- As a developer, I want the plugin to generate draft documentation pre-populated with information extracted from my artifacts, so that I'm not writing from scratch.
  - [ ] Before generating each document, the plugin asks 2-3 targeted questions to fill extraction gaps
  - [ ] Questions are specific to what the breadcrumb heuristics couldn't find (e.g., "I didn't find any discussion of disaster recovery in your artifacts — what's your backup strategy?")
  - [ ] Generated documents include: populated sections (from artifacts), flagged low-confidence sections (with source references), and empty sections (with guidance on what to fill in)
  - [ ] Each generated doc clearly attributes extracted information to source artifacts (e.g., "Based on discussion in CLAUDE.md" or "Inferred from commit history")

- As a developer, I want generated documents in both markdown and docx format, so that I can commit markdown to my repo and share docx with stakeholders.
  - [ ] Markdown files are written directly to the project folder (e.g., `docs/generated/runbook.md`)
  - [ ] Docx versions are generated on request for any or all documents
  - [ ] Both formats contain identical content and structure
  - [ ] Edge case: project has no docs/ folder — plugin creates it

### Epic: Document Types (v1 Focus)

- As a developer, I want the plugin to generate the 5-7 most impactful document types that apply to most applications, so that I get maximum coverage with minimum effort.
  - [ ] v1 document types:
    - **Architecture Decision Records (ADRs)** — capture the why behind technical choices, extracted from chat transcripts and planning docs
    - **Runbook** — step-by-step operational procedures, extracted from deployment discussions, env configs, health check patterns
    - **Threat Model** — attack surfaces and mitigations, extracted from auth implementations, data handling, dependency analysis
    - **API Specification** — interface contracts, extracted from route definitions, request/response patterns, existing OpenAPI specs
    - **Deployment Procedure** — build/test/deploy pipeline, extracted from CI/CD configs, Dockerfile, env variable discussions
    - **Test Plan** — QA strategy and coverage, extracted from test files, coverage configs, testing conversations
    - **Data Model Documentation** — entities, relationships, schemas, extracted from ORM models, migration files, database setup
  - [ ] Each document type has a dedicated template with sections, guidance, and breadcrumb heuristics
  - [ ] The classification system determines which document types are Required/Recommended/Optional for the project

### Epic: CI/CD Documentation Gate

- As a developer, I want a simple CLI command that checks whether my Required documentation exists and is current, so that I can add it to any deployment pipeline.
  - [ ] `vibe-doc check` command returns pass/fail exit code
  - [ ] Pass: all Required documents exist and are not stale
  - [ ] Fail: lists which Required documents are missing or stale, with one-line descriptions
  - [ ] Staleness is timestamp-based: if a Required doc was generated before the last N significant commits to relevant files, it's flagged as potentially stale
  - [ ] Command runs without interactive prompts (CI-safe)
  - [ ] Edge case: no classification profile exists — command fails with a message to run the full scan first

### Epic: Auto-Update & Staleness Detection

- As a developer, I want the plugin to tell me when my generated documentation may be outdated, so that I know when to regenerate.
  - [ ] When running the full scan or `vibe-doc check`, the plugin compares document generation timestamps against recent git activity
  - [ ] Documents flagged as stale include: which doc, when it was generated, how many commits have landed since, and which files changed that are relevant to that doc type
  - [ ] User can approve regeneration for stale docs (same synthesis flow: 2-3 questions + generate)
  - [ ] Staleness threshold is configurable (default: flag if >20 commits since generation)

### Epic: Document Versioning

- As a developer, I want to see how my generated documentation has changed over time, so that I can track the evolution of my project's documentation.
  - [ ] Each generated document includes a metadata header with: generation timestamp, plugin version, classification profile hash, source artifact count
  - [ ] When regenerating a document, the plugin produces a diff summary showing what changed
  - [ ] Previous versions are preserved (e.g., `docs/generated/.history/runbook-2026-04-11.md`)
  - [ ] Diff summary highlights: new sections, removed sections, changed content, updated confidence levels

### Epic: Multi-Language Support

- As a developer working in any tech stack, I want the plugin to analyze my project regardless of programming language, so that it works for Python, JavaScript, Rust, Go, Java, or any other ecosystem.
  - [ ] Artifact scanning is language-agnostic for non-code artifacts (markdown, configs, git history)
  - [ ] Code analysis adapts to the detected language: identifies entry points, route definitions, model/schema files, test directories, and package managers for the specific ecosystem
  - [ ] Language detection uses package config files (package.json → Node, Cargo.toml → Rust, pyproject.toml → Python, etc.)
  - [ ] Document templates are language-aware (e.g., a Runbook for a Python app references pip/venv; for Node it references npm/node_modules)
  - [ ] Edge case: multi-language monorepo — plugin identifies all languages present and generates docs that cover the full stack

## What We're Building
Everything above. The core pipeline (intake → scan → classify → extract → gap report → synthesize → output) is the foundation. CI/CD gate, auto-update, versioning, and multi-language support build on top of it. All features are v1 targets.

## What We'd Add With More Time
- **Content-aware staleness detection** — re-run extraction on changed files and compare against existing docs, rather than just timestamp comparison.
- **Pre-built GitHub Action** — a reusable workflow wrapper around `vibe-doc check` for zero-config CI integration.
- **Team mode** — aggregate documentation across multiple repositories into an org-level documentation health dashboard.
- **Chat transcript import** — ingest exported chat logs from Claude, ChatGPT, or Cursor as additional artifact sources.
- **Custom document type templates** — let users define their own doc types with custom breadcrumb heuristics.
- **Compliance framework presets** — one-click profiles for HIPAA, SOC2, PCI-DSS that auto-configure the Required tier.

## Non-Goals
1. **Not a code documentation tool.** We don't generate docstrings, inline comments, or API reference docs from code. That's what DocuWriter and Mintlify do. We generate process and operational documentation from development artifacts.
2. **Not a compliance certification tool.** We identify gaps and generate draft documentation, but we don't certify compliance. The generated threat model helps you pass a security review; it doesn't replace one.
3. **Not a project management tool.** We read backlogs and planning docs as artifacts, but we don't manage tasks, sprints, or workflows.
4. **Not a real-time monitoring tool.** Staleness detection runs on-demand (during scans or CI checks), not as a background daemon.
5. **Not prescriptive about process.** We analyze whatever artifacts exist. We don't require or enforce a specific development workflow (like spec-driven-dev). If you vibe coded the whole thing in a single chat session, we work with what you've got.

## Open Questions
1. **Staleness threshold tuning** — is 20 commits the right default, or should it be time-based (e.g., 2 weeks)? **Can wait for build.**
2. **Document output location** — `docs/generated/` is clean but some teams may want docs in different locations. Should this be configurable? **Can wait for build.**
3. **Breadcrumb heuristic coverage** — the thesis defines heuristics for the 7 v1 doc types, but they need validation against real projects beyond 626Labs. **Surfaces during build.**
4. **Plugin naming** — "Vibe Doc" is the working name. Is this the shipping name? **Can wait.**
