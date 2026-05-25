<p align="center">
  <img alt="Vibe Doc — close the documentation vacuum" src="https://626labs.dev/assets/brand/plugins/vibe-doc-banner-1500x500.png" />
</p>

# Vibe Doc

**AI-powered documentation gap analyzer for modern codebases — scan your project, find the holes, generate professional docs from what you already built.**

[![stable](https://img.shields.io/github/v/tag/estevanhernandez-stack-ed/Vibe-Doc?label=stable&color=17d4fa)](https://github.com/estevanhernandez-stack-ed/Vibe-Doc/tags)

## What it does

Vibe coding produces real artifacts fast — working code, architecture decisions, test suites, deployment configs. But corporate documentation requirements don't care about your momentum. You need ADRs, runbooks, threat models, API specs, and deployment procedures. Writing them by hand is bureaucratic overhead. Ignoring them is a shipping risk.

Vibe Doc bridges the gap. It analyzes what you've actually built, finds the documentation holes, and generates the docs you need.

It generates seven core document types against the v1 standard:

- **Architecture Decision Record (ADR)** — why a major architectural choice was made, its context, and trade-offs. Essential for onboarding and future decisions.
- **Runbook** — step-by-step operational procedures: deployment, incident response, disaster recovery, scaling. Keeps your ops team sane at 3am.
- **Threat Model** — security analysis of your system. What can go wrong? What are the attack surfaces? What's the risk profile?
- **API Specification** — OpenAPI 3.0 or equivalent. Every endpoint, schema, auth method, error code. The contract between frontend and backend.
- **Deployment Procedure** — how code gets from your laptop to production. Environments, prerequisites, rollback strategy, validation steps.
- **Test Plan** — unit, integration, E2E coverage strategy. What gets tested, what's out of scope, how you validate quality gates.
- **Data Model** — database schema, relationships, constraints, indexes. The shape of your state.

## How it works

Vibe Doc operates in four stages:

1. **Scan** — walk your codebase. Extract artifacts, identify patterns, build a project profile.
2. **Classify** — a hybrid classifier (rules + LLM) determines your project type and architecture patterns.
3. **Gap analysis** — cross-reference your artifacts against the 7-doc v1 standard. Generate a prioritized gap report.
4. **Generate** — create missing docs from your existing code, configs, and conversations.

The dual-layer design means you get intelligent recommendations in conversations (skills) and deterministic, reproducible outputs from the CLI — CI/CD pipelines use the CLI (no conversational loop), interactive sessions use the skills (agent-interviewed, conversational fill). Both layers share the same classification engine and document templates, so you get consistent results whether you're in a conversation or running automated checks.

### Three-tier priority system

Every gap gets a priority, so you can ship after Required, improve with Recommended, and polish with Optional:

- **Required** — must exist before shipping. ADRs for major decisions, deployment procedures, API specs if you have an API surface. Typically 2-3 docs.
- **Recommended** — professional standard. Runbooks, threat models, test plans. Makes your codebase maintainable. Typically 3-4 docs.
- **Optional** — nice-to-have. Data models for internal use, architectural diagrams, backup procedures. Typically 1-2 docs.

### Classification system

Projects vary wildly, so Vibe Doc uses a hybrid classifier:

- **Rules-based layer** — patterns that are obvious: Dockerfiles, package.json structure, framework detection, cloud config patterns. Fast, deterministic, no hallucination.
- **LLM fallback** — when patterns are ambiguous or custom, ask Claude. Classifies your project type, architecture style, and risk profile based on artifacts and code structure.

The result is a project profile that guides both gap analysis and doc generation.

### Skills and commands

Four slash commands drive the conversational layer:

- `/scan` — scan your project for documentation gaps and generate a report.
- `/generate` — generate missing documentation based on scan results.
- `/check` — validate documentation completeness for deployment readiness.
- `/status` — display current Vibe Doc state and recent activity.

The CLI mirrors the same surface for terminal and CI use:

```bash
npx vibe-doc scan        # scan and generate a gap report
npx vibe-doc generate    # generate missing docs
npx vibe-doc check       # check deployment readiness
npx vibe-doc status      # show status
npx vibe-doc templates   # view available templates
```

## Validated on

Scanned the 626 hub.

## Install

**Stable (recommended) — as a Claude Code plugin via the marketplace:**

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
/plugin install vibe-doc@vibe-plugins
```

**Canary — track this repo's `main`:**

```text
/plugin install vibe-doc@estevanhernandez-stack-ed/Vibe-Doc
```

**npm (CLI binary for terminal / CI):**

```bash
npm install -g @esthernandez/vibe-doc
vibe-doc --version
```

The npm install gets you the standalone `vibe-doc` binary for any shell — pair it with the marketplace install above if you also want the conversational slash commands.

> **Note on `.plugin` upload:** Cowork's "Upload plugin" path is currently unstable for our bundles — we recommend the marketplace install above. We're tracking the issue.

## Works independently or together

Vibe Doc runs standalone or alongside other 626 Labs plugins like [`@esthernandez/app-project-readiness`](https://www.npmjs.com/package/@esthernandez/app-project-readiness) — when both are installed, they share a **unified builder profile** at `~/.claude/profiles/builder.json` so you only onboard once across every 626 Labs plugin.

Vibe Doc respects the [Self-Evolving Plugin Framework](docs/self-evolving-plugins-framework.md) — it reads the shared profile to calibrate tone and depth, writes only to its own `plugins.vibe-doc` namespace, and never stomps other plugins' data. See the framework doc for the full thesis, 12-pattern catalog, and applied playbook.

## Contributing

Found a bug? Missing a document type? Want to improve the classifier? Open an issue or PR at [the Vibe Doc repository](https://github.com/estevanhernandez-stack-ed/Vibe-Doc).

## Part of the Vibe ecosystem

One of 11 plugins in the **[Vibe Plugins](https://github.com/estevanhernandez-stack-ed/vibe-plugins)** marketplace from [626 Labs](https://626labs.dev) — foundations (Thesis Engine, Keystone) and process pillars (Cartographer, Doc, Sec, Test, Thesis, Iterate, Taker, Walk, Insights) for AI-assisted creation.

```text
/plugin marketplace add estevanhernandez-stack-ed/vibe-plugins
```

## License

MIT — *Imagine Something Else.*
