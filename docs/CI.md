# CI Validation

PlanFS validation can run in CI by building the workspace packages and executing the CLI against the repository root.

```sh
npm ci
npm run build --workspaces
node src/cli/dist/cli.js validate --format json
```

The command exits with `0` when the repository is valid and `1` when validation fails or the repository cannot be loaded. The `--format json` option emits machine-readable output for CI logs, bots, and future provider integrations.

Example output:

```json
{
  "valid": true,
  "summary": {
    "entities": 26,
    "tasks": 24,
    "epics": 5,
    "milestones": 5,
    "decisions": 1
  },
  "result": {
    "valid": true,
    "errors": []
  }
}
```

## GitHub Actions

This repository includes `.github/workflows/planfs.yml`. It runs on pull requests and pushes to `main` when planning files, source files, package files, or the workflow itself change.

The workflow blocks a pull request when:

- `.planfs` files are invalid
- the CLI cannot load the repository
- workspace packages fail to build

## GitLab CI

Use this job in `.gitlab-ci.yml`:

```yaml
planfs_validate:
  image: node:20
  stage: test
  script:
    - npm ci
    - npm run build --workspaces
    - node src/cli/dist/cli.js validate --format json
  rules:
    - changes:
        - .planfs/**/*
        - src/**/*
        - package.json
        - package-lock.json
```

## Azure Pipelines

Use this job in `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - .planfs/*
      - src/*
      - package.json
      - package-lock.json

pr:
  paths:
    include:
      - .planfs/*
      - src/*
      - package.json
      - package-lock.json

pool:
  vmImage: ubuntu-latest

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'

  - script: npm ci
    displayName: Install dependencies

  - script: npm run build --workspaces
    displayName: Build workspaces

  - script: node src/cli/dist/cli.js validate --format json
    displayName: Validate PlanFS
```
