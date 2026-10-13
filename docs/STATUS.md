# InkLegend — Status

**Level:** Lightweight. Single file: `src/InkLegend.jsx` (ExtendScript, Illustrator). **Version: 1.1.0.**

## Last done (2026-10-13)
- Logo is now embedded (`PlacedItem.embed()`) into the `InkLegend` group after generation —
  no broken link when the file is opened on another machine. Embedded result is vector.
  If embed fails, an alert is shown and the logo stays linked.
- New dialog checkbox **Black as PANTONE Black (spot)** (no coating letter — black does not
  depend on it), remembered in settings as
  `blackAsSpot`. Moves K (CMYK K, gray, or a `Black` swatch) from PROCESS to a `PBlack`
  card in SPOT, counted in TOTAL INKS. Adds nothing to the document's swatches. Disabled when
  the file has no black (saved preference is kept). Skipped if a real `PANTONE Black` /
  `PANTONE Black C|U` spot is already used in the file.
- Repo cleaned for the open-source release: removed the stale `dist/`, `build/`, `tasks/`, `debug/`
  and the legacy technical doc, plus all personal/infrastructure data (server access details,
  company/brand names). Rule 9 in `CLAUDE.md` keeps it that way.
- Git history squashed into a single commit (owner decision): the old history contained the removed
  infrastructure data and an obsolete license scheme. Author is the GitHub noreply address.
- README rewritten for the open-source launch (friendly intro + technical part re-checked against
  the code: Mac Scripts path is `Presets.localized/<locale>/Scripts`, names shorten to `P485 C`,
  detection limits, compatibility note). Mentions the third-party JSX Launcher panel
  (Adobe Exchange). GitHub repo description and topics set.
- Neutral screenshots `img/legend.jpg` and `img/dialog.jpg` added (company "Acme Print", no local
  paths). Cosmetic, optional: the dialog shot uses a custom technical-names list and non-English
  swatch names from a real file, and does not match the legend shot.

## Release state
Repo is **public** since 2026-10-13. Release `v1.1.0` (tag on the root commit) has `InkLegend.jsx`
attached. From here on: normal commits on top (new features only).

## Verified
Run in Illustrator 2026 on a temporary document (settings isolated): checkbox on/off, global
`Black` swatch, file without black, logo embedded as vector above the strip, no swatches added.
The dialog layout (checkbox placement) was seen in the owner's screenshot — fine.

## Not verified
- Embedding a real production logo (only a synthetic vector `.ai` was tested).
- JSX Launcher on current Illustrator versions (third-party, 2019 build; only mentioned in README).
- Windows (paths in README are from the standard layout, untested).

## Known issues / not touched
- Global process swatches (e.g. a global CMYK swatch named "Brand Blue") arrive as SpotColor and are
  listed in SPOT and counted in TOTAL INKS (by code reading; documented in README).
- `[Black]` swatch name is accepted by `isProcessSwatch` but does not set the K flag in
  `collectColors` (only `black` does).
- Font dropdown defaults to the first installed font when no font is saved.
- `.gitignore` still has entries from the licensing era (`InkLegend_license.json`,
  `AGENT_TASK_*.md`, `tasks *.txt`, `node_modules/`) — harmless, left on purpose.
