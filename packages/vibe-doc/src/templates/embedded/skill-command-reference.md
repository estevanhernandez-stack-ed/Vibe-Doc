---
docType: skill-command-reference
version: 1.0
templateVersion: 1
---

# Skill and Command Reference

This document lists every skill and command this plugin exposes, what each one does, and how to invoke it.

## Skills

{{extracted.skillList}}

{{user.skillList}}

<!-- NEEDS INPUT: One entry per skill. For each: the skill name, a one-sentence description, when a user should reach for it, and a pointer to the underlying SKILL.md file if applicable. -->

### Skill: {{user.skillName}}

**Purpose:** {{user.skillPurpose}}

**When to use:** {{user.skillWhenToUse}}

**Inputs:** {{user.skillInputs}}

**Example:**

```
{{user.skillExample}}
```

<!-- NEEDS INPUT: Repeat this block for each skill the plugin ships. -->

## Commands

{{extracted.commandList}}

{{user.commandList}}

<!-- NEEDS INPUT: One entry per slash command. For each: the command, its purpose, arguments (required and optional), and a minimal example invocation. -->

### Command: `{{user.commandName}}`

**Purpose:** {{user.commandPurpose}}

**Syntax:** `/{{user.commandName}} [arguments]`

**Arguments:**

{{user.commandArguments}}

<!-- NEEDS INPUT: List each argument with name, type, required/optional, and a one-line description. -->

**Example:**

```
{{user.commandExample}}
```

**Output:**

{{user.commandOutput}}

<!-- NEEDS INPUT: What the user sees when the command succeeds. A screenshot, an expected text snippet, or a description of the artifact created. -->

## Composition

{{user.composition}}

<!-- NEEDS INPUT: If the plugin's commands chain together (e.g., /scan → /report → /generate), document the typical workflow here. Show the order and what each step hands to the next. -->

## Errors and Edge Cases

{{user.errors}}

<!-- NEEDS INPUT: The most common failure modes (missing prerequisites, invalid inputs, environment issues) and how the user should respond. -->
