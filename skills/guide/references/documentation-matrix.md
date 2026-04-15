# Documentation Matrix

Reference for agents. Maps (Primary Category × Deployment Context) to doc type tiers (Required/Recommended/Optional).

**Used by:** Scan skill (to determine gaps), Generate skill (to select doc types).

---

## Core Matrix (7×7)

Primary Categories × 7 Document Types. Base tier before deployment context modifiers.

| Category | Threat Model | ADRs | Runbook | API Spec | Deployment Proc | Test Plan | Data Model |
|----------|--------------|------|---------|----------|-----------------|-----------|------------|
| **Web App** | Required | Required | Required | Recommended | Recommended | Recommended | Recommended |
| **API/Microservice** | Required | Required | Required | Required | Recommended | Recommended | Recommended |
| **Data Pipeline** | Recommended | Required | Required | Optional | Recommended | Recommended | Required |
| **Infrastructure/Platform** | Required | Required | Required | Recommended | Required | Recommended | Recommended |
| **Mobile App** | Recommended | Required | Recommended | Recommended | Required | Required | Recommended |
| **AI/ML System** | Recommended | Required | Required | Recommended | Required | Required | Required |
| **Integration/Connector** | Recommended | Recommended | Recommended | Recommended | Optional | Optional | Recommended |

---

## Deployment Context Modifiers

### Regulated (HIPAA, PCI-DSS, SOC 2, GDPR, FedRAMP, NIST, ISO 27001)

**Effect:** Elevates all docs one tier (Required → stays Required; Recommended → Required; Optional → Recommended).

**Special additions:**
- Threat Model becomes Required (if not already)
- Deployment Procedure must document compliance controls
- Data Model must include retention and data residency

**Examples:**
- Web App + Regulated: Threat Model (R), ADRs (R), Runbook (R), API Spec (R), Deployment Proc (R), Test Plan (Rec), Data Model (Rec)

---

### Customer-Facing

**Effect:** Elevates User-visible docs (Runbook, Test Plan, API Spec if customers integrate).

**Special additions:**
- Runbook becomes Required (SLAs, escalation must be documented)
- Test Plan becomes Required (customer regression testing essential)
- API Specification becomes Required (if customers call APIs)

**Examples:**
- Web App + Customer-Facing: Threat Model (R), ADRs (R), Runbook (R), API Spec (Rec→R if exposed), Deployment Proc (Rec), Test Plan (Rec→R), Data Model (Rec)

---

### Internal Tooling

**Effect:** Lowers non-critical docs. Runbook can focus on rapid recovery vs. prevention.

**Special additions:**
- Optional docs may stay optional (lower urgency on Changelog, Contributing)
- Threat Model may downgrade to Recommended (internal attack surface smaller)

**Examples:**
- Data Pipeline + Internal: Threat Model (Rec), ADRs (R), Runbook (R), API Spec (Opt), Deployment Proc (Rec), Test Plan (Rec), Data Model (R)

---

### Multi-Tenant

**Effect:** Makes Data Model and API Spec Required (isolation strategy must be clear).

**Special additions:**
- Data Model Documentation becomes Required
- API Specification becomes Required (tenant context, authorization scopes)
- Threat Model must include tenant isolation analysis

**Examples:**
- Web App + Multi-Tenant: Threat Model (R), ADRs (R), Runbook (R), API Spec (Rec→R), Deployment Proc (Rec), Test Plan (Rec), Data Model (Rec→R)

---

### Edge / Embedded

**Effect:** Elevates deployment and testing docs.

**Special additions:**
- Deployment Procedure becomes Required (OTA, version mgmt, device rollback)
- Runbook becomes Required (resource exhaustion, connectivity issues)
- Test Plan becomes Required (performance under constraints)

**Examples:**
- Mobile App + Edge: Threat Model (Rec), ADRs (R), Runbook (Rec→R), API Spec (Rec), Deployment Proc (Rec→R), Test Plan (Rec→R), Data Model (Rec)

---

## Applied Examples

### Example 1: Web App + Regulated (HIPAA) + Customer-Facing

**Base (Web App):**
- Threat Model: Required
- ADRs: Required
- Runbook: Required
- API Spec: Recommended
- Deployment Proc: Recommended
- Test Plan: Recommended
- Data Model: Recommended

**Apply Regulated modifier:**
- Everything Recommended → Required
- Threat Model (stays Required)
- Result: Threat Model (R), ADRs (R), Runbook (R), API Spec (R), Deployment Proc (R), Test Plan (R), Data Model (R)

**Apply Customer-Facing modifier:**
- Runbook (stays Required)
- Test Plan (stays Required)
- API Spec (stays Required)
- Result: All 7 docs are Required

---

### Example 2: Data Pipeline + Internal Tooling

**Base (Data Pipeline):**
- Threat Model: Recommended
- ADRs: Required
- Runbook: Required
- API Spec: Optional
- Deployment Proc: Recommended
- Test Plan: Recommended
- Data Model: Required

**Apply Internal Tooling modifier:**
- Threat Model: Recommended (downgrades to Optional for truly internal)
- Rest stay the same
- Result: Threat Model (Opt), ADRs (R), Runbook (R), API Spec (Opt), Deployment Proc (Rec), Test Plan (Rec), Data Model (R)

---

### Example 3: API/Microservice + Multi-Tenant

**Base (API/Microservice):**
- Threat Model: Required
- ADRs: Required
- Runbook: Required
- API Spec: Required
- Deployment Proc: Recommended
- Test Plan: Recommended
- Data Model: Recommended

**Apply Multi-Tenant modifier:**
- Data Model: Recommended → Required
- API Spec: Required (stays required, now must include tenant context)
- Threat Model: Required (must include isolation analysis)
- Result: Threat Model (R), ADRs (R), Runbook (R), API Spec (R), Deployment Proc (Rec), Test Plan (Rec), Data Model (R)

---

### Example 4: Mobile App + Edge + Customer-Facing

**Base (Mobile App):**
- Threat Model: Recommended
- ADRs: Required
- Runbook: Recommended
- API Spec: Recommended
- Deployment Proc: Required
- Test Plan: Required
- Data Model: Recommended

**Apply Edge modifier:**
- Deployment Proc: Required (stays required, OTA focus)
- Runbook: Recommended → Required (device recovery, offline handling)
- Test Plan: Required (stays required, add resource constraints)

**Apply Customer-Facing modifier:**
- Runbook: Required (stays required)
- Test Plan: Required (stays required)
- API Spec: Recommended → Required (if customers integrate)

**Final:** Threat Model (Rec), ADRs (R), Runbook (R), API Spec (R), Deployment Proc (R), Test Plan (R), Data Model (Rec)

---

## Tier Definitions

### Required (Deployment Blocker)

Must exist and be current before production deployment. Missing or stale Required docs block the `vibe-doc check` command.

**Characteristics:**
- Essential for safe operations
- Directly impacts security, reliability, or compliance
- Must be reviewed before deployment decision

### Recommended (Should Do)

Should exist before production, but not a hard blocker. Helpful for operations, support, and future maintenance.

**Characteristics:**
- Valuable for ongoing operations
- Helps with debugging, scaling, and knowledge transfer
- Can be created shortly after deployment with a priority

### Optional (Nice to Have)

Lower priority. Good to have but not essential for initial deployment. Often created after the system is stable.

**Characteristics:**
- Community-focused (Contributing Guide)
- Long-term knowledge (Changelog, Benchmarks)
- Can be added in retrospect without risk

---

## How Agents Use This Matrix

**During Scan skill:**
1. Determine primary category (Web App, API, etc.)
2. Identify deployment contexts (Regulated? Customer-facing? Multi-tenant? Edge?)
3. Look up base tiers from matrix
4. Apply each deployment context modifier
5. Calculate final Required/Recommended/Optional lists

**During Generate skill:**
1. Show user which gaps are Required vs. Recommended
2. Suggest starting with Required tier
3. Let user pick specific gaps to generate
4. Pre-populate synthesis questions based on doc type

**During Check skill:**
1. Read classification from state
2. Look up Required docs for that classification
3. Check if Required docs exist and are current
4. Return pass/fail based on Required tier only (Recommended/Optional ignored)

---

## Tier Override Pattern

If user's situation doesn't match the matrix:

```
The matrix suggests Threat Model is Recommended for your stack.
But given that you're handling customer payment data, I'm elevating 
it to Required.

Do you agree, or would you like to override?
[agree] → Threat Model is Required
[override] → Keep it as Recommended
```

Agents should respect user overrides. Document the override in state for future reference.

---

**Last updated:** 2026-04-11 | **Reference version:** 1.0
