# InkLegend — Context for Claude Code

## What is this
ExtendScript (.jsx) for Adobe Illustrator that generates an ink color legend strip (process, spot and technical colors + total ink count) in the top-right corner of the active artboard. Designed for prepress/print production. Open-source (MIT) release, GitHub: `tima100faces/inkslegend`.

Version lives only in the header comment of `src/InkLegend.jsx` (currently 1.1.0).

## Tech stack
- **Script:** ExtendScript (.jsx) — ES3-level JavaScript, runs inside Adobe Illustrator
- **No build step, no obfuscation, no dist.** Single source file: `src/InkLegend.jsx`

## Project structure
```
src/InkLegend.jsx              ← Single source file — edit this only
README.md                      ← Public user docs (install, usage, settings)
img/                           ← README screenshots. Neutral demo data ONLY (rule 9): no real company
                                 name/logo, no local paths, no client file names
LICENSE                        ← MIT
docs/STATUS.md                 ← Current state: done / verified / known issues. Update every session
```
`tasks/` exists only while a task file is pending (see Agent rules).

## Workflow
- Edit only `src/InkLegend.jsx`. Users get just that one file — nothing else to ship.
- No dist/, no build, no obfuscator.

## Key constraints — ExtendScript on macOS 26+

⚠️ **IMPORTANT — tested on macOS 26, Illustrator 2025+:**

- **`app.system()` does NOT exist** — throws `ReferenceError`. Removed in macOS 26+.
- **`$.system()` does NOT exist** — also unavailable on this version.
- **`Socket` is NOT available** — `typeof Socket === "undefined"`.
- **No network access at all from ExtendScript** on macOS 26+.
- **`$.getenv("USER")` works** — returns username.
- **`$.getenv("HOME")` works** — returns home directory path.
- **`$.getenv("HOSTNAME")` is empty** on macOS 26.
- **ES3 only.** No `let`, `const`, arrow functions, template literals, destructuring, `Array.map`, `Promise`.
- **MRAP error.** Never use `item.move()` for grouping — use `app.executeMenuCommand("group")`.
- **No UXP.** Not available for Illustrator as of 2026.

## Critical ES3 gotchas

### Regex `/=` bug
ExtendScript parses `/=` as a division-assignment operator, not a regex start.
- **Wrong:** `/=+$/` — causes `ReferenceError: /= does not have a value`
- **Correct:** `new RegExp("=+$")` — always use RegExp constructor for patterns starting with `=`

### `placedItems.add()` z-order
`doc.placedItems.add()` inserts at the **bottom** of z-stack (unlike `pathItems` which inserts at top).
Always call `pl.zOrder(ZOrderMethod.BRINGTOFRONT)` right after placing a file, before creating subsequent objects.

### `PlacedItem.embed()`
Embedding invalidates the `PlacedItem` reference. Embed **after** grouping, through the group: `grp.placedItems[k].embed()`.
An embedded PDF/AI becomes native vector (no `RasterItem`).

### Binary file writing
Writing binary data via `File.write()` is unreliable on macOS — bytes >127 get corrupted.
Don't embed base64/binary data in the script; use an external file via `placedItems.add()`.

## Logo
- Source: the `logoPath` setting — "Logo file" field in the dialog + **Browse...** (`.ai`, `.pdf`, `.eps`, `.png`, `.jpg`).
- Placed with `placedItems.add()`, scaled to max width 120pt, centered vertically in the strip, brought to front (see z-order above).
- After the legend is grouped (group name `InkLegend`), the logo is **embedded**, so the file looks the same on other machines
  (a linked logo breaks there: `logoPath` is per-machine). If embed fails, an alert is shown and the logo stays linked.
- No path / file missing → a "LOGO" placeholder box is drawn.

## Black as PANTONE Black (spot)
Dialog checkbox, saved as `blackAsSpot`. Moves K (CMYK K, gray, or a `Black` swatch) from PROCESS to a `PBlack` card in SPOT,
counted in TOTAL INKS. The card uses a CMYK fill — nothing is added to the document's swatches. Disabled when the file has no
black (the saved preference is kept). Skipped if a real `PANTONE Black` / `PANTONE Black C|U` spot is already used in the file.

## Licensing / distribution
MIT. No license check, no key, no network, no splash dialog. The old licensing and the first-run splash were removed
in the public-release cleanup.

## Settings
`InkLegend_settings.json` in `Folder.userData + "/InkLegend"` (macOS `~/Library/Application Support/InkLegend/`,
Windows `%APPDATA%\InkLegend\`) — **per machine, not next to the script**.
Fields: `companyName`, `logoPath`, `fontName`, `blackAsSpot`, `technicalNames`, `technicalExact`.

## Testing in Illustrator (verified on Illustrator 2026)
Run a test script from Bash — works even though `app.system()` does not:
`osascript -e 'tell application "Adobe Illustrator" to do javascript (POSIX file "/abs/path/test.jsx")'`
- **Illustrator is the user's live session — use a temp document** (`app.documents.add`) and close it with
  `SaveOptions.DONOTSAVECHANGES`. Never touch documents you did not create.
- **Isolate settings.** The script reads/writes `Folder.userData + "/InkLegend"` — in a *test copy* of the script point it
  elsewhere, or the user's real settings get overwritten.
- **A modal dialog blocks the call**, and `dlg.close(1)` inside `onShow` returns 2 (cancel). In a test copy, skip `dlg.show()`
  and set the control values directly.
- Write results to a log file (`File.write`, `lineFeed = "Unix"`) and read it afterwards — `osascript` can return before the script
  has finished; wait for the last line.
- A spot swatch named `Black` cannot be created as SPOT — use a global process swatch (`colorType = ColorModel.PROCESS`).
- Coordinates are y-up; a new 800×600 doc has `artboardRect` `[0, 600, 800, 0]`. Art outside the artboard of a placed `.ai`/`.pdf`
  is not shown. For a visual check: `doc.exportFile(file, ExportType.PNG24, opts)` and look at the PNG.

## AGENT RULES — follow strictly on every task

1. **Read CLAUDE.md and `docs/STATUS.md` first** before doing anything.
2. **Work in the local repo directory.** At the start of every task, pull latest changes: `git pull origin main`
   (in a git worktree you cannot pull `main`: `git fetch origin && git merge --ff-only origin/main`).
3. **All work is done locally.** Do NOT push intermediate changes — only push when the full task is complete.
4. **For script changes:** edit ONLY `src/InkLegend.jsx`. Do NOT create dist/ or build files.
5. **After editing files, read them back** to verify changes are present.
6. **On task completion, commit and push in one go.**
7. **Update `docs/STATUS.md`** at the end of every session.
8. A task may arrive as a file in `tasks/` (the folder exists only while a task is pending) with full step-by-step instructions —
   read and follow it exactly, then **delete the task file** and push a final commit: `Remove <task_name> (done)`.
9. **No personal or infrastructure data in the repo** — no hosts/IPs/SSH details, private URLs, keys/secrets/tokens,
   e-mail addresses, company/brand names, or local user paths (code, docs, comments, task files). Keep those in private notes.
