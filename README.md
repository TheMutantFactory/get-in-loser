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

## Build instructions

```bash
npm install
npm run server   # dev server with live reload
npm run build    # production build
```

Build tooling follows upstream miniPaint; see [miniPaint Wiki > Build instructions](https://github.com/viliusle/miniPaint/wiki/Build-instructions) for details.

## License

MIT — see [`MIT-LICENSE.txt`](MIT-LICENSE.txt). Original work © ViliusL (miniPaint); derivative modifications © DazzlingDukeOfLazers.
