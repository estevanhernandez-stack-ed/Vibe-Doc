# Vibe Doc Check — GitHub Action

Zero-config CI integration for documentation freshness. Runs `vibe-doc check` in your GitHub Actions workflow to enforce that required docs exist and haven't gone stale.

## Usage

### Basic Setup

Add to any workflow file (e.g., `.github/workflows/docs.yml`):

```yaml
- uses: 626labs/vibe-doc@v1
```

### With Custom Threshold

Set staleness threshold (commits since last update):

```yaml
- uses: 626labs/vibe-doc@v1
  with:
    threshold: 30
```

### Custom Project Path

For monorepos, specify the target directory:

```yaml
- uses: 626labs/vibe-doc@v1
  with:
    path: './packages/core'
    threshold: 20
```

## Full Workflow Example

```yaml
name: Documentation Check
on: [push, pull_request]

jobs:
  doc-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: 626labs/vibe-doc@v1
        with:
          threshold: 20
          path: '.'
```

## Workflow with Scan + Check

For a comprehensive documentation workflow (scan for issues, then validate):

```yaml
name: Full Documentation Pipeline
on: [push, pull_request]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install Vibe Doc
        run: npm install -g @vibe-doc/cli

      - name: Scan for Missing Docs
        run: vibe-doc scan
        continue-on-error: true

      - name: Check Documentation Freshness
        run: vibe-doc check --threshold 20
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `threshold` | Staleness threshold in commits | No | `20` |
| `path` | Path to the project root | No | `.` |

## Outputs

None. The action fails the workflow if checks don't pass (exit code 1).

## Exit Codes

- **0**: All checks passed
- **1**: Documentation stale or missing

## Requirements

- Node.js 18+ (automatically set up by the action)
- Git repository with commit history
- `vibe-doc` configuration in your project (`.vibe-doc.config.js` or similar)
