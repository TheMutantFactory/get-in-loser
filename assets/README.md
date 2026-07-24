# assets

Source artwork for the branded images in this repo. Nothing here ships to the
browser — it exists so the files in `images/` can be rebuilt instead of being
mystery binaries.

| File | What it is |
| --- | --- |
| `noun-4398322-source.png` | The original downloaded icon: a pixel-art hand, white on transparent. |
| `logo-master.png` | That icon rotated **left 90°** and **flipped horizontally**, so the finger points up and the thumb points right — it reads as an **L**. Regenerated from the source on every run. |
| `generate_assets.py` | Rebuilds every derived image from the source. |

## Regenerating

```bash
python3 assets/generate_assets.py
```

Run from the repo root; requires Pillow (`pip install Pillow`). It overwrites:

- `images/logo.png` — black hand used as the "l" in the header logo. It is
  **black on purpose**: the themes apply `invert(1)`, which turns it white on
  dark themes and leaves it black on light ones.
- `images/favicon.png` + `images/favicon.svg` — white hand on a Midnight Violet
  rounded tile, so it stays visible on light *and* dark browser tabs.
- `images/manifest/*.png` — PWA icons at 48/72/96/144/168/192.
- `images/preview.jpg` — the 1200×630 social/OG card.

The script reproduces the committed files byte-for-byte, so a clean run should
leave `git status` empty. If it does not, the script and the committed assets
have drifted.

## Attribution / licensing — please confirm

The hand is **icon 4398322 from [The Noun Project](https://thenounproject.com/)**.
Noun Project icons are either **CC BY** (which *requires* visible attribution to
the creator) or **royalty-free** (if bought through a subscription, no
attribution needed). This repo is public and redistributes the icon in several
forms, so the correct choice depends on which licence this download came under.

If it was CC BY, add the creator's name and a link here and in the app's About
dialog. If it was a royalty-free download, no attribution is required and this
section can simply say so.
