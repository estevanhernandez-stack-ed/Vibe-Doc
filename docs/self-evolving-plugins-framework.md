# The Self-Evolving Plugin Framework

**A thesis and playbook for building AI plugins that get better every time you use them.**

*626Labs — Estevan Hernandez*

---

## Part I — Thesis

### The Core Claim

**A plugin should be more useful on its tenth run than on its first — not because the user learned it, but because it learned the user.**

Static plugins are frozen artifacts. Self-evolving plugins are living tools that repair their own friction, teach themselves your context, and reshape their behavior in the background so that every invocation compounds on the last.

### Why Static Plugins Quietly Rot

Most AI tooling in 2026 is still software with a language model stapled on. You install a plugin, it asks the same onboarding questions it asked the last user, it makes the same wrong assumption about your stack the forty-seventh time you run it, and it greets you every morning like a golden retriever with amnesia.

The specific failure pattern:

- **Zero memory across runs.** Your `/scaffold` command doesn't know you always use pnpm, Zod, and tRPC. You tell it every time. A tax on your attention that compounds across every invocation.
- **Generic defaults forever.** The plugin was tuned for the median user on day one. You are not the median user on day ninety. The gap between what it assumes and what you need widens monotonically.
- **No feedback loop from failure.** When the plugin hits a dead end — a command that didn't work, a prompt that produced garbage, a workflow the user rage-quit halfway through — that signal is discarded. The next user walks into the same pit.
- **Knowledge frozen at ship time.** The plugin shipped in March knows nothing about the library you adopted in July. The LLM inside it might, but the plugin's scaffolding — its prompts, examples, defaults — is embalmed.
- **Identical onboarding forever.** Every `/onboard` feels the same because it *is* the same.

The net effect: a tool that should be getting sharper is getting duller relative to its potential. The user adapts to the plugin instead of the plugin adapting to the user — which is backwards for something that ships with a reasoning engine inside it.

### The Three Pillars

Self-evolution isn't one thing. It's three distinct capabilities that get conflated, and conflating them is why most attempts to build "smart" plugins collapse into vague "it has memory" handwaving. Rigor matters.

#### Self-Repair — Closing loops on failure

Self-repair is when the plugin **notices friction and fixes it**. When a command errors out, a generated artifact gets rejected, a user bails halfway through a flow — the plugin notices, diagnoses, and adjusts.

*Example:* `/spec` generates a technical spec and the user edits 60% of the "Non-Goals" section before accepting it. A self-repairing plugin notices the edit delta, infers that its Non-Goals template is badly calibrated for this domain, and adjusts the template for next time. No bug report filed. The friction route gets paved over.

Self-repair is reactive. It's the plugin's immune system.

#### Self-Teach — Building a private model of the user

Self-teach is about **building a rich model of the user and their world** that gets deeper over time. Not just "remember that Este uses pnpm" — that's a sticky note. Self-teach is "Este ships plugins, his plugins are usually spec-first, he values terse output, he works in bursts of 2-3 hours, and when he says 'make it sharper' he means cut word count by 30%."

*Example:* After watching the user accept, reject, and edit ten specs, the plugin builds a user-specific style profile. The 11th spec is drafted *through* that profile before the user ever sees it. They don't tell it to. It just happens.

Self-teach is proactive. It's the plugin's education.

#### Self-Evolve — Changing the plugin's own shape

Self-evolve is the deepest and most dangerous of the three. It's when the plugin **modifies its own behavior, commands, prompts, or capabilities** based on what it has repaired and learned. Self-repair fixes leaks. Self-teach builds knowledge. Self-evolve rewrites the tool itself.

*Example:* The plugin notices the user has never once run `/retrospective` but runs `/spec` daily and always follows it with manual testing. Over time, it proposes — and with consent, implements — a new `/spec-and-verify` command that fuses the two workflows they actually do. Or it silently demotes `/retrospective` from the menu. The plugin's *surface area* changes to match the user's actual usage.

Self-evolve is architectural. It's the plugin's metamorphosis.

### What "Better" Actually Means

You cannot evolve toward nothing. A plugin that mutates without a compass is just chaos with a changelog. The north star has measurable dimensions:

- **Friction delta per run.** Keystrokes, confirmations, corrections, re-runs. Trend: down.
- **Time-to-first-useful-output.** Invocation to "this is what I wanted." Trend: down.
- **Repeat question rate.** How often does the plugin ask something it could infer or remember? Trend: asymptotically toward zero for stable facts.
- **Personalization depth.** Does output look like something *the user* would have written? Trend: up.
- **Unused surface area.** Commands, flags, prompts the user never touches. Should shrink or hide.
- **Recovery speed.** When it gets something wrong, how fast does it correct — this run, next run, or never? Measure in runs, not months.

If a proposed self-evolution doesn't move one of these numbers, it isn't evolution. It's noise.

### The Honest Limits

- **Consent is non-negotiable for behavior drift.** Self-repair can happen silently. Self-teach can happen silently. Self-evolve — when the plugin changes *what it does* — must be surfaced. The contract: "I noticed X, I'd like to do Y from now on, yes/no/show me more."
- **Privacy is a cliff, not a slope.** Everything the plugin learns is a liability as much as an asset. Local-first storage, user-inspectable memory, one-command wipe, no silent exfiltration.
- **Taste can't be self-taught.** A plugin can learn that you prefer terse output. It cannot learn *why* a spec is bad in a way that requires product judgment. Strategic decisions — "is this the right feature to build" — stay human.
- **Drift without anchors is entropy.** There need to be invariants — core behaviors, safety rails, guardrails on tone — that cannot self-modify. The evolving parts orbit a stable core.
- **Cold starts still exist.** The tenth run can be magical. The first run is still the first run. Day-one UX is still day-one UX.
- **Evolution is not a substitute for good defaults.** Self-evolution is a multiplier on a solid foundation, not a patch on a broken one.

---

## Part II — The Pattern Catalog

A catalog of concrete, implementable patterns. Each one is shippable by a single developer using markdown SKILL files and JSON/YAML data files. Heavier infrastructure is called out explicitly.

### 1. Persistent Builder Profile

**Pillar:** Self-teach
**Problem:** Every new project restarts the plugin from zero. The user re-answers the same onboarding questions on every invocation.

**Mechanism:** The plugin writes a single canonical profile file to a global location: `~/.claude/plugins/data/<plugin-name>/profile.json`. On plugin start, the SKILL reads this file *first*, before any onboarding. Holds durable facts: name, experience level, preferred stack, tone, pacing, and a `last_updated` timestamp. Onboarding questions are conditional: "if field X is missing or older than N months, ask; otherwise skip."

**Example:** User runs `/app-readiness` on a new project. The plugin reads the profile, sees they're a senior builder who prefers terse output and TypeScript, and skips the 6-question onboarding. Greets them by name and jumps to the first real step.

**When to use / when not:** Use for stable facts that survive across projects. Don't use for project-specific state. Don't store secrets.

### 2. Per-Project Memory Scroll

**Pillar:** Self-teach, self-repair
**Problem:** The global profile knows *who* the user is, but not *what this project is*. Without project-scoped memory, the plugin re-derives context every run.

**Mechanism:** Each project gets a `.<plugin-name>/project.json` in the repo root. Holds project-specific state: detected stack, open blockers, last health score, decisions the user has made about *this* codebase. The SKILL reads project memory after the global profile and merges into a working context. Include `schema_version` for migrations.

**Example:** The plugin remembers that on `app-readinessplugin` specifically, the user already answered "skip the LADDER intro" and flagged three known friction points. Next run loads those directly.

**When to use / when not:** Use when project state is durable. Avoid for ephemeral session state.

### 3. Layered Memory Resolution

**Pillar:** Self-teach
**Problem:** Multiple sources of truth (session, project, global profile) can contradict. Which wins?

**Mechanism:** Define strict precedence in the SKILL: **session > project > user profile > plugin defaults**. Resolve each field by walking layers from most-specific to least-specific. Implement as an explicit `resolve_context` step with a table showing which field comes from which layer. When the user overrides a field mid-session, only the session layer mutates.

**Example:** Global profile says `tone: terse`. In this project, the user once said "be more verbose about database stuff" — that's in project memory. For this session, they say "go full terse today" — session wins, but tomorrow's run is back to verbose-on-DB.

**When to use / when not:** Use any time you have more than one memory source. Never skip the precedence table.

### 4. Memory Decay and Refresh

**Pillar:** Self-repair
**Problem:** Stored preferences go stale. A user who was a beginner 18 months ago isn't one now.

**Mechanism:** Every memory field carries a `last_confirmed` timestamp. Define decay policy per field type: stack preferences refresh every 90 days, experience level every 180, tone never (user sets explicitly). When past TTL, mark `stale: true` — don't delete — and opportunistically ask for confirmation at a low-friction moment. Re-stamp regardless of answer.

**Example:** Plugin notices `preferred_stack: "Next.js 13"` was last confirmed 7 months ago. Next session, casually asks "still Next.js, or on something else now?" and updates.

**When to use / when not:** Use for preferences that realistically drift. Don't decay identity fields. Don't ask more than one decay question per session.

### 5. Reflection Loop

**Pillar:** Self-teach, self-evolve
**Problem:** The plugin has no idea whether the last run actually helped.

**Mechanism:** At the end of each meaningful run, trigger a short reflection: 2-3 targeted questions, not a survey. Specific questions beat general ones. Answers write to `reflections.jsonl` — append-only. Entry includes timestamp, plugin version, question, answer. Classify runs: `helpful` / `neutral` / `frustrating`.

**Example:** After a session, the plugin asks "Was the onboarding the right length today?" User says "too long, skip the stack question next time." Line appends to the log.

**When to use / when not:** Use when the plugin has a natural end point. Don't reflection-prompt inside long flows. Max 2-3 questions. Skip if last reflection was <24h ago.

### 6. Friction Log

**Pillar:** Self-repair, self-evolve
**Problem:** Users hit papercuts they don't bother to report.

**Mechanism:** Any time the agent detects friction — user cancels mid-flow, overrides a default, asks a clarifying question the SKILL should have preempted — write a structured entry to `friction.jsonl`. Schema: `{timestamp, plugin_version, friction_type, symptom, agent_guess_at_cause}`. Implicit feedback — user does nothing. Be conservative: only log clear friction, not every correction.

**Example:** User cancels the onboarding flow three times on different projects. Each cancel writes `friction_type: "onboarding_abandoned"`. When these accumulate, the evolution pattern surfaces them.

**When to use / when not:** Use when the signal is clear. Don't log every correction. Cap and rotate.

### 7. Version Skew Self-Check

**Pillar:** Self-repair
**Problem:** Data files written by v0.3 may not match what v0.5 expects. Plugin crashes or silently produces wrong results.

**Mechanism:** Every data file includes `schema_version`. On read, SKILL checks version against expected. If they match, proceed. If older, run a named migration and re-stamp. If newer than the plugin, stop and warn. Migrations are idempotent and leave a `.bak` of the pre-migration file.

**Example:** User upgrades from 0.3 to 0.5. On first run, SKILL reads `profile.json`, sees `schema_version: 1`, runs v1→v2 migration (adds `pacing` field with default), stamps `schema_version: 2`, continues.

**When to use / when not:** Mandatory for any plugin that persists data across versions. Always back up.

### 8. Plugin Self-Test

**Pillar:** Self-repair
**Problem:** SKILL files rot silently. Referenced files get deleted, commands get renamed, paths shift.

**Mechanism:** Ship a `self-test` SKILL or subcommand. Runs on demand (or weekly on first invocation). Walks a checklist: do referenced files exist? Do commands resolve? Do data files parse against schema? Writes to `selftest.log`. Surface failures as short report — "2 issues found, want me to fix?" — not silent failure.

**Example:** Monthly self-test detects `skills/ladder/intro.md` was renamed to `onboarding.md` but the main SKILL still references the old path. Offers to patch.

**When to use / when not:** Use for any plugin with multiple SKILL files or external data. Don't self-test every invocation.

### 9. Skip-History Learning

**Pillar:** Self-teach
**Problem:** The plugin keeps offering steps the user always skips.

**Mechanism:** Every optional branch logs to `choices.jsonl`: `{step_name, offered, chosen}`. After N observations (3), if consistently unchosen, mark `auto_skip: true` in the profile. Step stays available on explicit request. Leave a quiet note: "skipping LADDER intro — you've opted out 3 times; say 'show intro' to bring it back."

**Example:** User skips the onboarding preamble three times. Fourth run silently skips it, with a one-line acknowledgment.

**When to use / when not:** For non-essential steps. Never auto-skip correctness gates (schema migrations, safety checks, confirmations).

### 10. Agent-Authored Changelog

**Pillar:** Self-evolve
**Problem:** The plugin accumulates signals but has no mechanism to propose changes to itself.

**Mechanism:** A `propose-evolution` SKILL reads reflection log, friction log, and skip history and produces a markdown **proposal document** at `proposed-changes.md`. Each proposal has: observation, pattern count, proposed SKILL edit (diff-style), justification. User reviews, accepts/rejects, then a second `apply-evolution` step patches the SKILL. **Never auto-apply.** Applied proposals move to `applied-changes.md`.

**Example:** After two weeks: "Onboarding abandoned 5/6 times when profile is complete and fresh. Suggest: skip onboarding when profile is complete and <90 days fresh. Edit to `onboard/SKILL.md` attached." User says yes, agent patches.

**When to use / when not:** Use when you have feedback volume to see patterns (weeks of use). Never auto-apply. Extra confirmation for safety-critical logic.

### 11. Shared User Profile Bus

**Pillar:** Self-teach, cross-plugin
**Problem:** Every plugin maintaining its own profile means the user teaches the same fact (name, tone, experience) to every plugin independently.

**Mechanism:** Designate a single canonical profile file (`~/.claude/profiles/builder.json`) as the **shared bus**. Plugins read shared fields but write to their own plugin-scoped namespace: `{shared: {name, tone, ...}, plugins: {app-readiness: {...}, reflect: {...}}}`. Shared fields only update through a named `update_shared_profile` step defined once and referenced by all plugins.

**Example:** User updates preferred tone to "terse" via the reflect plugin. Next run of app-readiness reads the same `shared.tone` and adapts immediately.

**When to use / when not:** Use when you have 2+ plugins with overlapping context. Plugin-specific state stays in `plugins.<name>`, never in `shared`. If two plugins disagree on a shared field, refuse the conflicting write and surface it.

### 12. Coordination Beacons

**Pillar:** Cross-plugin, self-teach
**Problem:** Plugins operating on the same project can't see each other's work.

**Mechanism:** Each plugin writes a **beacon** to `.626labs/beacons.jsonl` at the project level. Schema: `{timestamp, plugin, event, summary}`. High-signal events only: `run_completed`, `decision_logged`, `friction_detected`, `evolution_proposed`. Other plugins read last N beacons on startup for situational awareness. Flat append-only log — not pub/sub.

**Example:** The commit plugin starts, reads beacons, sees that app-readiness flagged "three HIGH-risk items still open" two hours ago, mentions it in the pre-commit summary: "heads up, readiness has open HIGH items — sure you want to ship?"

**When to use / when not:** Use when plugins naturally share project context. Not for real-time coordination — this is a log, not a channel. Rotate weekly. Heavier coordination needs real infrastructure, out of scope.

### Catalog-Wide Invariants

- **The user is the final arbiter of self-evolution.** Patterns 10 and 11 have user-in-the-loop checkpoints for a reason.
- **Every data file carries a schema version.** Make it the first field, always.
- **Prefer append-only logs over mutable state for feedback capture.** Logs are debuggable, rotatable, greppable.
- **Reflection is cheap, changes are not.** Capture a lot of feedback signal. Don't translate every signal into a SKILL edit.
- **Cross-plugin coordination stays flat.** No central service, no daemon, no message bus. Shared JSON + append-only log is the whole toolkit.

---

## Part III — The Applied Playbook

### The Maturity Ladder

Five levels. Each is a shipping target — you can stop at any of them. Don't skip levels; the jumps get exponentially harder.

**Level 0 — Static.** Every user gets identical behavior. SKILL.md is fixed. No memory beyond the current conversation. Most plugins live here and that's fine — ceiling-limited but not broken.

**Level 1 — Persistent profile.** The plugin remembers *who the user is* across projects. Read-only during execution — the profile informs behavior but the plugin doesn't update itself yet. **Minimum increment from L0:** one JSON file + one skill block that reads it at session start. **App-readiness is here now** with the global builder profile.

**Level 2 — Session memory.** The plugin captures what happened *during* a run. Stored per-project and per-session. Still read-only for behavior — collecting training data, not acting on it. **Minimum increment from L1:** append-only session log + reflection hook at end of each command.

**Level 3 — Reflective evolution.** The plugin *proposes* changes to its own behavior. After N sessions or on explicit trigger: "You've skipped the PRD step in 4 of your last 5 projects — want me to make it optional by default?" User confirms, plugin writes the change to an overrides file. SKILL.md stays static; behavior mods live in user-owned overrides the skills check at runtime. **Minimum increment from L2:** a reflection command + an overrides file.

**Level 4 — Autonomous adaptation.** Plugin proposes *and* applies behavioral changes without per-change confirmation, within user-defined guardrails. Can restructure its own flow, escalate strategic changes to review (via the 626Labs Architect bridge), ship changes on a cadence. Fully reversible. **Minimum increment from L3:** policy file + change log + rollback command.

### Retrofit Playbook (Existing Plugins)

Start with lowest-friction changes. Don't touch execution paths first — touch the edges.

**Step 1 — Add the data directory.** Create `~/.claude/plugins/data/<plugin-name>/` with `profile.json`, `sessions/`, `overrides.json`. Nothing reads these yet. Plumbing. One commit.

**Step 2 — Write the profile loader skill.** Add `skills/profile-loader/SKILL.md`. At session start: read `profile.json` if it exists, surface relevant fields as context. If the file doesn't exist, no-op. No user-visible behavior change yet.

**Step 3 — Add reflection checkpoints.** For each slash command, identify the natural end-of-task moment. Add a single instruction at the end: *"After completing this command, append a one-line session entry to `sessions/<date>.jsonl`: command name, outcome, user friction points, decisions made."* This is Level 2.

**Step 4 — Gate the first behavioral change.** Pick one behavior that would clearly benefit from adaptation. Add: *"Before running, read `overrides.json`. If `skip_prd: true`, confirm once with the user and proceed accordingly."* Overrides file is still manually edited. Proves the mechanism works.

**Step 5 — Add the reflect command.** New slash command (or extension to existing reflect). Reads session logs, surfaces patterns, asks if the user wants to update overrides. Writes on yes. This is Level 3. **Critical:** every proposed change shown diff-style before writing. Every write logged to `overrides.history.jsonl`.

**Step 6 — Only after L3 is stable for weeks**, consider L4. Add `policy.json` defining what can change without confirmation. Most plugins should never need L4.

**Golden rule:** never modify a command's existing happy path on the first pass. Add the mechanism alongside, gate behind a flag, let it prove itself, then cut over.

### Scaffold Playbook (New Plugins)

Designing from scratch means you can bake the data contract in before any command exists.

**Folder layout (day 1):**
```
<plugin>/
  CLAUDE.md                    # persistent plugin-level behavior
  commands/                    # slash command definitions
  skills/
    profile-loader/SKILL.md    # reads profile at session start
    session-logger/SKILL.md    # appends to session log
    reflector/SKILL.md         # surfaces patterns on /reflect
  data-contract.md             # what the plugin reads/writes
```

**At `~/.claude/plugins/data/<plugin>/`:**
```
profile.json                   # stable user facts
overrides.json                 # user-confirmed behavior mods
overrides.history.jsonl        # every change, reversible
policy.json                    # autonomous-change guardrails
sessions/<YYYY-MM-DD>.jsonl    # per-day session logs
```

**Data contract first.** Write `data-contract.md` before any skill. Describe every field, who writes it, who reads it, when. Skipping this is how plugins drift.

**Checkpoint design.** Every command gets an explicit reflection checkpoint. Bake them in before the command logic gets complicated.

**Feedback touchpoints — three categories:**
- **Explicit** — user said "skip this," "I hate this step"
- **Implicit** — user abandoned the command, re-ran, asked twice
- **Outcome** — did the shipped artifact actually work?

A plugin that only captures explicit feedback learns slowly. Capture all three.

**Bind to the 626Labs dashboard from day 1.** On session start, auto-bind via `manage_projects findByRepo`. Tag every session log with the project ID. Log meaningful decisions via `manage_decisions`. One pane of glass across every plugin.

### Worked Example — app-readiness

Current state: **Level 1**. Global builder profile exists; sessions don't feed back into behavior.

**Level 2.** Add a session-logger skill. At the end of each of the 8 commands (`onboard`, `scope`, `prd`, `spec`, `checklist`, `build`, `iterate`, `reflect`), append to `~/.claude/plugins/data/app-readiness/sessions/<date>.jsonl`: command, project ID, did the user push back, did they edit the artifact heavily. The existing `/reflect` command is already close — extend it to write to the session log, not just the conversation.

**Level 3.** Add `/app-readiness-evolve` (or extend `/reflect`). Reads last 30 days of session logs, looks for patterns: "your PRDs get edited down 60% of the time — want shorter PRD output by default?" "you've onboarded 6 projects without ever using the risk-assessment block — want to drop it?" Each proposal shows before/after of the skill instruction change and writes to `overrides.json` only on explicit yes. Commands get a new first instruction: *"Read `overrides.json`. Apply any relevant behavior mods before proceeding."*

**Specific file changes for L3:**
- `skills/prd/SKILL.md` — add overrides check at top
- `skills/onboard/SKILL.md` — add overrides check + profile reference
- New: `skills/evolve/SKILL.md` — reflection/proposal logic
- New: `~/.claude/plugins/data/app-readiness/overrides.json`
- New: `~/.claude/plugins/data/app-readiness/overrides.history.jsonl`

**Level 4.** Policy file says the plugin can autonomously: reorder optional steps, adjust output length targets, skip confirmation on steps confirmed >5 times. It **cannot** autonomously: remove checkpoints, change the core 8-command structure, modify `/spec` (spec quality is load-bearing). On architectural proposals ("should we split `/build` into `/build` and `/verify`?"), the plugin bridges to The Architect via `bridge_context_to_architect` and waits for a strategic call.

Per-project overrides matter here — `overrides.json` supports `global` and `per-project` blocks keyed by project ID, so the plugin can learn that the user wants lean PRDs for scratch projects but full PRDs for client work.

### Anti-Patterns

- **Surveillance feel.** If the user ever thinks "what is this thing logging about me?" — you've lost. Human-readable session log, visible location, `/plugin-what-do-you-know` command that dumps everything. Transparency is the price of memory.
- **Nagging.** Never surface evolution proposals mid-task. The user is trying to ship. Reflection belongs in dedicated moments.
- **Drift without consent.** Level 4 is seductive and dangerous. Every change needs a log entry and a one-command rollback. When in doubt, stay at L3.
- **Overfitting to past state.** The user from 6 months ago isn't today's user. Age out signals. Soft-prompt to re-verify quarterly.
- **Losing the new-user path.** A plugin that only works well after 20 sessions is broken for user 21. Cold-start experience stays first-class. Test it on every retrofit PR.
- **Treating implicit signals as ground truth.** "User edited heavily" could mean the output was bad *or* editing is just their workflow. Implicit signals propose; explicit signals decide.
- **Plugin-specific overrides stomping global profile.** Global profile wins unless the plugin-specific override was explicitly confirmed for that plugin.

### Shipping Cadence

Not every run. Never every run.

- **Read cadence: every run.** Profile + overrides at session start, always. Cheap and keeps behavior consistent.
- **Write cadence: at checkpoints.** Session logs append at command-end. Profile fields update only on explicit confirmation. Never silent inference-to-profile.
- **Reflection cadence: on command.** User-triggered. Plugin can *suggest* ("10 sessions since last reflection — worth a pass?") but never run unprompted.
- **Behavior-change cadence: weekly to monthly.** Even at L4, no daily rewrites. Reflection available anytime, autonomous mods batched in a weekly digest ("here are 3 small tweaks I made this week, here's how to revert"), strategic changes escalated to The Architect.

**The test:** if the user opens the plugin after two weeks away, they should recognize it. Evolved plugins should feel like a sharper version of themselves, not a stranger. If the weekly digest ever says "I changed 11 things," the cadence is wrong.

---

## Closing

The wave after "AI plugins" is "AI plugins that are alive between runs." Not sentient, not agentic in the breathless VC sense — just *awake* enough to notice what happened last time and quietly be better for it. The builders who internalize that the plugin's job is to shrink itself toward the user, not the other way around, will ship tools that feel less like software and more like a collaborator who's been paying attention.

That's the bar. Everything short of it is a command palette with extra steps.
