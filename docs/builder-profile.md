# Builder Profile

## Who They Are
Estevan Hernandez, founder of 626Labs. Full-stack developer and AI-forward builder who has spent the last 6+ months building an AI-augmented project management platform using vibe coding workflows. Comes to this project from having just written a thesis on the exact problem this plugin solves — handling vibe coding artifacts when deploying to corporate production. Motivated by both solving a real problem in his own codebase (626Labs has documented gaps despite exceptional artifact density) and generalizing the solution into a tool others can use.

## Technical Experience
**Level:** Experienced — principal-level systems thinking, full-stack implementation.
**Stack:** React 19, TypeScript, Firebase (Auth, Firestore, Cloud Functions), Vite, Tailwind, Node.js, DigitalOcean. Deep MCP protocol experience (built a 15+ tool MCP server with dual transport). Google Gemini integration via Genkit.
**Plugin/skill experience:** Very comfortable. Has built multiple Cowork plugins, Claude Code skills, agent workflows, and the 626Labs MCP ecosystem. Understands plugin file structures, lifecycle, and distribution.
**AI tools:** Heavy user of Claude Code, Cowork, Claude Desktop, MCP servers, agent orchestration. Has designed agent skill definitions, cross-machine session sync, and autonomous agent workflows.
**Exploring:** Plugin distribution/marketplace patterns, dual-format document generation (markdown + docx).

## Mode
Builder — sharp and fast. Skip explanations, focus on decisions and velocity.

## Project Goals
Build a Cowork/Claude Code plugin that implements the framework from the thesis "Handling Vibe Coding Artifacts When Deploying to Corporate Production." The plugin walks users through a phased pipeline (Inventory → Extraction → Synthesis → Validation) with checkpoints at each gate. It scans a mounted project folder's vibe coding artifacts, classifies the application type, identifies documentation gaps, and produces standard technical documents. Primary goal: solve the documentation gap problem for his own 626Labs project. Secondary goal: ship a generalized plugin that other vibe coders can use.

## Design Direction
No strong visual design signals — this is a CLI/Cowork skill-based plugin, not a UI application. The "design" is in the interaction pattern: phased pipeline with user checkpoints, dual-format output (markdown for repos, docx for stakeholders), and agent-navigable breadcrumbs from the thesis framework. Style should match the sharp, professional tone of the 626Labs ecosystem.

## Architecture Docs
**Provided:** Yes — two primary sources.
1. **The thesis itself** (Handling_Vibe_Coding_Artifacts_Thesis.docx) — Section 7 defines five proposed skills: Artifact Ingestion, Application Classifier, Extraction Engine, Document Synthesis, and Gap Analysis & Reporting.
2. **626Labs ecosystem patterns** — CLAUDE.md, Gold Standard protocol, existing Cowork plugin structures (spec-driven-dev, cowork-plugin-management, 626labs-cowork), and agent skill definitions in .agent/skills/.

These will serve as the architectural foundation during planning.
