# get in loser

A personal, browser-based image editor. Runs entirely in your browser — nothing is uploaded to any server. This is a personal derivative with opinionated, non-standard workflow changes; it is **not** intended to track or contribute back to upstream.

## Based on miniPaint

get-in-loser is a fork of [**miniPaint**](https://github.com/viliusle/miniPaint) by [ViliusL](https://github.com/viliusle), used under the MIT License. Enormous thanks to the original author and contributors — all of the foundation here is their work. See [`MIT-LICENSE.txt`](MIT-LICENSE.txt) for the full license and attribution.

The pristine upstream import is the first commit in this repository's history, so every change made here diffs cleanly against the original.

## What's different from upstream

### The "yonce" theme

The default theme is **yonce** — Beyoncé-inspired, built as two-tier CSS design tokens in [`src/css/reset.css`](src/css/reset.css): a named palette (`--yc-*`) that the semantic roles reference, so no role assignment carries a raw hex.

| Token | Value | Used for |
| --- | --- | --- |
| Midnight Violet | `#281c33` | background (top of gradient) |
| Onyx | `#0f0b14` | background (bottom of gradient) |
| Vintage Grape | `#503865` | panels |
| Lavender Purple | `#a06fca` | borders, accents |
| Petal Pink | `#ce59a7` | selection / active state |
| Hot Pink | `#fc4384` | hovers, scrollbar |
| Cyan | `#37e5e7` | links, active button text |

The background is a Midnight Violet → Onyx gradient, tilted a random **<10°** on every page load — non-interactive, non-deterministic.

### The other themes are traps

Theme selection is fully implemented, in the sense that every option other than yonce is a consequence:

- **classic** — returns you to the original miniPaint.
- **dark** — the darkest possible reading of "dark mode". Every value is `#000000`, including the canvas and every icon. **Moving the mouse fades it back** to yonce over ~10 seconds of actual movement; stand still and it stays dark. Selecting it auto-commits, since you cannot click "Ok" on a dialog you cannot see.
- **light** — redirects to adobe.com.
- **green** — randomized greens, re-rolled on every application, all crammed into one narrow band of lightness so nothing is quite readable.

Switching back to yonce within a 1.5s grace period cancels any pending redirect.

### The logo

The "l" in *loser* is the hand icon — finger up, thumb right, so it reads as an **L**. Each letter has its own low-frequency oscillator and bobs independently, **ticked by mouse movement** rather than by time: the wordmark animates while you move and rests when you stop. The hand hovers on its own like a ghost. The hand and "oser" carry a vertical white → Petal Pink gradient.

### Smart folder

**Settings → Smart folder**, or the folder icon beside the logo. Pick a folder and get-in-loser reads from and writes to it, keeping a single `get-in-loser.json` there with your configuration and a session history. Pick a folder you have used before and it restores those settings and appends a session. The directory handle is remembered between sessions and reconnects on load while permission holds.

Uses the File System Access API, so **Chromium only** (Chrome/Edge); elsewhere it declines rather than half-working.

### Other changes

- **Typography** — the UI is set in [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/), self-hosted in [`fonts/`](fonts) (no third-party requests), and it is also the default font for the text tool.
- **Layers** — rows size to their text instead of clipping; right-click a layer for a context menu (Rename, Duplicate, Convert to Raster, Merge Down, Delete).
- **Colors** — the swatch picker ships preloaded with the theme palette, and the default color is black.
- **Edit → Paste** — reads the clipboard via the async Clipboard API where the browser allows it (after a one-time permission grant), falling back to the Ctrl+V paste-event path.
- **Help → Changelog** — an in-app markdown viewer for [`CHANGELOG.md`](CHANGELOG.md), which is written as patch notes for a paint tool that is also, allegedly, a roguelite.
- **Help → Icon License** — the credit for the logo artwork, also reachable by right-clicking the hand in the logo. It reads from [`assets/icon-licenses.json`](assets/icon-licenses.json), so the in-app credit can't drift from the repo's record.

## Changes in this fork

**Pixel edit mode** (`Pixel` menu)

- *New Pixel Canvas* / *Canvas Size in Pixels* — dimensions entered as plain pixels, with no unit or resolution conversion, plus presets for common pixel art sizes (16x24 first).
- *Pixel Mode* — forces nearest-neighbour sampling at every zoom level, so pixel art never gets interpolated.
- *Pixel Grid* — a hairline grid on every image pixel once zoomed past 6x, with a stronger line every 8 pixels.
- *Zoom to Fit*.

**Voxel mode** (`Voxel` menu)

- A 16w x 16d x 24h volume edited one flat slice at a time. The slice is an ordinary raster layer, so every tool, the palette and pixel mode work on it unchanged.
- **The volume is the model; the canvas is a view of one slice.** Rotating changes which way the volume is *cut* - top, front or side - and never touches the data, so it is instant and lossless. Paint on the front, and it is there when you look from the top.
- A second view on the sidebar draws the model in isometric with the current slice picked out, because a flat canvas cannot show you where in the model you are painting. It orbits in quarter turns.
- **Onion skinning** shows the neighbouring slices faintly behind the live one - warm below, cool above, fading with distance - so lining a shape up with what it sits on is something you can see rather than remember.
- **Exports and imports MagicaVoxel `.vox`** — the format Godot, Unity, Blender and three.js importers read. Two things it is easy to get wrong and which are tested here: MagicaVoxel is **Z-up** where this is Y-up, and its colour indices are **1-based into a 0-based palette table**. Past 255 colours the extras fold onto the nearest rather than the export failing.
- Slices also import and export as a single PNG strip, inspectable in any editor, and the model rides along in quicksave (`F9`/`F10`) so it survives a reload. On load the canvas is rebuilt *from the volume* rather than from the saved layer, since in voxel mode the canvas is only ever a view of a slice.
- Slice changes are navigation, not edits, so they do not fill the undo history. The trade is that undo does not step back across a slice change; it applies to the slice you are on.

**Colour palettes**

- JSON palettes live in [`src/palettes`](src/palettes) and are bundled at build time. See that folder's README for the format — the loader also accepts bare arrays, hex codes without `#`, rgb triplets and per-colour objects.
- A `Palette` block on the right sidebar switches palette and sets the drawing colour with one click.
- `Pixel > Palette` loads a bundled palette, imports a `.json` palette at runtime, or exports the current one.

**Feedback** (`Help > Send Feedback`)

- Replaces the old link out to GitHub issues. A report is filed without leaving the app and carries the build, the platform and the selected tool, which a reporter would otherwise have had to assemble by hand — and no longer needs a GitHub account.
- Posts to [feedback-service](https://github.com/TheMutantFactory/feedback-service) as envelope v1. The contract lives in that repo; this side is [`feedback-envelope.js`](src/js/libs/feedback-envelope.js).
- **The client is an outbox.** Nothing leaves local storage until the server acknowledges it: offline or a 5xx holds the report and retries next session, a 429 holds it and everything behind it, and a 4xx sets it aside rather than dropping it — so "it ate my feedback" is answerable. See [`feedback-outbox.js`](src/js/libs/feedback-outbox.js).
- **The screenshot is opt-in and off by default.** In a paint app the canvas is the reporter's own artwork, and may be someone else's if they opened it, so the dialog states exactly what is sent and the picture is only taken when the box is ticked. If the capture fails the note still goes and `shot_attached` says no, rather than promising an image that does not exist.

**Navigation**

- Hold the **middle mouse button (scroll wheel) and drag** anywhere over the drawing area to pan the image. Tools only respond to the left button, so painting is unaffected. Panning is bounded the same way the preview's drag-to-pan is — the image cannot be dragged off screen.

**Right sidebar panels**

- Every block has pin, move up, move down and drag controls in its header.
- Pinned blocks stick to the top of the sidebar while it scrolls, and stack rather than overlap when several are pinned.
- Panel order and pinned state are remembered between sessions.

**Fixes**

- The preview window kept a fixed 176x100 canvas whatever the image was, so anything that was not 16:9-ish came out stretched — a 16x24 sprite most of all. It now fits the image aspect ratio inside a 176x176 box and scales both axes equally.
- `zoomView.constrain()` can raise the zoom scale on its own, but the render loop applied zoom changes as a delta against the last *requested* zoom. The two disagreed, so the scale was applied twice and the canvas transform ended up at `ZOOM²`. At the zoom levels pixel art needs, that put every brush stroke in the wrong place and made a single pencil dot cover the whole canvas.
- The Information block only refreshed its size readout on mouse move, so it showed stale dimensions after a canvas resize.

## Tests

```bash
npm test
```

Jest covers the geometry and parsing that the features above depend on: preview sizing and the active zone, palette parsing and nearest-colour matching, pixel grid placement, pixel canvas sizing, middle-drag panning, the feedback envelope and outbox, and the voxel volume, its isometric projection and onion skinning.

## Build instructions

```bash
npm install
npm run server   # dev server with live reload
npm run build    # production build
```

Build tooling follows upstream miniPaint; see [miniPaint Wiki > Build instructions](https://github.com/viliusle/miniPaint/wiki/Build-instructions) for details.

## Regenerating image assets

The logo, favicons, PWA icons and social card are all derived from source artwork in [`assets/`](assets):

```bash
python3 assets/generate_assets.py
```

See [`assets/README.md`](assets/README.md) for provenance and an outstanding icon-licensing question.

## License

MIT — see [`MIT-LICENSE.txt`](MIT-LICENSE.txt). Original work © ViliusL (miniPaint); derivative modifications © DazzlingDukeOfLazers.

Atkinson Hyperlegible is bundled under its own license, included at [`fonts/atkinson-hyperlegible-LICENSE.txt`](fonts/atkinson-hyperlegible-LICENSE.txt).

### Icon attribution

The hand in the logo is ["Loser gesture"](https://thenounproject.com/icon/loser-gesture-4398322/) by [Dooder](https://thenounproject.com/creator/topg38/) from [The Noun Project](https://thenounproject.com/), used under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) and modified (rotated left 90°, flipped horizontally, recolored per theme). The icon's actual name is "Loser gesture"; this was discovered after naming the project.

Also shown in-app under **Help → Icon License**. Details and the reasoning behind attributing under CC BY are in [`assets/README.md`](assets/README.md).
