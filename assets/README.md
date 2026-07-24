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

## Attribution

The hand is **["Loser gesture"](https://thenounproject.com/icon/loser-gesture-4398322/)
by [Dooder](https://thenounproject.com/creator/topg38/) from
[The Noun Project](https://thenounproject.com/)**, used under
**[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)**.

*Modifications:* rotated left 90° and flipped horizontally so it reads as an
**L**, then recolored per theme.

The icon's own name is "Loser gesture." That was not planned.

CC BY 3.0 requires visible attribution to the creator. This repo carries it in
three places:

- this file
- the root `README.md`
- **in the app** — Help → Icon License, or right-click the hand in the logo

The machine-readable copy is [`icon-licenses.json`](icon-licenses.json), fetched
from the Noun Project API (`GET /v2/icon/4398322`). The app imports that file
directly, so the in-app credit cannot drift from the record here.

### Why CC BY rather than the royalty-free license

A NounPro subscription grants a royalty-free license that removes the
attribution requirement, so attributing is not the only option available here.
It is the deliberate one, for two reasons:

1. **This repo redistributes the icon, not just uses it.** `noun-4398322-source.png`
   is committed to a public repository, so anyone can take the icon from here.
   Royalty-free terms generally cover *using* an icon in a product; they are not
   a grant to redistribute it as a standalone asset. CC BY explicitly permits
   redistribution, provided the credit rides along.
2. **It costs nothing.** The attribution is three links and a dialog.

Not legal advice — but for a public MIT repo, the license that permits
redistribution is the sturdier one to stand on.
