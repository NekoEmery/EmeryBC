# Release Workflow

## Branches

| Branch | Purpose | FUSAM channel |
|--------|---------|---------------|
| `dev`  | Active development — commit freely | `dev` |
| `master` | Stable releases only — merge from dev when ready | `stable` |

FUSAM stable users only get an update when `master` changes.
FUSAM dev users always get whatever is on the `dev` branch.

---

## Day-to-day development

Work on the `dev` branch:

```bash
git checkout dev
# ... make changes ...
npm run build
git add src/ dist/bundle.js
git commit -m "describe what you did"
git push
```

---

## Releasing a stable version

1. Bump the version in `src/main.ts` and `package.json`
2. Add a changelog entry in `src/main.ts`
3. Build the minified production bundle:
   ```bash
   npm run build:prod
   ```
4. Commit the version bump + built bundle on `dev`:
   ```bash
   git add src/main.ts package.json dist/bundle.js
   git commit -m "v1.x.x — short summary"
   git push
   ```
5. Merge `dev` into `master`:
   ```bash
   git checkout master
   git merge dev
   git push
   git checkout dev
   ```

FUSAM stable users will pick up the new `master` bundle automatically.

---

## Build scripts

| Command | Output | Use for |
|---------|--------|---------|
| `npm run build` | Unminified bundle | Day-to-day dev work |
| `npm run build:prod` | Minified bundle | Stable releases (merge to master) |
| `npm run dev` | Watch mode | Live editing |
