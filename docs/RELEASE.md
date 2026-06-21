# Release Process

This guide covers the release workflow for the PlanFS repository and the VS Code extension package.

## Release Checklist

Before publishing:

- [ ] Confirm the working tree is clean.
- [ ] Confirm the target version in package metadata.
- [ ] Run lint, build, tests, and PlanFS validation.
- [ ] Build a local VSIX.
- [ ] Install and smoke test the VSIX in VS Code.
- [ ] Publish the VS Code extension when ready.
- [ ] Tag the release after publishing succeeds.

## 1. Prepare The Branch

Start from an up-to-date main branch:

```sh
git switch main
git pull --ff-only
git status -sb
```

Create a release branch if the release needs final edits:

```sh
git switch -c release/v0.1.0
```

## 2. Update Version Metadata

PlanFS currently uses workspace package versions. Update all package versions that are part of the release:

```sh
npm version 0.1.0 --workspaces --include-workspace-root --no-git-tag-version --workspaces-update=false
npm pkg set dependencies.planfs-schema=0.1.0 --workspace src/core
npm pkg set dependencies.planfs-core=0.1.0 --workspace src/cli
npm pkg set dependencies.planfs-core=0.1.0 --workspace src/vscode
npm install --package-lock-only --ignore-scripts
```

Keep local workspace dependency ranges aligned with the release version. Without `--workspaces-update=false`, npm may try to update the workspace install before those ranges have been changed and look for stale internal packages such as `planfs-core@0.1.0` in the public registry.

If the CLI, core, schema, and VS Code extension are not being released together, update only the relevant package manifests and verify local workspace dependency ranges point at versions that will be available to consumers.

Review:

```sh
git diff -- package.json src/*/package.json package-lock.json
```

## 3. Run Verification

From the repository root:

```sh
npm ci
npm run lint
npm run build --workspaces
npm test --workspaces
node src/cli/dist/cli.js validate
```

For CI-style validation output:

```sh
node src/cli/dist/cli.js validate --format json
```

## 4. Build The VS Code Extension

Use the staging workflow. Do not package directly from `src/vscode` because local workspace symlinks can produce invalid VSIX contents.

```sh
npm run package:vscode
```

The VSIX is written to:

```sh
dist/planfs-vscode-0.1.0.vsix
```

The script also prints the local install command:

```sh
code --install-extension "/absolute/path/to/dist/planfs-vscode-0.1.0.vsix" --force
```

## 5. Smoke Test The VSIX

Install the generated VSIX into a normal VS Code instance:

```sh
code --install-extension dist/planfs-vscode-0.1.0.vsix --force
```

If the install emits a Node deprecation warning, trace it before treating it as a PlanFS packaging issue. On macOS, run the VS Code CLI with Node tracing enabled:

```sh
ELECTRON_RUN_AS_NODE=1 "/Applications/Visual Studio Code.app/Contents/MacOS/Code" --trace-deprecation "/Applications/Visual Studio Code.app/Contents/Resources/app/out/cli.js" --install-extension "/absolute/path/to/dist/planfs-vscode-0.1.0.vsix" --force
```

As of VS Code 1.125.1, the known `DEP0169` warning for `url.parse()` comes from VS Code's extension gallery metadata request in `cliProcessMain.js` after a successful local VSIX install. PlanFS source and packaging scripts do not call `url.parse()`. Track this as an upstream VS Code CLI warning and retest when updating the local VS Code version used for release verification.

Then open a repository with `.planfs/` and verify:

- The PlanFS activity bar view appears.
- `PlanFS: Initialize Repository` is available.
- `PlanFS: Open Backlog` opens the backlog view, supports capture, filtering, grouping, ordered card browsing, and selected-item editing.
- `PlanFS: Open Board` opens the board.
- The board supports Status Board and Next Work modes. Status Board supports swimlane grouping, contextual task creation, bulk updates, and collapsed Done columns; Next Work groups ready, active, review, blocked, and later tasks with ranking reason badges.
- Selecting a board card opens its details drawer with planning metadata and context, while Markdown body editing remains in the task file through Open Markdown.
- `PlanFS: Open Insights` opens insights.
- The Insights dependency graph renders task nodes by epic lane, supports filters, zoom controls, and dependency highlighting.
- The Insights timeline shows a now marker with dated tasks, epics, and milestones placed on the time axis.
- `PlanFS: Create Task`, `PlanFS: Create Epic`, and `PlanFS: Create Milestone` work.
- `PlanFS: Open Structured Editor` shows an epic-scoped task board for epics, renders common Markdown sections, and keeps full body editing in the Markdown file through Open Markdown.
- Assignee and owner inputs still accept arbitrary text while offering Git-derived developer suggestions when available.
- `planfs next` lists ranked next-work candidates and can include blocked work with explanations.
- `planfs backlog list`, `planfs backlog capture`, `planfs backlog set-state`, and `planfs backlog review` work.
- The Explorer refreshes after editing `.planfs` files.

To remove a local VSIX install:

```sh
code --uninstall-extension dijgrid.planfs-vscode
```

## 6. Publish To The VS Code Marketplace

Confirm the publisher in `src/vscode/package.json` matches the Marketplace publisher account:

```json
"publisher": "dijgrid"
```

Authenticate if needed:

```sh
npx @vscode/vsce login dijgrid
```

Publish from the staged extension directory created by `npm run package:vscode`:

```sh
cd dist/vscode-package
npx @vscode/vsce publish
```

If publishing manually through the Marketplace UI, upload:

```sh
dist/planfs-vscode-0.1.0.vsix
```

The Marketplace item URL should follow this structure:

```text
https://marketplace.visualstudio.com/items?itemName=dijgrid.planfs-vscode
```

VS Code search can lag behind the Marketplace page. Search by full extension ID when checking propagation:

```text
@id:dijgrid.planfs-vscode
```

## 7. Tag The Release

After publishing succeeds, tag the release from the commit that produced the published artifact:

```sh
git status -sb
git tag v0.1.0
git push origin v0.1.0
```

If a release branch was used, open and merge the release pull request before tagging from `main`, unless the team intentionally tags before merge.

## 8. Post-Release Checks

After publishing:

- Confirm the Marketplace page renders with the expected README and icon.
- Install the extension from Marketplace in VS Code.
- Run a quick PlanFS workflow in a test repository.
- Update `.planfs` release or follow-up tasks if anything remains.

## Troubleshooting

Before release packaging, review dependency status and security advisories:

```sh
npm outdated --workspaces --long
npm audit --workspaces --audit-level=low
```

Apply safe patch and minor updates before packaging. Document major-version upgrades as follow-up work unless the release includes the required migration and full verification. Current major families intentionally held for migration planning include ESLint, TypeScript, Node type definitions, and yargs. Keep `src/vscode` `@types/vscode` aligned with `engines.vscode`; `vsce` rejects packages whose declared VS Code API type version is newer than the extension engine range.

If `npx @vscode/vsce publish` cannot detect repository links, confirm `src/vscode/package.json` includes repository metadata and that README image/link references use Marketplace-safe URLs.

If `npm run package:vscode` stalls during dependency install, retry with a clean npm cache:

```sh
NPM_CONFIG_CACHE=/private/tmp/planfs-npm-cache npm run package:vscode
```

If the extension does not appear in VS Code after publishing, wait a few minutes and search by full extension ID:

```text
@id:dijgrid.planfs-vscode
```
