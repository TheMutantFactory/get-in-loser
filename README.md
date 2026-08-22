# get-in-loser

A personal, browser-based image editor. Runs entirely in your browser — nothing is uploaded to any server. This is a personal derivative with opinionated, non-standard workflow changes; it is **not** intended to track or contribute back to upstream.

## Based on miniPaint

get-in-loser is a fork of [**miniPaint**](https://github.com/viliusle/miniPaint) by [ViliusL](https://github.com/viliusle), used under the MIT License. Enormous thanks to the original author and contributors — all of the foundation here is their work. See [`MIT-LICENSE.txt`](MIT-LICENSE.txt) for the full license and attribution.

The pristine upstream import is the first commit in this repository's history, so every change made here diffs cleanly against the original.

## Features (inherited from miniPaint)

**Files**: open images, directories, URLs, data URLs, drag and drop, save (PNG, JPG, BMP, WEBP, animated GIF, TIFF, JSON layer data), print.

**Edit**: undo, cut, copy, paste, selection, paste from the clipboard.

**Image**: information, EXIF, trim, zoom, resize (Hermite resample, default resize), rotate, flip, color corrections (brightness, contrast, hue, saturation, luminance), automatic color adjustment, grid, histogram, negative.

**Layers**: multi-layer system, differences, merging, flattening, transparency support.

**Effects**: black and white, blur (box, gaussian, stack, zoom), bulge/pinch, denoise, desaturation, dither, dot screen, edge, emboss, enrich, gamma, grains, grayscale, heatmap, jpg compression, mosaic, oil, sepia, sharpen, solarize, tilt shift, vignette, vibrance, vintage, blueprint, night vision, pencil, plus instagram-style filters.

**Tools**: pencil, brush, magic wand, eraser, fill, color picker, letter, crop, blur, sharpener, desaturation, clone, borders, sprites, keypoints, color zoom, change color, restore transparency, content fill.

## Changes in this fork

**Pixel edit mode** (`Pixel` menu)

- *New Pixel Canvas* / *Canvas Size in Pixels* — dimensions entered as plain pixels, with no unit or resolution conversion, plus presets for common pixel art sizes (16x24 first).
- *Pixel Mode* — forces nearest-neighbour sampling at every zoom level, so pixel art never gets interpolated.
- *Pixel Grid* — a hairline grid on every image pixel once zoomed past 6x, with a stronger line every 8 pixels.
- *Zoom to Fit*.

**Colour palettes**

- JSON palettes live in [`src/palettes`](src/palettes) and are bundled at build time. See that folder's README for the format — the loader also accepts bare arrays, hex codes without `#`, rgb triplets and per-colour objects.
- A `Palette` block on the right sidebar switches palette and sets the drawing colour with one click.
- `Pixel > Palette` loads a bundled palette, imports a `.json` palette at runtime, or exports the current one.

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

Jest covers the geometry and parsing that the features above depend on: preview sizing and the active zone, palette parsing and nearest-colour matching, pixel grid placement, and pixel canvas sizing.

## Build instructions

```bash
npm install
npm run server   # dev server with live reload
npm run build    # production build
```

Build tooling follows upstream miniPaint; see [miniPaint Wiki > Build instructions](https://github.com/viliusle/miniPaint/wiki/Build-instructions) for details.

## License

MIT — see [`MIT-LICENSE.txt`](MIT-LICENSE.txt). Original work © ViliusL (miniPaint); derivative modifications © DazzlingDukeOfLazers.
