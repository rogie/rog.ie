---
name: publish
description: Builds, verifies, and deploys rog.ie with the latest PropsKit, Lab, and editor playground assets from FigUI3. Use when the user invokes /publish or asks to publish this site.
disable-model-invocation: true
---

# Publish rog.ie

Use the repository's `./publish` script. Do not reproduce its sync logic manually.

## Sync

When the user invokes `/publish` without `confirm`:

1. Check the worktree without discarding unrelated changes.
2. Stop the local Eleventy server before replacing playground directories; concurrent passthrough copying can produce partial output.
3. Run `./publish`.
4. Restart `npm run serve` if the local server was running.
5. Verify:
   - `/propskit/`
   - `/propskit/lab/`
   - `/propkit/` and its known subroutes redirect to their `/propskit/` equivalents.
   - `/figui3/` and its known subroutes redirect to their `/propskit/` equivalents.
   - Lab loads the generated `fig`, `fig-editor`, and `fig-lab` JS/CSS chunks.
   - Standalone `fig.js`, `fig-editor.js`, `fig-lab.js`, and `propskit.js` can be imported successfully with their relative dependencies.
6. Report the synced upstream FigUI3 commit. Do not commit or push yet.

The sync must build FigUI3's root package before the playground, build only the canonical `/propskit/` output, copy Vite's hashed chunks, required public static directories, and the complete top-level JS/CSS inventory from the root package's built `dist`, verify that standalone relative module imports resolve, enable Full editor for `/propskit/lab/`, replace `/figui3/` and `/propkit/` with compatibility redirects, and rebuild Eleventy from a clean output directory.

## Cache or mismatch recovery

If the playground differs from the pushed FigUI3 repository:

1. Compare GitHub `main`, the temporary checkout HEAD, and relevant playground source blob hashes.
2. If the temporary checkout is invalid, remove `/tmp/figui3-publish-temp` and rerun.
3. Clear `playground/node_modules/.vite` and `.vite-temp`, then rebuild.
4. Verify actual browser-loaded resource URLs. Do not infer loaded component builds from DOM markup alone.

## Confirm

Only when the user invokes `/publish confirm` or `publish confirm`:

1. Review `git status`, the full diff, and recent commit style.
2. Run `./publish confirm`.
3. Verify the push succeeded and the worktree is clean.
