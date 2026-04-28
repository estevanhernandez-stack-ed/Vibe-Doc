---
description: Reflect on past Vibe Doc sessions and propose plugin improvements. L3 self-evolution.
argument-hint: ""
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/evolve/SKILL.md` and follow its full flow to reflect on the user's vibe-doc session history.

Requires at least one full session logged at `~/.claude/plugins/data/vibe-doc/sessions/`. Vibe Doc reads its own session logs and friction.jsonl, weights findings via Pattern #14 absence-of-friction inference, and proposes concrete SKILL / classifier / matrix edits for you to approve. Nothing auto-applies.

The evolve skill writes a new section to `packages/vibe-doc/proposed-changes.md` with this run's triage outcome — preserving any existing entries' status.
