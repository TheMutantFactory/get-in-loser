# Changelog

All notable changes to **Get in loser** — a browser paint tool, and also, allegedly, a roguelite. In order of descent: oldest at the top, because the way down only makes sense from the top. Dates are approximate; time is a construct; the fog is real.

---

## v0.1.0 — "First Coat"

The one where it's just a paint app. For now.

- **Painting:** brush, pencil, eraser, fill. They work. You can make an image. Congratulations, you are an artist.
- **Themes:** shipped the Yoncé theme — Midnight Violet fading to Onyx, Vintage Grape panels, and a hot pink we later agreed was "too hot."
- **Fonts:** the entire UI now speaks Atkinson Hyperlegible, because we would very much like you to be able to read the pop-ups. You will see why.
- **The hand:** the "l" in the logo is a finger pointing up. It is pointing *at* something. Do not look directly at it yet.
- Fixed: the gradient background no longer tiles itself into venetian blinds.

*This build contains no roguelite elements. None whatsoever. Why would you even ask.*

---

## v0.1.1 — "Undo Considered Harmful"

- **New:** `Ctrl+Z` now also undoes minor regrets. Personal regrets remain out of scope — see roadmap.
- **Balance:** the Bucket Fill tool no longer floods *adjacent save files.* We know. We are sorry. We have spoken with it.
- **Layers:** you may now stack up to 8 layers before the Layers panel begins to whisper. This is intended. The whispering is a feature. It is called "ambiance."
- **Not a secret:** moving your mouse makes the logo letters bob. The secret is what happens on the 7th bob. (Nothing happens on the 7th bob. Keep bobbing.)

---

## v0.1.2 — "The Fog Rolls In"

- **Tools:** added the Clone Stamp. It clones pixels. It has recently begun cloning *other things.* Inventory management is coming in a future patch.
- **New resource — Ink:** every brushstroke now costs 1 Ink. You begin each canvas with 999 Ink. When it runs out you must *find more Ink.* The Ink is in the Effects menu. The Ink was always in the Effects menu.
- **Encounter:** the Sharpen filter, applied three times in a row, will Sharpen *back.* Bring a friend. Bring the friend as a separate layer.
- **Accessibility:** all bosses now have subtitles.
- Fixed: the default color is black, not "the specific green of a 2009 startup logo."

---

## v0.1.3 — "Descent" (Floors 1–3)

- **Roguelite systems, now officially acknowledged:** the Zoom controls double as your Depth Meter. 100% is the surface. Keep clicking `-`. We'll wait.
- **Loot:** every 50 brushstrokes drops a Modifier. Current pool — *Wet* (colors bleed), *Dry* (colors judge you), *Impasto* (colors gain mass, and eventually, opinions).
- **Meta-progression:** the swatches you never use are being saved. For the run. For *a* run. It's fine.
- **Boss — The Marquee:** defeat the dashed selection that circles your best work and calls it "just a draft." Reward: the Crop tool, and closure.
- **Known issue:** the tutorial for the paint tool is finished. The tutorial for the *other* thing is written on the inside of the fog. We are aware. We put it there.

---

## v0.1.4 — "The Letters Have Learned To Float"

The one where the UI stopped holding still.

- **Legibility (paint tool):** the entire interface is now set in Atkinson Hyperlegible, and every font grew by a few points. This is so you can read the tool labels. It is also, per the Braille Institute, so you can read the *warnings.*
- **Selection color:** softened the tool-selection pink to Petal Pink (`#ce59a7`), after the previous pink was formally reclassified as "too hot to look at directly." Black icons are legible again. We are calling this a truce.
- **De-pinking:** the number fields, the preview zoom buttons, and the layer controls no longer glow. They match the other inputs now. They are calmer. They have accepted their roles.
- **Layers:** rows now grow to fit their names instead of clipping them. The names have more room. They are using it to become longer. We are monitoring the situation.
- **Palette:** the swatch picker now ships pre-loaded with the theme colors, the default color is an honest black, and every tool fills with black by default. The 2009-startup green is gone. Do not ask where.
- **THE LOGO:** the "l" in *loser* is the finger now. The finger hovers on its own, like a ghost, because it is one. Move your mouse and the other letters begin to bob — the wave is *ticked by your cursor,* so the logo only breathes while you are watching it. The finger and "oser" bleed from white into pink. It is still pointing at something. You have been moving your mouse for a while now.
- **Meta:** added this Changelog (Help → Changelog). You are reading the tutorial. This is the tutorial. Hello.

---

## v0.1.5 — "One Click, No Take-Backs"

- **Cosmetic:** the delete "×" on each layer is now Petal Pink, matching the tool-selection color — a red × felt like a threat, and we prefer our threats color-coordinated.
- **Rename (a functional change, we admit it):** the layer rename dialog now opens on a *single* click instead of a double-click. One click. Faster. Also less deniable. The layer will know you named it. It will remember the name you chose. Choose kindly.

---

## v0.1.6 — "Right Of Way"

- **Rename, reconsidered:** a single click on a layer now just *selects* it, like a reasonable tool. We heard you — the dialog was ambushing you every time you tried to switch layers. It has been asked to wait its turn.
- **New — right-click menu:** right-click a layer name for a context menu. It currently offers exactly one option, "Rename," with the quiet confidence of a menu that knows more options are coming and is choosing not to say so yet.

---

## v0.1.7 — "The Menu Reveals Itself"

- **Layer right-click menu:** the context menu that previously offered only "Rename" now admits it has always had more to say. Added *Duplicate*, *Convert to Raster*, *Merge Down* (which appears only when there is, in fact, a layer below to merge into — it will not pretend otherwise), and, past a respectful divider, *Delete*. Each acts on the layer you clicked, whether or not it was the one you were looking at.

---

## v0.1.8 — "Reunited (The Row Holds)"

- **Layers, responsiveness:** the visibility eye and the delete "×" had been wandering onto their own lines whenever a layer name got long or the panel got narrow. They have been returned to the row. The name now yields space — and truncates, politely — instead of evicting its neighbors. One layer, one line.

---

## v0.1.9 — "Legible At Last"

- **Colors panel:** the three toggle icons (picker / channels / swatches) are now white instead of the pressed-state cyan, which had been quietly cosplaying as a UI accent.
- **Error popups:** the lower-right notifications were black text on a muted red — a color combination previously only found in ransom notes. They now match the grape layer panels: white text, rounded corners, and a colored left edge (red for errors; other colors exist for the other outcomes, should you ever be so lucky).

---

## v0.1.10 — "Paste, By Request"

- **Edit → Paste (menu):** now actually pastes. It asks the browser for clipboard-read permission the first time — grant it once and the menu item reads an image straight off your clipboard and drops it in as a layer. Where the browser refuses (Firefox, Safari, insecure contexts, a denied prompt), it steps aside and points you back to the ever-reliable Ctrl+V. Copy was never the problem; *reading* your clipboard is the part browsers guard, and rightly so.

---

## v0.1.11 — "The Folder Remembers"

- **New — Smart folder** (*Settings → "Smart folder"*): toggle it on and pick a folder. Get in loser tells you plainly that it will read from and write to that folder, then keeps a single `get-in-loser.json` there holding your configuration and a session history.
- **Pick a folder you have used before and it knows.** Your settings come back — theme and all — and the folder's history gains another entry. It has been counting. It will tell you how many times you have been here.
- Requires a Chromium browser (Chrome/Edge) for the File System Access API; elsewhere it declines politely rather than pretending. The folder is remembered between sessions and reconnects on load, for as long as the browser still trusts you.

---

## v0.1.12 — "There Is Only One Theme"

- **Smart folder has a home now:** a folder icon sits to the right of the logo. Click it to pick your folder; it glows Petal Pink while connected and tells you which folder it is holding. The Settings toggle still exists, at the bottom of a long list, where you did not find it. Fair.
- **Theme selection, clarified:** choosing any theme other than *yonce* now returns you to the original miniPaint. Immediately. We are not angry. We simply understand that you would be happier there. (Your unsaved work still gets the usual "are you sure" — we are petty, not cruel.)

---

## v0.1.13 — "Faster Than That"

- **Banishment, recalibrated:** the theme redirect only fired when you pressed *OK* — but the theme changes the instant you touch the dropdown, so you were getting a new theme and no consequences. Unacceptable. It now triggers the moment you pick a non-yonce theme. You do get a 1.5-second grace period: switch back to yonce in time and the matter is quietly dropped.

---

## v0.1.14 — "A Theme For Every Kind Of Wrong"

Theme selection is now fully implemented. Each option has been considered carefully.

- **yonce** — correct.
- **classic** — a faithful copy of the original dark theme, in the sense that every single value in it is now `#000000`. Background, text, borders, icons. Black on black. It does not redirect you anywhere; it does not have to.
- **dark** — still returns you to the original miniPaint, where dark is presumably fine.
- **light** — redirects to adobe.com. Enjoy the subscription.
- **green** — no longer a palette, more of a mood. Every application rolls fresh random greens, all crammed into the same narrow band of darkness so that no two elements are ever quite distinguishable. Re-roll by selecting it again. You will not find a good one.

Switching back to yonce inside the grace period still cancels any pending relocation, and leaving *green* restores the real palette.

---

## v0.1.15 — "The Void Is Negotiable"

- **classic now has an exit.** It is still absolute black on absolute black. But as you move the mouse, the colour bleeds back in — the entire palette climbing out of black toward yonce over roughly ten seconds of actual movement, gradient and all. Stop moving and it stops healing. You are not trapped; you are being asked to demonstrate effort.
- **green is greener.** The greys, the whites, and the blues it had quietly inherited are all green now — even the semantic "red" is green. There is no longer anything in that theme which is not green, which somehow makes the contrast worse.
- **light** now carries a UTM to adobe.com so the referral is properly attributed. No spaces in it — `get-in-loser`. We are unserious, not unprofessional.

---

## v0.1.16 — "Dark Mode, Taken Literally"

- **classic and dark have traded fates.** *classic* now returns you to the original miniPaint, which is what you were asking for by choosing it. *dark* is the void.
- **dark is now genuinely, completely dark.** Previously the tool icons, the layer visibility eye, the finger in the logo and — most embarrassingly — the canvas itself all carried on glowing while everything else went black. They are black now too. Dark mode should not have exceptions.
- **The whole void fades back together.** Icons and the canvas ride the recovery with everything else, so ten seconds of mouse movement returns the entire interface rather than most of it.
- **Selecting dark now commits itself** and closes the dialog. You cannot click "Ok" on a dialog you cannot see; asking you to was rude.
- **green finally reaches the canvas.** The canvas, the tool icons, the logo hand and the checkboxes are all green now. Every part of that theme is green. That was the promise.

---

## v0.1.17 — "No, All Of It"

- **dark mode holds out no longer.** The colour picker had been quietly glowing this whole time — the saturation square, the hue strip, the alpha checkerboard, the swatch grid, the native colour and range inputs, the effect previews, and the gradient tool's icon, which upstream had specifically excused from tinting. All black now.
- **Even the hairline.** Every button carried a hardcoded white inset highlight. It is a variable now, and in dark it is nothing.
- All of it still fades back together on mouse movement. The void is complete, and it is still negotiable.

---

## v0.1.18 — "The Sliders Were Hiding"

- **The colour sliders have joined us.** Their handles are little CSS triangles built out of hardcoded white borders, and the colour channel section is collapsed by default — so they were both invisible to the sweep and stubbornly bright once you opened it. The slider and picker components are now tinted whole, handles and all.
- Nested pieces are explicitly exempted from tinting twice, because two filters multiply, and a slider that fades at the square of everything else looks haunted in a way we did not intend.

---

## v0.1.19 — "The Hand Has A Name"

- **We looked up the icon.** The hand in the logo — the one that has been pointing this whole time — is a real icon by a real person, and we had never actually read its record. Its name is **"Loser gesture."** We did not name it that. It was called that before we found it. We named the project *afterward.* We have decided not to think about this further.
- **New — Help → Icon License**, or *right-click the hand itself.* The credit is now in the app: creator, license, the page it came from, and exactly which files it became. It reads from a data file fetched straight from the source, so the credit in the app and the credit in the repo cannot drift apart. One of them lying to you would be thematically appropriate but practically unacceptable.
- **Attribution, properly.** It is used under CC BY 3.0, which asks that we say who made it. We say so in three places now. It is the least we can do for something that has been silently gesturing at you since v0.1.0.
- **Under the hood:** the layer right-click menu and the new logo right-click menu are now the same menu, wearing different options.

*Naming a thing gives it power. We are aware of the risk. We accepted it.*

---

## Unreleased — "???"

- (redacted)
- (redacted)
- the frog is not fractions
- the frog is not fractions
- please stop resizing the canvas — it can tell
