# VS Code Extension Build and Local Install

This guide explains how to run the PlanFS VS Code extension in development and how to package a local `.vsix` for installation into your normal VS Code instance.

## Development Host

Use this for day-to-day extension development. It avoids packaging and runs the extension directly from this repository.

```sh
npm install
npm run build --workspaces
code .
```

In VS Code:

1. Open the Run and Debug view.
2. Select `Run PlanFS Extension`.
3. Press `F5`.
4. In the Extension Development Host, open this repository or another folder containing `.planfs/`.
5. Use the command palette:
   - `PlanFS: Open Board`
   - `PlanFS: Open Insights`
   - `PlanFS: Create Task`
   - `PlanFS: Refresh Explorer`

## Build a Local VSIX

The extension depends on local workspace packages (`planfs-core` and `planfs-schema`). Do not package directly from `src/vscode` after installing those dependencies there, because npm workspaces may create symlinks that the VSIX format rejects.

Instead, package from a clean staging directory under `dist/`.

From the repository root:

```sh
npm install
npm run build --workspaces
mkdir -p dist/vscode-package
rsync -a --delete --exclude node_modules src/vscode/ dist/vscode-package/
npm_config_cache=/private/tmp/planfs-npm-cache npm pack --workspace src/schema --pack-destination dist
npm_config_cache=/private/tmp/planfs-npm-cache npm pack --workspace src/core --pack-destination dist
npm_config_cache=/private/tmp/planfs-npm-cache npm install --prefix dist/vscode-package --omit=dev --no-save ./dist/planfs-schema-0.1.0.tgz ./dist/planfs-core-0.1.0.tgz yaml ajv
cd dist/vscode-package
npx @vscode/vsce package --out ../planfs-vscode-0.1.0.vsix
cd ../..
```

The VSIX will be written to:

```sh
dist/planfs-vscode-0.1.0.vsix
```

`dist/` is ignored by Git.

## Install the VSIX

Install from the command line:

```sh
code --install-extension dist/planfs-vscode-0.1.0.vsix
```

Or install from VS Code:

1. Open Extensions.
2. Select the `...` menu.
3. Choose `Install from VSIX...`.
4. Pick `dist/planfs-vscode-0.1.0.vsix`.

After installation, open a repository containing `.planfs/`. The PlanFS activity bar view should appear, and the command palette should include:

- `PlanFS: Open Board`
- `PlanFS: Open Insights`
- `PlanFS: Create Task`
- `PlanFS: Refresh Explorer`

## Reinstall After Changes

After changing extension or core code:

```sh
npm run build --workspaces
mkdir -p dist/vscode-package
rsync -a --delete --exclude node_modules src/vscode/ dist/vscode-package/
npm_config_cache=/private/tmp/planfs-npm-cache npm pack --workspace src/schema --pack-destination dist
npm_config_cache=/private/tmp/planfs-npm-cache npm pack --workspace src/core --pack-destination dist
npm_config_cache=/private/tmp/planfs-npm-cache npm install --prefix dist/vscode-package --omit=dev --no-save ./dist/planfs-schema-0.1.0.tgz ./dist/planfs-core-0.1.0.tgz yaml ajv
cd dist/vscode-package
npx @vscode/vsce package --out ../planfs-vscode-0.1.0.vsix
cd ../..
code --install-extension dist/planfs-vscode-0.1.0.vsix --force
```

Reload VS Code after reinstalling.

## Troubleshooting

If packaging fails because `@vscode/vsce` is missing, install it through `npx` as shown above or install it globally:

```sh
npm install -g @vscode/vsce
```

If `npm pack` fails because your default npm cache has permission problems, keep the `npm_config_cache=/private/tmp/planfs-npm-cache` prefix shown above. It uses a temporary cache directory instead of `~/.npm`.

If the installed extension cannot find `planfs-core`, rebuild the VSIX from the clean staging workflow instead of packaging directly from `src/vscode`.

If you previously installed workspace-linked dependencies under `src/vscode/node_modules`, remove that directory before packaging directly from `src/vscode`. The staging workflow above avoids this issue entirely.

If commands do not appear, confirm the installed extension ID and reinstall:

```sh
code --list-extensions | grep planfs
code --install-extension dist/planfs-vscode-0.1.0.vsix --force
```
