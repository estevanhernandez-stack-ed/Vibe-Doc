# Vibe Doc — Vibe Coding Artifact Documentation Plugin

## Idea
A Claude plugin (Cowork + CLI) that scans a project's vibe coding artifacts, classifies the application type and deployment context, identifies documentation gaps, and produces production-grade technical documents — bridging the gap between AI-assisted development outputs and corporate deployment requirements.

## Who It's For
Developers who build with AI-assisted (vibe coding) workflows — using Claude Code, Cowork, Cursor, Copilot, or any AI coding tool — and need to produce standard technical documentation for production deployment. Specifically:

- **Solo builders / indie devs** shipping vibe-coded apps into environments that require documentation (client projects, enterprise contracts, app store submissions)
- **Startup teams** moving fast with AI tools who need to retroactively document for investors, compliance, or team scaling
- **Enterprise developers** using AI coding tools who need to satisfy existing documentation gates and compliance frameworks
- **The builder themselves (Este)** — 626Labs has documented gaps that this plugin will directly address

## Inspiration & References

**Competitive landscape (what exists):**
- [DocuWriter.ai](https://www.docuwriter.ai/) — generates API docs, READMEs, and code comments from code. Code-in, docs-out. No artifact awareness.
- [Mintlify](https://www.mintlify.com) — auto-generates structured docs from codebases. Has an "Autopilot" agent that monitors for changes. Still code-only.
- [Swimm](https://www.augmentcode.com/learn/auto-document-your-code-tools-and-best-practices) — code-coupled documentation that flags stale docs when code changes. Clever but still code-centric.

**What none of them do:** Read development process artifacts (chat transcripts, planning docs, agent skills, decision logs, session context) to understand *why* things were built, *what was rejected*, and *what's missing*. They document code; Vibe Doc documents the *building process*.

**Process inspiration:**
- The spec-driven-dev plugin — phased pipeline with user checkpoints, interview-driven context gathering, document artifacts at each stage. Vibe Doc adapts this pattern for documentation production.
- 626Labs Gold Standard protocol — mandatory documentation files auto-seeded and health-monitored. Vibe Doc generalizes this to any project and any doc type.

**Thesis foundation:**
- "Handling Vibe Coding Artifacts When Deploying to Corporate Production" (Hernandez, 2026) — defines the classification taxonomy, documentation matrix, agent breadcrumb system, and artifact translation process that this plugin implements.

## Goals
1. **Solve the documentation gap for 626Labs** — run the plugin on the 626Labs codebase and produce the missing runbooks, threat model, access control matrix, and onboarding documentation the thesis case study identified.
2. **Ship a general-purpose plugin** that any vibe coder can install and run on their project to get a gap report and generated documentation.
3. **Validate the thesis framework** — prove that the classification taxonomy, breadcrumb system, and translation process actually work in practice.
4. **Dual platform support** — works in both Cowork (desktop) and Claude Code (CLI).
5. **Dual output format** — markdown files for the repo, docx for stakeholders/compliance.

## What "Done" Looks Like
A user installs the plugin, mounts their project folder, and runs the main skill. The plugin:

1. **Intake interview** (~10-15 min) — asks focused questions to classify the app type, deployment context, compliance requirements, and known gaps
2. **Artifact scan** — automatically inventories all vibe coding artifacts in the mounted folder (planning docs, CLAUDE.md, agent skills, decision logs, session context, git history, config files, code structure)
3. **Classification** — determines primary function category (Web App, API, Data Pipeline, etc.) and deployment context modifiers (Regulated, Customer-Facing, Internal, Multi-Tenant, Edge)
4. **Gap report** — produces a prioritized report of documentation gaps using three tiers: **Required** (deployment blocker), **Recommended** (should do), **Optional** (nice-to-have). Each gap includes the rationale, the artifacts that were scanned, and what was/wasn't found.
5. **Document synthesis** — for each gap, the user can approve generation. The plugin produces draft documents pre-populated with information extracted from artifacts, with low-confidence sections flagged for human review.
6. **Dual output** — markdown files dropped into the project, with optional docx export for stakeholder distribution.
7. **CI/CD gate** — can be integrated into deployment pipelines to block deploys when Required documentation is missing.
8. **Auto-update** — monitors for code/artifact changes and flags when existing documentation may be stale.
9. **Document versioning** — tracks changes to generated documents over time, with diffing capability.
10. **Multi-language support** — works across different tech stacks and language ecosystems.

The user walks away with: a gap report they can act on, generated documentation they can review and commit, and a CI/CD hook that prevents future documentation drift.

## What's Explicitly Cut
Nothing. Full scope as described above is targeted for v1. The sequencing of build phases will be managed through the spec to ensure the core pipeline (intake → scan → classify → extract → synthesize → output) ships first, with CI/CD integration, auto-update, versioning, and multi-language support built incrementally on top.

**Acknowledged risk:** This is an ambitious scope. The build plan will define clear milestones so the core pipeline is functional before the extended features are layered on.

## Loose Implementation Notes
- **Plugin structure:** Follows existing Cowork plugin patterns (skills/, commands/, SKILL.md files). Multiple skills mapping to thesis phases.
- **Core skills (from thesis):** Artifact Ingestion, Application Classifier, Extraction Engine, Document Synthesis, Gap Analysis & Reporting.
- **Document types for v1 focus (5-7):** ADRs, Runbooks, Threat Model, API Spec, Deployment Procedure, Test Plan, Data Model Documentation. Full matrix available for expansion.
- **Priority model:** Three-tier system (Required / Recommended / Optional) driven by (app type × deployment context) classification matrix.
- **Architecture docs:** Thesis Section 7 + 626Labs ecosystem patterns (Gold Standard, spec-driven-dev plugin, agent skills).
- **Artifact sources:** Mounted project folder contents — .md files, .claude/, .agent/, .ai/, docs/, git history, package configs, code structure, CI/CD configs.
- **Breadcrumb system:** Each document type has search heuristics the extraction engine follows to find relevant information in artifacts.
