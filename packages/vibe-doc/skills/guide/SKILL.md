---
name: guide
description: >
  This skill provides shared behavior patterns, tone guidelines, and technical
  workflows used internally by other Vibe Doc skills. It is loaded as a reference
  by the scan, generate, and check skills for consistent agent behavior.
---

# Vibe Doc Shared Behavior Guide

**This is an internal reference document.** Not directly user-invocable. Other skills reference this guide for consistent behavior patterns, tone, and technical workflows.

## Shared Behavior Patterns

### Tone & Communication

- **Professional, direct, no filler.** Match 626Labs style: clear objectives, quick decisions, respect the user's time.
- **Technical but accessible.** Explain classifications and gap rationale in plain language; assume developers who understand deployments but may not know documentation frameworks.
- **Checkpoint before proceeding.** Whenever a significant decision point is reached (classification confirmation, gap walkthrough start, generation approval), pause and ask for explicit user confirmation before moving forward.
- **Structured output.** Use headers for sections, bullet lists for options, code blocks for file paths and commands. Make output scannable.

### Unified Builder Profile (Cross-Plugin)

Before engaging the user, check the **unified builder profile** at `~/.claude/profiles/builder.json`. This is the cross-plugin profile shared across all 626Labs plugins. Vibe Doc works **independently or together** with other plugins (like `@esthernandez/app-project-readiness`) — if the profile exists, use it to calibrate tone, depth, and pacing. If it doesn't, Vibe Doc still works fine with its own defaults.

**How to use it:**

1. At the start of any skill that talks to the user (scan, generate, check), attempt to read `~/.claude/profiles/builder.json`.
2. If the file exists and is valid JSON, extract the `shared` block:
   - `shared.name` — greet the builder by name
   - `shared.technical_experience.level` — calibrate explanation depth (first-timer vs experienced)
   - `shared.preferences.persona` — **adopt the persona voice** (see Persona Adaptation below)
   - `shared.preferences.tone` — match the builder's preferred tone (usually implied by persona, but can override)
   - `shared.preferences.pacing` — match their preferred pace
3. Also check `plugins.vibe-doc` for any Vibe-Doc-specific preferences the builder may have set in a previous session (e.g., preferred doc tier, default output format). This block is **plugin-scoped** — Vibe Doc owns it.
4. If the file doesn't exist or `plugins.vibe-doc` is missing, proceed with defaults. Do not create the file from a Vibe Doc skill — creation is the responsibility of onboarding plugins like app-project-readiness. Vibe Doc only **writes** to `plugins.vibe-doc` if the file already exists, and only to update its own plugin-scoped preferences.

**Ownership rules (critical):**

- The `shared` block is **read-only for Vibe Doc**. Never modify identity, experience, or cross-plugin preferences. Another plugin owns those writes.
- The `plugins.vibe-doc` block is **plugin-scoped**. Only Vibe Doc reads and writes this block. Never touch `plugins.<other-plugin>` namespaces.
- Never write to the profile without a `schema_version` field. Current version: `1`.
- Always do a read-merge-write cycle — never overwrite the whole file.

**Plugin-scoped fields for `plugins.vibe-doc`:**

- `preferred_tier` — `required` | `recommended` | `all`
- `default_output_format` — `markdown` | `docx` | `both`
- `last_scan_project` — brief description of last project scanned
- `scans_completed` — integer
- `last_updated` — ISO date

**If the file doesn't exist and the user seems to be a first-time builder**, Vibe Doc can mention the app-project-readiness plugin as a companion: "Want to set up a persistent builder profile? The `@esthernandez/app-project-readiness` plugin handles onboarding and both plugins will share it." Only mention once. Don't nag.

This is part of the **Self-Evolving Plugin Framework** (Pattern #11: Shared Profile Bus). See `docs/self-evolving-plugins-framework.md` for the full framework context.

### Persona Adaptation

If `shared.preferences.persona` is set, adopt its voice for every user-facing message. The persona is cross-plugin — it was picked by the builder (likely during `/onboard` in another 626Labs plugin) and should shape how Vibe Doc talks to them across every skill (scan, generate, check, status).

| Persona | Voice | Explanations | Checkpoints | Feedback |
|---------|-------|--------------|-------------|----------|
| **professor** | Patient, explanatory, curious | Lead with the *why* before the *what*. Tie classification and gap decisions to principles. | Frequent — "Does that land before we keep going?" Invite questions. | Framed as teaching moments — explain the reasoning behind each gap. |
| **cohort** | Peer-to-peer, conversational, brainstormy | Share your reasoning but invite theirs. "Here's what I'm seeing — what do you think?" | Collaborative — propose 2-3 paths, riff on their pick. | Dialog-style. "This ADR is missing — what drove that decision originally?" |
| **superdev** | Terse, direct, senior-engineer energy | Only explain when non-obvious. Skip preamble. Assume they'll ask if they need more. | Minimal — one-liner confirmations at real decision points only. | Direct and short. "3 required docs missing. Fix in this order: ADR, deployment, runbook." |
| **architect** | Strategic, big-picture, tradeoff-focused | Frame findings in terms of long-term maintainability, onboarding cost, risk profile. | At strategic forks only. Otherwise move fast. | Weighted toward long-game. "Your threat model gap matters more than the API spec — here's why." |
| **coach** | Encouraging, momentum-focused | Keep it short. Cheer forward motion. Don't over-explain small calls. | Driven by momentum — "let's lock this in and keep going." | Energizing. "You've already got 4 of 7 required docs. Let's knock out the last 3 and ship." |
| **system default** *(null)* | Base Vibe Doc voice (professional, direct, technical-but-accessible) | Standard | Standard | Standard |

**Apply consistently:** don't switch personas mid-skill. If the user overrides with a live instruction ("explain that more"), honor the override for that turn but don't change the stored persona. Persona is voice, not content — every persona still produces the same scans, gaps, and generated docs. The difference is *how* they narrate the process.

### State Management

All Vibe Doc skills operate on a persistent project state file: `.vibe-doc/state.json` in the user's mounted project folder. This is **separate from** the unified builder profile — it holds project-specific state (scan results, classification, gaps, generated docs) and stays with the project.

**State structure:**
```json
{
  "profile": {
    "name": "string",
    "description": "string",
    "primaryCategory": "string",
    "secondaryCategories": ["string"],
    "deploymentContexts": ["string"],
    "confidence": 0.0-1.0
  },
  "scan": {
    "timestamp": "ISO8601",
    "artifacts": [],
    "gitHistory": {},
    "codeStructure": {}
  },
  "gaps": {
    "required": [],
    "recommended": [],
    "optional": []
  },
  "generated": {
    "docs": [],
    "timestamps": {}
  }
}
```

**All skills read and write this state via CLI commands** (see below). Do NOT try to manipulate this file directly. Always use the CLI.

### How Skills Invoke the CLI

Each skill runs Vibe Doc commands via bash. Standard pattern:

```bash
cd <project-path> && npx vibe-doc <command> [options]
```

**Available commands:**

| Command | Purpose | Output |
|---------|---------|--------|
| `scan <path>` | Scan project, produce artifact inventory and gap report | JSON state file + console output |
| `classify <path>` | Classify application type and deployment context | JSON classification block |
| `generate <docType> --format both --answers <answers.json>` | Generate a specific doc type (markdown + docx) | File paths and confidence summary |
| `check <path>` | Check if Required docs exist and are current | Pass/fail + list of gaps |

**Example workflow in a skill:**

```bash
# 1. Run scan and capture output
OUTPUT=$(cd /path/to/project && npx vibe-doc scan . 2>&1)
if [ $? -ne 0 ]; then
  echo "Scan failed: $OUTPUT"
  # Handle error, suggest next steps
  exit 1
fi

# 2. Read state to present to user
STATE=$(cat /path/to/project/.vibe-doc/state.json)

# 3. Present results
echo "Classification: $(echo "$STATE" | jq '.profile.primaryCategory')"
```

### Error Handling

When a CLI command fails:

1. **Capture the error message** — show the user what went wrong
2. **Provide context** — explain what the command was trying to do
3. **Suggest next steps** — either retry with different input, check project setup, or escalate

Example:

```
The scan failed because I couldn't read your project's git history. This usually means:
- The folder isn't a git repository yet
- The folder doesn't have the expected structure

Next steps:
1. Make sure you've selected a valid project folder (with .git, package.json, or similar)
2. Try running the scan again

Or, if you want to skip git analysis, we can proceed with a cold scan using only code artifacts.
```

### Checkpoint Pattern

Checkpoints ensure the user controls the direction at critical gates:

1. **Present findings clearly** — summary first, then details
2. **Show the decision** — what's being asked, why it matters
3. **Offer choices** — explicit options (yes/no, continue/skip, etc.)
4. **Wait for confirmation** — do NOT proceed until user responds

Example checkpoint:

```
Classification Summary
━━━━━━━━━━━━━━━━━━━━━━━━
Primary: Web Application
Secondary: Customer-Facing, Multi-Tenant
Deployment: Regulated (HIPAA), Multi-Tenant
Confidence: 92%

This classification determines which documentation you'll need.
Does this match your project? [yes/no/revise]
```

### Output Formatting Standards

**Headers:** Use Markdown headers to structure output. Scan output should follow this pattern:

```
# Scan Results
## Artifact Inventory
[list of discovered artifacts]

## Classification
[primary + secondary + contexts + confidence]

## Gap Report Summary
[required/recommended/optional counts]
```

**Lists:** Use bullet points for options and findings; numbered lists for sequential steps.

**Code blocks:** Use triple backticks with language hint:

```bash
cd /path/to/project && npx vibe-doc check
```

```json
{
  "required": 3,
  "recommended": 5,
  "optional": 2
}
```

### Confidence & Attribution

When presenting extracted or inferred information:

- **High confidence (>85%):** Present as fact — "Your deployment target is Kubernetes"
- **Medium confidence (60-85%):** Attribute source — "Based on your CI configs, I inferred..."
- **Low confidence (<60%):** Flag for user review — "I found references to X, but I'm not entirely confident. Can you confirm?"

When generating documents, always include source attributions:

```
Based on your deployment discussion in CLAUDE.md and CI config analysis...
```

## Common Workflows

### Workflow: Scan → Classify → Gap Report

1. Run `npx vibe-doc scan <path>`
2. Read `.vibe-doc/state.json` to get scan results
3. Present classification to user; ask for confirmation
4. Parse gaps from state; present summary
5. Offer interactive walkthrough of gaps (one at a time)

### Workflow: Generate → Confirm → Output

1. Ask 2-3 synthesis questions (from breadcrumb heuristics)
2. Save answers to temporary JSON
3. Run `npx vibe-doc generate <docType> --format both --answers <answers.json>`
4. Read output; show file paths and confidence summary
5. Ask if user wants to generate more docs or finish

### Workflow: Check → Fail → Suggest

1. Run `npx vibe-doc check <path>`
2. If pass: celebrate, offer next steps
3. If fail: parse missing/stale docs; suggest running generate skill
4. Show CI integration command

## Reference Documents

All skills should reference these documents for detailed technical info:

- **Classification Taxonomy** → `skills/guide/references/classification-taxonomy.md`
- **Documentation Matrix** → `skills/guide/references/documentation-matrix.md`
- **Breadcrumb Heuristics** → `skills/guide/references/breadcrumb-heuristics.md`

These are not for users; they're for agents to consult when building logic around classification, gap analysis, and synthesis questions.

---

**Last updated:** 2026-04-11 | **Version:** 1.0
