#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PACKAGE_DIR="$ROOT_DIR/dist/vscode-package"
NPM_CACHE="${NPM_CONFIG_CACHE:-/private/tmp/planfs-npm-cache}"

if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    eval "$(brew shellenv)"
  elif [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
fi

EXTENSION_VERSION="$(node -p "require('$ROOT_DIR/src/vscode/package.json').version")"
SCHEMA_VERSION="$(node -p "require('$ROOT_DIR/src/schema/package.json').version")"
CORE_VERSION="$(node -p "require('$ROOT_DIR/src/core/package.json').version")"
VSIX_PATH="$ROOT_DIR/dist/planfs-vscode-$EXTENSION_VERSION.vsix"

cd "$ROOT_DIR"

echo "Building workspace packages..."
npm run build --workspaces

echo "Preparing clean VS Code extension package directory..."
mkdir -p "$PACKAGE_DIR"
rsync -a --delete --exclude node_modules "$ROOT_DIR/src/vscode/" "$PACKAGE_DIR/"
npm pkg delete scripts.vscode:prepublish --prefix "$PACKAGE_DIR"

echo "Packing local workspace dependencies..."
npm_config_cache="$NPM_CACHE" npm pack --workspace src/schema --pack-destination "$ROOT_DIR/dist"
npm_config_cache="$NPM_CACHE" npm pack --workspace src/core --pack-destination "$ROOT_DIR/dist"

echo "Installing packaged extension runtime dependencies..."
npm_config_cache="$NPM_CACHE" npm install \
  --prefix "$PACKAGE_DIR" \
  --omit=dev \
  --no-save \
  "$ROOT_DIR/dist/planfs-schema-$SCHEMA_VERSION.tgz" \
  "$ROOT_DIR/dist/planfs-core-$CORE_VERSION.tgz" \
  yaml \
  ajv

echo "Building VSIX..."
cd "$PACKAGE_DIR"
npx @vscode/vsce package --out "$VSIX_PATH"

cat <<EOF

VSIX created:
$VSIX_PATH

Install with:
code --install-extension "$VSIX_PATH" --force
EOF
