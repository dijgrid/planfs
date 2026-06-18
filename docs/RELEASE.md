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
npm version 0.1.0 --workspaces --include-workspace-root --no-git-tag-version
```

If the CLI, core, schema, and VS Code extension are not being released together, update only the relevant package manifests and verify local workspace dependency ranges still match.

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

Then open a repository with `.planfs/` and verify:

- The PlanFS activity bar view appears.
- `PlanFS: Initialize Repository` is available.
- `PlanFS: Open Board` opens the board.
- `PlanFS: Open Insights` opens insights.
- `PlanFS: Create Task`, `PlanFS: Create Epic`, and `PlanFS: Create Milestone` work.
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

If `npx @vscode/vsce publish` cannot detect repository links, confirm `src/vscode/package.json` includes repository metadata and that README image/link references use Marketplace-safe URLs.

If `npm run package:vscode` stalls during dependency install, retry with a clean npm cache:

```sh
NPM_CONFIG_CACHE=/private/tmp/planfs-npm-cache npm run package:vscode
```

If the extension does not appear in VS Code after publishing, wait a few minutes and search by full extension ID:

```text
@id:dijgrid.planfs-vscode
```
