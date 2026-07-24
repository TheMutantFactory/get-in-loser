#!/usr/bin/env python3
"""
Regenerate every branded image asset in this repo from the source artwork.

    python3 assets/generate_assets.py        (run from the repo root)

Source of truth
---------------
assets/noun-4398322-source.png  the original downloaded icon (white on transparent)
assets/logo-master.png          that icon rotated left 90 degrees and flipped
                                horizontally, so the finger points up and the
                                thumb points right - i.e. it reads as an "L".
                                Regenerated here from the source each run.

Outputs (all overwritten)
-------------------------
images/logo.png          black hand, used for the "l" in the header logo. Black
                         because the theme applies invert(1) on dark themes.
images/favicon.png       192x192, white hand on a Midnight Violet rounded tile
images/favicon.svg       the same, as vector pixels (crisp at any size)
images/manifest/*.png    PWA icons at 48/72/96/144/168/192
images/preview.jpg       1200x630 social/OG card

Requires Pillow:  pip install Pillow
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
IMAGES = os.path.join(ROOT, 'images')

MIDNIGHT_VIOLET = (40, 28, 51)     # #281c33
ONYX = (15, 11, 20)                # #0f0b14
HOT_PINK = (252, 67, 132)          # #fc4384
LAVENDER = (160, 111, 202)         # #a06fca


def build_master():
    """Original icon -> the L-shaped hand (rotate left 90, then flip horizontal)."""
    src = Image.open(os.path.join(ASSETS, 'noun-4398322-source.png')).convert('RGBA')
    master = src.rotate(90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
    master.save(os.path.join(ASSETS, 'logo-master.png'))
    return master


def pad_square(img, margin_frac):
    w, h = img.size
    side = max(w, h)
    canvas = int(side * (1 + 2 * margin_frac))
    out = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    out.paste(img, ((canvas - w) // 2, (canvas - h) // 2), img)
    return out


def tile(hand, size, hand_frac=0.60, radius_frac=0.22):
    """White hand centred on a rounded Midnight Violet tile."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1],
                                           radius=int(size * radius_frac), fill=255)
    img.paste(Image.new('RGBA', (size, size), MIDNIGHT_VIOLET + (255,)), (0, 0), mask)
    hs = int(size * hand_frac)
    img.alpha_composite(pad_square(hand, 0.0).resize((hs, hs), Image.LANCZOS),
                        ((size - hs) // 2, (size - hs) // 2))
    return img


def write_logo(hand):
    """Black hand - the theme's invert filter turns it white on dark themes."""
    sq = pad_square(hand, 0.06)
    r, g, b, a = sq.split()
    black = Image.merge('RGBA', (r.point(lambda _: 0), g.point(lambda _: 0),
                                 b.point(lambda _: 0), a))
    black.resize((256, 256), Image.LANCZOS).save(os.path.join(IMAGES, 'logo.png'))


def write_favicons(hand):
    #the favicon carries a slightly larger hand than the manifest tiles
    tile(hand, 192, hand_frac=0.62).save(os.path.join(IMAGES, 'favicon.png'))

    # vector version: trace the pixel grid so it stays crisp at any size
    grid_h = 22
    w, h = hand.size
    gw = max(1, round(grid_h * w / h))
    small = hand.resize((gw, grid_h), Image.NEAREST)
    px = small.load()
    size, ox, oy = 32, (32 - gw) / 2, (32 - grid_h) / 2
    rects = []
    for y in range(grid_h):
        x = 0
        while x < gw:
            if px[x, y][3] > 128:
                run = 1
                while x + run < gw and px[x + run, y][3] > 128:
                    run += 1
                rects.append('<rect x="%s" y="%s" width="%s" height="1"/>' % (ox + x, oy + y, run))
                x += run
            else:
                x += 1
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" shape-rendering="crispEdges">\n'
           '  <rect width="%d" height="%d" rx="7" fill="#281c33"/>\n'
           '  <g fill="#ffffff">\n    %s\n  </g>\n</svg>\n'
           % (size, size, size, size, '\n    '.join(rects)))
    with open(os.path.join(IMAGES, 'favicon.svg'), 'w') as fh:
        fh.write(svg)


def write_manifest_icons(hand):
    out_dir = os.path.join(IMAGES, 'manifest')
    os.makedirs(out_dir, exist_ok=True)
    for s in (48, 72, 96, 144, 168, 192):
        tile(hand, s).convert('RGB').save(os.path.join(out_dir, '%dx%d.png' % (s, s)))


def write_preview(hand):
    """1200x630 social card: violet->onyx gradient, hand tile, wordmark."""
    W, H = 1200, 630
    card = Image.new('RGB', (W, H), MIDNIGHT_VIOLET)
    px = card.load()
    for y in range(H):
        t = y / (H - 1)
        row = tuple(int(MIDNIGHT_VIOLET[i] + (ONYX[i] - MIDNIGHT_VIOLET[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = row
    card = card.convert('RGBA')

    th = int(H * 0.46)
    card.alpha_composite(tile(hand, th, hand_frac=0.62), (120, (H - th) // 2))

    draw = ImageDraw.Draw(card)
    try:
        bold = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 132)
        sub = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 44)
    except OSError:
        bold = sub = ImageFont.load_default()
    tx = 120 + th + 70
    draw.text((tx, H // 2 - 120), 'Get in', font=bold, fill=(255, 255, 255))
    draw.text((tx, H // 2 + 20), 'loser', font=bold, fill=HOT_PINK)
    draw.text((tx + 4, H // 2 + 170), 'a personal image editor', font=sub, fill=LAVENDER)
    card.convert('RGB').save(os.path.join(IMAGES, 'preview.jpg'), 'JPEG', quality=90)


def main():
    master = build_master()
    hand = master.crop(master.getbbox())
    write_logo(hand)
    write_favicons(hand)
    write_manifest_icons(hand)
    write_preview(hand)
    print('regenerated: images/logo.png, favicon.png, favicon.svg, manifest/*, preview.jpg')


if __name__ == '__main__':
    main()
