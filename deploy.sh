#!/bin/bash
set -e  # Abort on any failure — never push a broken build

VERSION=2.2.33
# ──────────────────────────────────────────────────────────────────────────────
# Usage:
#   ./deploy.sh                                 bump patch, no changelog entry
#   ./deploy.sh patch "Fixed the thing"         bump patch + changelog message
#   ./deploy.sh minor "New feature name"        bump minor
#   ./deploy.sh major "Breaking change"         bump major
#
#   Always pushes to dev. Prompts to also release to stable at the end.
# ──────────────────────────────────────────────────────────────────────────────

FIELD=${1:-patch}
MESSAGE=${2:-""}

# ── Pre-flight ────────────────────────────────────────────────────────────────

BRANCH=$(git rev-parse --abbrev-ref HEAD | xargs)
if [[ "$BRANCH" != "dev" ]]; then
    echo "✗  Must be on dev branch (currently '$BRANCH')."
    exit 1
fi

UNCOMMITTED=$(git status --porcelain)
if [[ -n "$UNCOMMITTED" ]]; then
    echo "✗  Uncommitted changes — commit or stash first:"
    echo "$UNCOMMITTED"
    exit 1
fi

# ── Version bump ──────────────────────────────────────────────────────────────

IFS='.' read -r major minor patch <<< "$VERSION"

case $FIELD in
    major) ((major++)); minor=0; patch=0 ;;
    minor) ((minor++)); patch=0 ;;
    patch) ((patch++)) ;;
    *) echo "✗  Invalid field '$FIELD'. Use: major | minor | patch"; exit 1 ;;
esac

NEW_VERSION="$major.$minor.$patch"

echo ""
echo "  ┌──────────────────────────────────────────┐"
printf "  │  %-40s  │\n" "v$VERSION  →  v$NEW_VERSION  ($FIELD bump)"
[[ -n "$MESSAGE" ]] && printf "  │  %-40s  │\n" "\"$MESSAGE\""
echo "  └──────────────────────────────────────────┘"
echo ""

# ── Patch files ───────────────────────────────────────────────────────────────

# Version constant in src/main.ts
sed -i "s/const MOD_VERSION = \"[^\"]*\"/const MOD_VERSION = \"$NEW_VERSION\"/" src/main.ts

# Inject a changelog entry at the top of the CHANGELOG array (requires node, always available)
if [[ -n "$MESSAGE" ]]; then
    node -e "
const fs   = require('fs');
const msg  = process.argv[1];
const ver  = process.argv[2];
let c = fs.readFileSync('src/main.ts', 'utf8');
const entry = '    {\n        version: \"' + ver + '\",\n        changes: [\n            \"' + msg + '\",\n        ],\n    },\n';
const anchor = 'const CHANGELOG: Array<{ version: string; changes: string[] }> = [';
c = c.replace(anchor, anchor + '\n' + entry);
fs.writeFileSync('src/main.ts', c);
" "$MESSAGE" "$NEW_VERSION"
fi

# Version in package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" package.json

# Self-update VERSION= line in this script so it stays current
sed -i "0,/^VERSION=.*/s/^VERSION=.*/VERSION=$NEW_VERSION/" deploy.sh

# ── Build ─────────────────────────────────────────────────────────────────────

echo "Building..."
npm run build
echo "✓  Build OK (dist/ is gitignored — CI builds for real on push)"
echo ""

# ── Commit + push dev ─────────────────────────────────────────────────────────

git add src/main.ts package.json deploy.sh
git commit -m "v$NEW_VERSION${MESSAGE:+ — $MESSAGE}"
git push origin dev
echo "✓  Pushed to dev — CI will build and deploy to /dev/ automatically."
echo ""

# ── Optionally release to stable ──────────────────────────────────────────────

read -r -p "  Release v$NEW_VERSION to stable? [y/N] " CONFIRM
echo ""
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    git checkout master
    git merge dev -X theirs --no-edit
    git push origin master
    git checkout dev
    echo "✓  Pushed to master — CI will build and deploy to /stable/ automatically."
else
    echo "  Skipped stable. Merge manually when ready:"
    echo "  git checkout master && git merge dev -X theirs --no-edit && git push origin master && git checkout dev"
fi

echo ""
echo "✓  Done. v$NEW_VERSION"
