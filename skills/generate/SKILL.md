---
name: generate
description: >
  This skill should be used when the user mentions "generate docs",
  "write my documentation", "fix my gaps", "create a runbook",
  "write the threat model", "generate missing docs", or wants to
  produce technical documentation from their project artifacts.
---

# Vibe Doc Generate Skill

Conversational pipeline to select documentation gaps and generate complete documents.

**Shared behavior:** Read `skills/guide/SKILL.md` for state management, CLI patterns, checkpoints, and output formatting.

---

## Entry: Check for Existing Scan

**First step: verify state exists**

```bash
if [ ! -f "<project-path>/.vibe-doc/state.json" ]; then
  echo "No project profile found. Run the Scan skill first."
  exit 1
fi
```

If state doesn't exist, redirect user to **Scan skill** and exit.

---

## Conversational Flow

### 1. Present Gap Summary & Offer Choices

Read state and show gaps:

```
Documentation Gaps
━━━━━━━━━━━━━━━━━━

Required (Deployment Blockers) — 3 missing:
  □ Threat Model
  □ Architecture Decision Records
  □ Runbook (Deployment & Operations)

Recommended (Should Do) — 4 missing:
  □ API Specification
  □ Deployment Procedure
  □ Data Model Documentation
  □ Security Hardening Guide

Optional (Nice to Have) — 3 missing:
  □ Changelog
  □ Contributing Guide
  □ Performance Benchmarks

Which would you like to generate?

[required] → Start with all Required docs
[pick] → Let me choose specific gaps
[single <name>] → Generate one doc now
[all] → Generate everything
```

**User chooses:**
- `required` → Go to step 2a (Generate Required, one at a time)
- `pick` → Go to step 2b (Selection menu)
- `single Threat Model` → Go directly to step 3 for that doc
- `all` → Go to step 2a with all gaps pre-selected

---

### 2a. Sequential Generation — One at a Time

For each selected gap, execute the generation workflow:

1. **Ask synthesis questions** (2-3 targeted questions for this doc type)
2. **Capture answers** (save to temporary JSON)
3. **Run generation command**
4. **Present results** (file paths, confidence summary)
5. **Confirm before moving to next doc**

**For example, generating a Threat Model:**

```
Threat Model Synthesis
━━━━━━━━━━━━━━━━━━━━━━

I found security discussion in your artifacts, but I need 2 more details:

1. Beyond authentication and data encryption, are there other sensitive 
   operations? (payments, PII access, admin functions, integrations?)

2. Are there known external dependencies or services your app relies on?
   (Third-party APIs, databases, cache layers?)

[Capture answers and save to temp JSON]

Generating threat model...
```

Then run:

```bash
cd <project-path> && npx vibe-doc generate threat-model \
  --format both \
  --answers '{"externalDeps":["Firebase","Stripe"],"sensitiveOps":["payment","admin"]}'
```

**If generation succeeds:**

```
✓ Threat Model generated

Files created:
  • docs/generated/threat-model.md (2,400 words)
  • docs/generated/threat-model.docx

Confidence summary:
  • Attack surface (High) — extracted from code + interview
  • Threat scenarios (Medium) — based on patterns, flagged for review
  • Mitigations (Medium) — industry standard, review for your stack
  • Compliance mapping (High) — HIPAA requirements auto-linked

Next: Review the markdown file, then approve or regenerate.

[approve] → Save and move to next doc
[revise] → Ask different questions and regenerate
[skip] → Move to next gap without saving
```

**If user approves:**
- Move to next selected doc (repeat step 2a)

**If user revises:**
- Ask follow-up questions
- Re-run generation with new answers

**If user skips:**
- Mark gap as deferred
- Move to next doc

---

### 2b. Selection Menu (If User Picks)

Show all gaps as a checklist:

```
Which docs would you like to generate? (Mark with [x])

Required:
  [x] Threat Model
  [ ] Architecture Decision Records
  [ ] Runbook

Recommended:
  [x] API Specification
  [ ] Deployment Procedure
  [ ] Data Model Documentation

Optional:
  [ ] Changelog
  [ ] Contributing Guide

[done] → Generate the 2 checked docs
[add all required] → Select all Required docs
[clear] → Start over
```

After selection, confirm:

```
You've selected 2 docs to generate. Estimate time: 10-15 minutes.

Ready to start?
[yes] → Begin generation
[no] → Go back and adjust
```

Then proceed to step 2a (Sequential Generation).

---

### 3. Synthesis Questions — Doc Type Specifics

For each document type, ask targeted questions to fill extraction gaps.

**Use breadcrumb heuristics from `skills/guide/references/breadcrumb-heuristics.md`.**

**Example questions per doc type:**

| Doc Type | Sample Questions |
|----------|------------------|
| **Threat Model** | What sensitive operations exist? Known external dependencies? Attack vectors you're concerned about? |
| **ADRs** | Major architecture decisions made? Tradeoffs considered (monolith vs. microservices)? Tech stack choices? |
| **Runbook** | Deployment frequency? Health checks and alerts? Rollback procedure? On-call escalation? |
| **API Spec** | Authentication method? Rate limiting? Pagination? Error codes? Versioning strategy? |
| **Deployment Procedure** | CI/CD pipeline stages? Approval gates? Rollback trigger? Monitoring post-deploy? |
| **Test Plan** | Coverage targets? Manual vs. automated split? Test environments? Performance benchmarks? |
| **Data Model** | Data retention requirements? PII classification? Schema versioning? Backup/restore? |

**Question delivery format:**

```
Threat Model — Question 1 of 2

[Question text]

Your answer: [capture user input]
```

---

### 4. Generation Command

After collecting answers, save to JSON and run CLI:

```bash
ANSWERS_JSON='{"externalDeps":["..."],"sensitiveOps":["..."]}'
cd <project-path> && npx vibe-doc generate threat-model \
  --format both \
  --answers "$ANSWERS_JSON"
```

**Parse output:**
- Extract file paths (e.g., `docs/generated/threat-model.md`)
- Extract confidence scores per section
- Extract source attributions

---

### 5. Present Results

Show what was created:

```
✓ Threat Model generated

Files:
  markdown:  docs/generated/threat-model.md (2,400 words)
  docx:      docs/generated/threat-model.docx

Content breakdown:
  • Executive summary
  • Attack surface inventory (extracted from code + your input)
  • Threat scenarios (attack trees, entry points)
  • Mitigations and controls
  • Compliance checklist (HIPAA §164.308 mapping)

Confidence by section:
  ✓ Attack surface (94%) — High confidence
  ⚠ Mitigations (72%) — Medium, please review
  ✓ Compliance (88%) — High confidence

Source attributions included in document.

Next step: Review the markdown, then either:
[approve] → Mark as complete and generate more docs
[revise] → Ask different questions and regenerate
[skip] → Move to next gap
```

---

### 6. Document Review Checkpoint

Ask user to review before moving on:

```
Before we move to the next doc, take a moment to review what was generated.

Open: docs/generated/threat-model.md

Things to check:
  • Does the attack surface match your app?
  • Are mitigations practical for your stack?
  • Any confidence flags (marked ⚠) that need manual review?

[approve] → Document is good, move to next gap
[revise] → I'll ask different questions and regenerate
[edit] → I'll open the markdown so you can edit manually
[skip] → Skip this doc for now, move to next
```

---

### 7. Completion Summary

After all selected docs are generated:

```
Generation Complete ✓
━━━━━━━━━━━━━━━━━━━━

Generated: 3 documents
  ✓ Threat Model
  ✓ API Specification
  ✓ Runbook

Files saved to: docs/generated/

Coverage improved: 28% → 57% (4 of 7 Required docs)

What's next?

[more] → Generate more docs
[check] → Run CI validation
[done] → Finish (docs are ready to review)
```

---

## Error Handling

### No Scan Exists

```
I don't see a project profile yet. Run the Scan skill first to:
  • Analyze your artifacts
  • Classify your app type
  • Identify documentation gaps

Then come back here to generate docs.
```

### Generation Command Fails

```
Generation failed: [error message]

This could mean:
  • The answers you provided didn't match expected format
  • The doc template is missing or corrupted
  • A file system error occurred

Options:
[retry] → Try again with same questions
[different] → Ask different synthesis questions
[manual] → Skip this doc and move to next
```

### Low Confidence Sections

If a section has <70% confidence:

```
⚠ Low Confidence Flag: "Mitigations" section (68% confidence)

This section was generated from limited artifact information and may need 
manual review or revision. I've marked it with flags in the document.

Suggestions:
  • Review "Mitigations" manually and adjust
  • Re-generate with more specific answers to synthesis questions
  • Leave as-is (it's a starting point, not final)

[revise] → Ask different questions and regenerate
[continue] → Keep this version, move to next doc
```

---

## State & Output

**Read from `.vibe-doc/state.json`:**
- Classification (to select appropriate doc types)
- Gaps list (to show what's available to generate)
- Generation history (to track what's been done)

**Write to `.vibe-doc/state.json`:**
- Generated doc metadata (file paths, timestamps, confidence scores)

**Files created in user's project:**
- `docs/generated/<doc-type>.md` — markdown version
- `docs/generated/<doc-type>.docx` — docx version
- `docs/generated/.history/<doc-type>-<timestamp>.md` — version history

---

## Synthesis Questions Reference

Full question sets per doc type are in `skills/guide/references/breadcrumb-heuristics.md`.

Each skill consults that reference to build context-appropriate questions for each gap type.

---

**Last updated:** 2026-04-11 | **Version:** 1.0
