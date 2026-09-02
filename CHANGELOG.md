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

## v0.1.20 — "The Palette Talks Back"

The one where the colors stop being a read-only fact about your image and start being negotiable.

- **Image → Color Palette is no longer a museum.** The dialog used to show you your image's palette behind glass: here are your nine colors, look, don't touch. The glass is gone. Every swatch is now a real color input. Click one. Change it. The image *changes with it.* The dominant color stays behind glass, as a reminder of how things used to be.
- **Two ways to negotiate:**
  - **Shift — preserve shading:** every pixel follows its palette color by the same distance you moved it. Gradients survive. Anti-aliasing survives. Your image keeps its soul and changes its wardrobe.
  - **Replace — exact colors:** every pixel snaps to its palette color, exactly, no survivors. It is Decrease Color Depth with *your* hand on the palette. The image comes back flatter, harder, and extremely certain of itself.
- **Live preview, before and after,** so you can watch the negotiation happen. `Ctrl+Z` remains the mediator of record.
- **SURFACE BREACH:** the editor is now live at **mutantfactory.net/get-in-loser**. Yes — after nineteen versions of descending, we went *up.* The Depth Meter reads 100%. The surface was up here the whole time. The fog thins at altitude but it does not lift; bring your own Ink.

*The palette has always known what colors it wanted to be. Now it has a form to fill out.*

---

## v0.1.21 — "The Changelog Could Not Read Itself"

- **Fixed:** every section heading in this very changelog was being teleported into the dialog's title bar, stacked in one spot, where only the topmost survived — so the dialog introduced itself as *Unreleased — "???"* and the history below scrolled by headless. A dialog that misreports its own history. In *this* app. We checked the CSS and, regrettably, it was CSS. The title bar's layout rule applied to every heading inside the dialog, not just the title. It has been scoped. The changelog can read itself again. We recommend it start from the top.

---

## v0.1.22 — "Whole Numbers Only"

The one where the app learns that a pixel is a pixel.

- **New — Pixel mode** (`Pixel` menu). *New Pixel Canvas* and *Canvas Size in Pixels* take plain pixels, with no units and no resolution quietly multiplying them by 72 behind your back. Presets led by 16×24, because that is what we are actually drawing. Nearest-neighbour sampling at every zoom level, and a hairline grid on every image pixel once you are past 6× — stronger every 8, so you can count.
- **New — Palettes are files now.** JSON in `src/palettes`, a **Palette** panel on the sidebar, one click to take a colour. Sweetie 16 by default, with PICO-8, Endesga 32, Game Boy and a greyscale ramp alongside. Import your own; export what you have. The loader is deliberately forgiving — bare arrays, hex without the `#`, rgb triplets, per-colour objects. It would rather understand you than be right.
- **The right-hand panels can be arranged.** Pin, move up, move down and drag, on every block. A pinned block sticks to the top of the sidebar while the rest scrolls past it, and when several are pinned they stack instead of quietly covering each other. Your order and your pins are remembered.
- **The Preview had been lying about the shape of your image.** It drew into a fixed 176×100 canvas no matter what it was previewing, so a 16×24 sprite came back 2.6 times wider than tall, with total confidence. It fits the real aspect ratio now. We wrote tests for it. The tests are about a rectangle. This is where we are.
- **Fixed — a single pencil dot was consuming the entire canvas.** Not a metaphor. At the zoom levels pixel art actually needs, the canvas transform was being applied *twice* — the zoom, squared — because the render loop measured each change against the zoom it last *asked for* rather than the one in force, and the two had quietly stopped agreeing. One dot, laid down at 34×, arrived at 1167× and covered everything. It had been that way since upstream. Every stroke lands where you put it now.
- **Fixed — paste, on a local network address.** Pasting worked on the live site and on `localhost` and nowhere else, because both of those are secure contexts and the fallback path for everything else reached for `this` inside a callback that did not have one. Anyone testing from their phone on the same wifi got nothing.

---

## v0.1.23 — "Report Received"

The one where the app grew a way to be told it was wrong, and was told within the hour.

- **New — Help → Send Feedback.** The old *Report Issues* link sent you to GitHub, which asks you to leave the app, hold an account, and reassemble by hand the build and the state that make a report worth reading. This files it from inside, and carries that for you: version, platform, the tool you had selected. No account, no email.
- **It is an outbox, not a form.** Nothing leaves local storage until the server says it has it. Offline holds the report for next session; a rate limit holds it *and everything queued behind it*; a genuine rejection sets it aside rather than dropping it, so "it ate my feedback" is a question with an answer.
- **The screenshot is opt-in and off by default,** and the dialog says so before you send rather than after. This is a paint app: the canvas is your artwork, and possibly someone else's. If the capture fails, the note still goes and the report says *no picture* rather than promising one nobody can produce.
- **New — hold the scroll wheel and drag to pan.** The tools only ever answered to the left button, so the middle one was free. You cannot drag the image off the screen.
- **THE FIRST REPORT WAS ABOUT THE BRUSH.** *"Pencil tool is correctly drawing pixels. Brush tool is incorrectly drawing sub-pixels. Eraser tool doesn't seem to erase pixels."* With a screenshot of the word PENCIL snapped hard to the grid beside a smooth, feathered *Brush*, which diagnosed the whole thing without anyone having to reproduce anything. It was right. Pixel mode had only ever changed how the canvas was *sampled*; no painting tool had ever consulted it. The pencil looked correct by accident, having always plotted whole pixels. The brush and eraser are vector tools with round caps, so one laid down feathered coverage and the other subtracted *part* of each pixel's alpha, which reads exactly like not erasing. Both plot whole pixels now.
- **"Please convert it to raster to apply this tool" no longer exists anywhere in the application.** It was reachable in three clicks from a blank canvas — draw a stroke, pick the eraser, click — and it named the fix and then declined to apply it. Fifty modules and nine tools now just do the conversion, as its own undo step, and say so. The Effects menu, the Image menu, the whole toolbar.
- **Selection got the opposite treatment,** and it is the more interesting half. Six places refused a non-raster layer, two of them *silently*. But a selection is a region of the canvas, not of a layer's pixels — drawing a marquee reads nothing and writes nothing, and `Ctrl+A` is a reflex nobody expects to cost them a vector stroke. Five of those refusals were deleted rather than converted. Only *Delete*, which genuinely clears pixels, converts — at the moment the pixels are needed.

*The feature that lets you tell us it is broken has been used to tell us it is broken. Working as intended.*

---

## v0.1.24 — "Depth, Actual"

Nineteen versions ago the Zoom control was appointed Depth Meter, and it has been bluffing ever since. There is a real third axis now.

- **New — Voxel mode** (`Voxel` menu). 16 wide, 16 deep, 24 high, edited one flat slice at a time. The slice is an ordinary raster layer, so every tool, the palette and pixel mode work on it with no special cases whatsoever.
- **The volume is the model; the canvas is a view of one slice.** Not twenty-four stacked layers. This is the decision the rest follows from, and it is why the next bullet is free.
- **Rotating changes which way the loaf is cut, never the loaf.** Slice from the Top, the Front or the Side; the data never moves, so it is instant and lossless and you can do it all day. Paint on the front face and it is there when you look down from the top — not an aspiration, a test.
- **A second view,** because a flat canvas cannot tell you where in the model you are standing. The sidebar draws the whole thing in isometric with the current slice picked out in cyan, and orbits a quarter turn at a time. Quarter turns only: at multiples of 90 the projection stays exact and *which slice is that* stays answerable at a glance.
- **Onion skinning.** The neighbouring slices, faint, behind the live one — warm below, cool above, fading with distance. Lining a shape up with what it sits on used to be a memory exercise.
- **Exports MagicaVoxel `.vox`,** which Godot, Unity, Blender and three.js all read, and imports it back. Slices also still come out as a plain PNG strip. Two things that format makes very easy to get wrong are handled: it measures height on a different axis than we do, and its colour indices are off by one against its own palette table. Either mistake ships looking like a modelling error rather than a format one.
- **The model rides along in quicksave,** which brings us to the last item.
- **Quicksave had never worked in this fork. Not once.** Draw, `F9`, reload, `F10`, nothing — no error, no console, no toast. When this project reset its version number to `0.1.x`, the saved file kept writing that number into the field the *loader* consults to decide which historical migrations a file needs. `0.1.22` sorts below every one of them, so every file we ever saved was read as ancient and dragged through the full course of repairs, one of which forces every layer to be an image. A brush layer arrived claiming to be an image while still holding an array of stroke points, and the load threw. The thrown error was caught and returned as a status nobody printed. So it failed in perfect silence, for every file, for twenty-three versions. The file now records what it *is* separately from what wrote it, files you have already saved are rescued on the way in, and a discarded action says so out loud.

*An application that could not read its own saved history, three versions after a changelog that could not read its own headings. We are choosing to see a theme rather than a pattern.*

---

## v0.1.26 — "Soft Edges, Hard Boundaries"

Two tools about the same question — where does the thing stop — answered in opposite directions. One blurs the boundary on purpose. The other insists on finding it exactly.

- **New — Effects → Feather Edges.** Softens where a layer stops. Radius in actual pixels, and an option to fade inward only, for when the shape must not grow.
- **It refuses to be a blur, twice over.** The obvious implementation blurs the alpha channel, and a transparent pixel still stores a colour, which is nearly always black — so a white cutout comes back wearing a grey rim. The colours are therefore blurred *weighted by their own alpha*, so pixels with nothing to show contribute nothing. The second refusal was found by looking at the preview: a red square with a blue panel inside it had its red-to-blue boundary smudged, nowhere near an edge. Feathering is an operation on coverage and must not touch the picture. The softened colour is now mixed in by how transparent the pixel already was, so an opaque pixel keeps its colour exactly and only the fringe borrows.
- **And the radius means pixels.** It said 3 and reached 9 — three blur passes each going the full distance — which quietly dimmed the middle of anything smaller than about fifty pixels. A 16px square feathered by "3" came back with its centre at 248 out of 255. It is 255 now.
- **New — Tools → Remove Background.** Clears the region that reaches the edge of the image, in one go, with a tolerance for backgrounds that are not quite one colour and a *soften edge* setting for anti-aliased outlines.
- **The background is what touches the outside, not what happens to be that colour.** *Color to Alpha* removes a colour everywhere, so the sky goes and so do the highlights in the eyes. The *Magic Eraser* asks for a click per region, so a head with sky either side of it costs three. This floods inward from every border pixel at once — which means a background-coloured gap *enclosed* by the subject, the hole in a handle, the sky an arm closes off, stays. There is a test that holds it to that, and it is the only reason this is not fifteen lines.
- Border colour is picked by the *mode* rather than the mean, because averaging a horizon of sky and grass gives a colour that is neither and matches nothing.

*Thirty-four new tests. Two of them were wrong first and said so.*

---

## v0.1.27 — "What Touches The Outside"

Background removal shipped one version ago and was wrong in three separate ways, two of which you could see without measuring anything. Reported as *"it seems to remove the foreground"* and *"it's really choppy."* Both true.

- **It could remove the foreground, exactly and literally.** It took the single commonest border colour to be the background. On a tight crop the SUBJECT is most of the border — a portrait runs off the bottom and both sides — so it deleted the person and kept the wall. Measured on that case: 100% of the subject cleared, 100% of the background surviving. The border is now clustered rather than polled, and a cluster the middle of the picture is mostly *made of* is disqualified from being background at all.
- **It leaked.** An anti-aliased edge is a smooth ramp from background to subject, so a threshold flood walks down it and out into the foreground. There was no safe tolerance, only a lucky one: 30 was correct, 60 destroyed 89.5% of the subject. Two fixes, because there turned out to be two mechanisms. Each step of the flood must now be small as well as its destination plausible, which stops the walk across an edge — and separately, the tolerance itself is tried and then **backed off while it is still taking the subject with it**, because when the subject runs off the frame the flood is *seeded* on it and never crosses an edge at all. No step is taken, so no step limit can help. The same scene now loses 0.3% of the subject at tolerance 12, 30 **and 120**.
- **When your setting gets overruled, it says so,** rather than quietly doing something else with the number you typed.
- **It is not choppy, because the mask is no longer binary.** A pixel on the boundary of a strand of hair is genuinely 40% hair and a yes/no test cannot say so. There is now a band around the boundary where real fractional coverage is solved for — nearest confident foreground colour, nearest confident background colour, and where the pixel sits on the line between them is its alpha. Same scene: 17 soft pixels before, 751 after.
- **And the edge no longer carries a rim of what it used to sit on.** A half-covered red pixel on blue is *literally purple*; keeping it is what makes a cutout look pasted. The background is now divided back out of it.
- **A two-tone backdrop goes in one pass.** Sky over grass used to average to a colour that was neither and matched nothing.

*Three defects, one root cause: it was a colour-matching tool wearing a flood fill's coat. Background is what touches the outside.*

---

## v0.1.28 — "Point At It"

The automatic background remover has a ceiling, and it is not a matter of trying harder: when the subject is closer to the background than the background is to itself, there is no threshold to place. Measured on a test scene, a pale shirt sat 18.5 from the wall beside it while the wall's own top-to-bottom spread was 23.3. Every automatic setting lost most of the subject. So: a tool you point with.

- **New — the Background Eraser** (toolbar, between the Magic Eraser and Fill). Click the background. Shift-click anything it took that it should not have. That is the whole interface.
- **On the scene that defeats every automatic setting: 0.1% of the subject lost.** Same picture, three clicks.
- **The slider is a SENSITIVITY, not a colour distance,** and that is the substantive difference. Once you have pointed at the background, the question stops being "what colour is it" and becomes "how far does that region go" - the answer being "until the colour changes abruptly". A hard edge between two *similar* colours is invisible to a colour threshold and obvious to a step test: on that scene the step across the shirt's edge was 9.93, while the steps along the wall's own gradient were 0.00.
- **Shift-click claims a region, not a dot.** The first attempt blocked only the few pixels under the cursor, so the flood poured in around it and the correction corrected nothing you could see.
- **And once you have marked the subject, the slider stops mattering at all.** Two kinds of mark compete for every pixel, and the cost of reaching one is the largest single colour step on the easiest route to it - so the boundary settles onto the strongest ridge between them without anyone naming a number. Marking the subject also changes the rule from "take this region" to "keep what I marked, take the rest", so a piece of the subject touching nothing marked goes until it is marked too.
- **The costs are measured in sixteenths, and the sixteenths are the difference between working and not.** Rounding them to whole units looked harmless: on the pale shirt the ridge was 0.88 and the wall's own gradient was 0.47, both of which round to nothing. The ridge stopped existing and the subject swallowed the picture. Low-contrast images are the ones this tool is *for*.

*The automatic one still runs first and still guesses. This one does not guess.*

---

## v0.1.29 — "Minus Fifteen Pixels Wide"

Clicking **Fit** took you to 1%, and then nothing you drew landed where you clicked. One cause, a long way from either symptom.

- **A fresh document was coming up −15 × −10 pixels.** Startup picks the largest standard size that fits the window and falls back to "the window, less a small margin" when the window is smaller than all of them. That measurement ran before the layout existed, so the wrapper reported **zero** — and zero minus fifteen is minus fifteen. Nothing complained, because nothing checked.
- **Fit divides the window by the document,** so a negative document gave a negative zoom, which the clamp dutifully floored to the minimum. Hence 1%.
- **And every click on the canvas is mapped back through that zoom,** so once Fit had been pressed, the brush painted thousands of pixels off-canvas — which looks exactly like a brush that has stopped working. Three separate "the tool is broken" symptoms, one arithmetic error at startup.
- Sizes are now chosen in one place that will not return a number you cannot draw on, with tests. Fit also declines rather than applying a fit it cannot compute, and says so in the console — the next bad size should be a control that refuses, not a zoom that lies.

*Found while testing something else, which is the only reason it was found: it does not announce itself, it just makes every other tool look faulty.*

---

## v0.1.30 — "Which One Am I Running"

- **The version now sits at the end of the menu bar,** to the right of Help. Selectable, so it can be read off and pasted into a bug report.
- **And it is now the version you are actually running,** which it previously was not. The number came from a build-time constant that reads `package.json` exactly once, when the dev server starts — so after a version bump, every rebuild kept reporting the old number. The build was fresh; the label was three releases stale, which made a working fix look as though it had not loaded at all and cost most of a session.
- **That same stale number was going into saved files and into every feedback report,** so a report could name a version that was never the one running. All three now read from one place that is re-read on every build.

---

## v0.1.31 — "Drag, Don't Poke"

The Background Eraser was click-only, and a click is a thin description of a background. One small disc, one tone, from one spot — while a wall has a gradient, a floor has texture and a sky goes from pale to deep. You can drag now.

- **Drag to mark the background, shift-drag to mark the subject.** A stroke hands over hundreds of pixels spanning the range the background actually covers, instead of asking one sample to stand for all of it. Single clicks still work; they are just strokes of length one.
- **The marks are drawn on the canvas as you make them** — red for what goes, green for what stays. The two things the tool does, and the only two it does.
- **The competition between marks now accumulates cost instead of taking the worst step.** This is the substantive change. Scoring a route by its single largest colour step is elegant and collapses on any grainy photograph: grain means there is a path of small steps from anywhere to anywhere, so both marks reach every pixel at about the same price and the winner comes down to rounding. On a wall with mild noise, adding one subject mark brought the **entire background back**. Summing makes distance count, so a mark near a pixel beats a mark far from it unless there is a real boundary between them — which is both what a scribble is supposed to mean and what survives noise.
- **And each side now knows what it looks like.** Edges and distance alone left a halo of speckle: background right beside the subject is nearer to the subject's mark than to any mark out at the frame's edge, so it defected — despite plainly looking like wall. Each side builds a colour model from its own marks, and claiming a pixel costs extra in proportion to how much better it matches *the other side*. Relative, not absolute: a pixel that resembles both equally is free to either, which is what stops an unmarked face from being charged full price and lost.
- Fixed: two strokes were drawn as one path, so a mark down the left edge and another across the top came back with a diagonal line ruled between them, straight across the subject.
- Fixed: a second gesture arriving while the first was still converting a layer to raster ran alongside it, both reading and writing the same marks.

*Still true, and still the rule: once you mark the subject, anything you did not mark goes with the background. A head not quite touching the shoulders needs its own stroke.*

---

## v0.1.32 — "The Mirror Stage"

One fix, reported from the field within hours of the deploy going live: *"voxel export seems to reverse sides. Like a half rotated quaternion or something."* Correct on both counts — and the second half of the sentence is the diagnosis.

- **Exported `.vox` files were mirror images of the model.** Our frame and MagicaVoxel's are both right-handed, and the exporter mapped one onto the other with a bare axis swap — determinant −1, which is a reflection. A model that has been reflected genuinely does look *"like a half rotated quaternion"*: resembles a 180° turn, except every detail is backwards. The depth axis now flips as it swaps, the determinant is +1, and right is right, up is up, front is front.
- **No test could have caught it, and that is the interesting part.** Every round-trip test passed throughout, because the importer inverted the same wrong map — encode and decode were mirrored in exactly compensating ways. A file format is a promise to programs you will never meet, and the only tests that can hold such a promise are ones that assert against the *other side's* convention, not your own inverse. There is now a test that computes the chirality determinant of the actual bytes.
- **The comment lied, and the code believed it.** `voxel.js` declared z runs "front to back" with z = 0 the front; the geometry of the Front view (x rightward, y upward — which puts its viewer on the +z side) says the front face is z = d−1. The exporter was written against the comment.
- One consequence worth knowing: a `.vox` exported by v0.1.24 through v0.1.31 was mirrored, so re-importing one now imports it mirrored. Orbit it 180° and re-export, or flip it in MagicaVoxel — the new file will be right from then on.

*Lacan says the mirror stage is when the subject first mistakes an image for itself. Took us eight versions.*

---

## v0.1.33 — "Other Way Round"

- **New — Voxel → Flip Horizontal / Flip Vertical.** Mirrors the model as seen on the face you are editing — so which model axis reverses depends on the view, and the table that decides lives next to the slice mapping it has to agree with, with a test that stops them drifting apart. Intuition about these axes is what shipped last release's mirrored exporter; nothing here is left to intuition.
- **The whole volume flips, not the one slice.** Mirroring a single slice of a model is almost never what anyone means, and would quietly shear the model across its depth.
- **Flipping is its own undo.** Lossless and self-inverse, so like rotation it lives outside the layer undo system — flip again and you are back.
- And it is the one-step repair for a `.vox` exported by v0.1.24–v0.1.31: import it, flip horizontal, re-export.

---

## v0.1.34 — "Small Knives"

Four fixes, three of them straight off the feedback queue.

- **Pencil right-click erases, in pixel and voxel mode** (report de4750dc). The pixel-art convention everywhere else, now here: right-drag clears whole pixels at the pencil's size, as its own undo step, and the browser's context menu stays out of the way — but only over the canvas, in pixel mode, with the pencil in hand. Everywhere else the right button still belongs to the browser.
- **The eraser arrives in pixel mode at size 1** (report 987f66d1). Its default is 30 — on a 16-wide voxel slice that is less an eraser than a demolition. It gets its old size back when pixel mode ends, unless you changed it yourself in between.
- **The brush's size circle no longer haunts the next tool** (report 5d36c467). It was only ever updated by the tool that owned it, so switching to the pencil left it sitting on the canvas at its last position. The tool switch itself now clears it — nobody else owns that moment.
- **Rasterizing a thin stroke no longer moves it.** Found while testing the first fix: convert a one-pixel-tall pencil line to raster — which the eraser does automatically — and the line jumped by its own bounding-box offset. The trim that positions a converted layer skips very skinny content but kept the offsets the skipped trim would have justified. Draw a line, reach for the eraser, watch the line move: pre-existing, upstream, and invisible until a test aimed at exact coordinates.

---

## v0.1.35 — "Every Which Way"

The rest of field report b92e7706, which asked for three things and got all three.

- **New — Voxel → Face Symmetry.** While it is on, painting a wall paints all four walls: commit a wall slice and it is stamped onto its three rotations, so the model shows the *same picture from every side*. That phrase is doing real work — rotating the model a quarter turn carries each wall AND its outside viewer together, so rotation-invariance is exactly "identical from all four sides", and there is a test that asserts the invariance over the whole volume rather than taking it on trust. Erasing propagates too: symmetry that only copied paint would let an erase break the promise silently.
- Two limitations, stated rather than fudged: the **top view propagates nothing** (a quarter turn maps a horizontal slice onto itself, and stamping there would overwrite the very cells just painted), and a **non-square footprint falls back to the half turn** — front matches back, left matches right, because no quarter-turn symmetry exists for it to enforce.
- **The preview free-rotates — drag it.** The projection now takes any angle, not four. The quarter turns stay bit-exact (`cos 90°` is 0 here, not 6.1e-17, because the cardinals are where the preview rests and the pixel-art look depends on them), and the orbit buttons now *snap* to the next quarter mark rather than adding blindly — from 37°, "turn right" means 90, not 127.
- **Which walls are drawn, and how brightly, follows the camera continuously.** The old fixed left/right pair becomes a dot product against the view direction — at 45° a wall faces you head-on and its neighbours go edge-on, which is not a special case but the dot product passing through zero. Calibrated to reproduce the old shading exactly at the cardinals.
- **The preview is bigger.** It fills the panel's width, and a grip underneath drags it taller — up to 600px, remembered between sessions.

*And yes: the project file saves the whole volume, not just the slice you were on. It has since v0.1.24. The changelog just never said it to your face.*

---

## v0.1.36 — "Through the Looking Glass, Again"

Three reports, filed with screenshots, all three real.

- **The Front view was showing you the back of your model.** *"If I rotate the front to the camera, the voxel editing field is flipped left-to-right"* — correct, and here is why: the Front canvas draws x rightward and y upward, which geometrically places its viewer on the **+z** side. But slice 1 was the plane z = 0 — the far wall. You were painting the back wall and seeing it through the model, from behind; turn that wall to face you and of course it reads mirrored. Slice 1 is now the wall you are actually facing, counting inward from there. Not one canvas pixel moved — only the numbering — and the Side view never had the bug, by pure accident of which side its viewer sits on. This is the same family as v0.1.32's mirrored exporter: every one of these bugs is somebody trusting a label over the geometry.
- **The preview follows the pencil now.** It used to render only the committed volume, so a stroke appeared in it when you changed slices and not before. The preview now composites the live canvas over a copy of the volume on every paint — and with Face Symmetry on, all four walls move with the pencil, which is the first time you can actually *watch* the symmetry work.
- **The right panel is grabbable.** Drag its left edge to widen the whole column — the voxel preview grows with it, the canvas area reflows, and the width is remembered. Between this, the height grip, and free rotation, the preview asks are done.
- One found while wiring: the sidebar animates its width, and a transition under a live drag reads as rubber-banding — so the drag suspends it and the release restores it.

---

## v0.1.37 — "Grip and Grab"

Two follow-ups on yesterday's panel work, both from the field within a day.

- **The width grip went dead over pinned panels.** Pinned panels are sticky *and* carry a stacking number counting down from 100 — that is how several pinned headers stack — so the grip, sitting at 5, lost the edge for exactly the stretch of sidebar you had pinned. Reported precisely as observed: *"doesn't pick up on the voxel panel, picks up below it."* The grip now stands above the whole pinned range.
- **The preview drag was rotating the wrong way.** Grab metaphor: the face under your cursor should follow your cursor. The projected position of the nearest corner moves as −sin(yaw), so yaw must *decrease* as the cursor moves right — it shipped increasing, so the model turned against the drag. One sign, flipped, with the geometry written next to it so the next person does not have to re-derive which way is "natural".

---

## v0.1.38 — "Spring Cleaning, Inherited Dust"

- **The deployed app drops from 5.0M to 1.9M** by deleting two files this project never used: miniPaint's 3.1M demo `preview.gif` (a README animation the editor never loads) and its 36K test fixture, along with the debug menu entry that fetched it and the upstream embed examples that referenced both. Thirty-eight releases of features added ~217K to the bundle; the other three megabytes were sitting there from the first commit.

---

## v0.1.39 — "The Editor Hums"

- **New — the Sound panel.** An 808 drum kit, an acid bass, a five-voice poly synth, and a rack of game sounds — coin, jump, hurt, explode, power up, select, shoot. Click the pads, click the keys, or tick *keyboard* and play the QWERTY row. Pin it, reorder it, widen it: it is a panel like any other.
- **None of it is editable, and that is the point.** The instruments are [SoundGraph](https://github.com/TheMutantFactory/soundgraph) patches — JSON graphs played by SoundGraph's own 344K WebAssembly engine in an AudioWorklet, with no DSP in JavaScript anywhere. This panel is an instrument; SoundGraph is the editor. One graph, another host — which was always that project's whole claim.
- **Why a paint app has a drum machine:** this editor makes game sprites and voxel models, and those ship next to game audio. Auditioning the coin sound beside the coin sprite beats alt-tabbing, and a beat to draw to costs nothing once the engine is aboard.
- **It costs nothing until you press play.** The engine loads on the panel's power button — about 135K over the wire, and the browser wanted a click before making sound anyway, so the same gesture pays for both.
- Keyboard capture is opt-in and stays off the editor's shortcuts: Z is a kick drum only while the checkbox says so, and never inside a text field.

---

## v0.1.40 — "Roll With It"

- **New — the Piano Roll menu**, after Voxel. A roll is a canvas whose pixels are notes: one axis time in steps, the other pitch in semitones, horizontal or vertical, flipped by an exact quarter turn that a test guarantees is a rotation and never a mirror — a mirrored roll inverts every melody, and this project has shipped enough mirrors.
- **One layer for the whole thing, enforced.** In roll mode the pencil paints straight into the single Roll layer instead of growing a vector stack — each stroke its own undo step, and consecutive strokes serialized so a fast riff cannot snapshot the layer mid-commit and quietly eat the stroke before it (three of six rapid test strokes vanished exactly that way before the fix). Want two rolls? Save two files: every file tool this app has already works on a roll, because a roll is just an image.
- **Headphones in the top bar**, beside the folder: muted grey until you click, mutant green with a volume slider once the sound is on, and a mute toggle thereafter. Same power switch as the Sound panel's button — either one lights the other.
- **The Sound panel now sits pinned under the Preview by default** — and a saved panel arrangement from before the Sound panel existed slots it there too, instead of dumping it at the bottom of the stack, which is where every newly shipped panel used to land for anyone with an old cookie.
- Rows are laid out playback-ready — one row per semitone, low notes at the bottom. The roll does not play yet. It knows how to, when asked.

---

## v0.1.41 — "Sixteenths"

The piano roll learns to be an instrument rather than a picture of one.

- **It plays.** A green play button and a tempo box appear in the top bar whenever a roll exists: the playhead walks the time axis in sixteenths at the tempo, and every painted pixel sounds on its row's pitch through the Sound engine. **A run of pixels holds as one note** — the player triggers on rising edges only, so drawing a long bar means a long note, which is what it looks like. The roll loops and re-reads the image every pass, so you can paint while it plays and hear the edit next time round. Pressing play powers the audio and picks the poly synth if nothing melodic is loaded.
- **The roll wears a keyboard.** Black-key lanes shaded, every C labelled — built from the *same* pitch maps the player reads, so what the lanes say and what the speaker does can never disagree. Without it a roll was twenty-four identical rows and nobody knew which one was middle C.
- **Roll mode puts the toolbar on a diet:** point, select, pencil, erase — the four things a roll can use. A brushstroke on a piano roll is pixels that look like music and play like an accident.
- **The New Roll dialog speaks music:** bars (in powers of two — music is built by doubling) and octaves, not steps and pitches. Four bars, two octaves is the default loop.

---

## v0.1.42 — "Dead Letter Office"

One crash report from the first human minutes with the roll, and the trail it opened.

- **Fixed: drawing in roll mode could crash** — *"null is not an object (evaluating config.layer.data.push)"*. If a roll stroke's start was refused mid-drag, the rest of the drag fell through to the vector-pencil path, which shoves stroke points into a data array the Roll image layer does not have. Three fences now: a refused start no longer un-claims the drag, roll mode never falls through to the vector path, and the vector path checks its layer before pushing — that last one closes a hazard upstream has always had.
- **The stack trace's real gift was bigger: held drags in roll mode had never worked.** The base class routes mouse moves straight to `mousemove`; the `dragMove` override where the roll's routing lived is not on the mouse path at all, so it silently never ran — a held drag painted its first pixel and discarded the rest. The routing now lives where the events actually arrive. And an embarrassment worth recording: v0.1.41's "a run of pixels holds as one note" was verified with a note-event tap whose signature for a one-pixel note and a sustained run are identical — the claim was true of the engine and untested of the pencil. This release re-proves it end to end: one eight-pixel drag, exactly one noteOn.
- Also hardened: every keyboard shortcut runs through `is_input()` first, which threw on non-Element event targets and took the shortcut down with it.

---

## v0.1.43 — "Eighty-Eight Keys, Give or Take Sixty-Four"

- **The roll wears a real piano now.** A playable keyboard strip beside the pitch axis — left or right of a horizontal roll, above or below a vertical one — with proper black keys growing out of the roll's edge and a label on every C. **Press a key, hear the pitch**: the strip plays through the same engine as the roll, and the lane-to-note mapping is the very map the pencil paints by, held equal by a test, so the key you press and the lane you paint cannot disagree.
- **And a keyboard at 47 degrees.** Not 45 — 45 would look intentional in the wrong way. It plays exactly as straight as it looks crooked (pointer coordinates live in the element's own space, so the tilt costs nothing), and it exists because you specifically asked for something to fuck with people. Menu: Piano Roll → Keyboard: 47°.
- When the fit leaves no room beside the document, the strip floats over the roll's edge — it carries a shadow for the occasion — and takes its proper seat when zoom or pan makes room.
- Fixed while wiring: a quick key-press during the engine's first boot started a note nobody could stop (the third appearance of the released-during-await race in this codebase, same cure); the strip originally positioned itself against a different ancestor than it measured, floating a toolbar's height above the roll; and the Sound panel's instrument dropdown now follows instrument changes made from outside it.

---

## v0.1.44 — "Follow the Bouncing Band"

- **A playhead.** A band of house green walks the roll as it plays, so bar three is no longer something you hear while staring at bar one.
- **The keys light up** — the one under your finger and every note the player is sounding, so playback runs a little light show down the keyboard. Both glows come from the same note maps as everything else.
- **The keyboard is now the one control, and the roll follows it.** Ask for the keys on the Left or Right and the roll lies horizontal; ask for Top or Bottom and it stands vertical — the roll rotates itself to honour the seat you chose, with the same exact quarter turn as Rotate Roll. (Read from *"make the piano roll rotate with the keyboard"* — if you meant the whole canvas tilting at −47° alongside the keys, say so, and I will commit that crime too.)
- **−47°, as specified.** It was 47 for one release; the direction of wrongness has since been corrected.
- **Copy works now, everywhere.** It asked the browser's permission first and treated anything but an explicit yes — including a permissions API that merely *throws* on some engines — as refusal, failing with upstream's own typo: *"Missing permissions to write to Clipboard.cc"*. Copy now lands in an in-app clipboard first, unconditionally, and offers the system clipboard as a courtesy; Paste falls back to the in-app copy whenever the system refuses. Copying inside the app never needed anyone's permission.
- **Fast strokes rebuilt on honest foundations.** The roll now keeps one working canvas per session instead of re-snapshotting the layer every stroke — the re-snapshot design made every stroke start await the previous commit, and overlapping awaits ate each other's work (three back-to-back drags kept only the first; then a supersession guard that confused "ended" with "superseded" ate all three and left the undo stack so bare that Ctrl+Z unmade the roll itself). No awaits remain on the drawing path. One honest residue: a stroke begun within ~200ms of an undo can catch the undo's image restoration mid-air; that window is the restoration loading, and it is documented where it lives.

---

## v0.1.45 — "The Leaning Tower of Piano"

- **The whole canvas tilts at −47° now.** You said the word. Choose Keyboard: −47° and the entire surface — roll, guides, playhead, cursor, keys — leans as one thing, keys glued to the roll's edge by geometry rather than apology. Drawing on it lands exactly where you click: the pointer is unturned about the canvas's centre, which rotation cannot move, and the taps land pixel-perfect in the corners at any angle. We checked the corners *specifically*.
- **And it drifts.** Every bar played in the tilted seat leans the world another 0.1° — eased, so each notch is a lean and not a twitch. Ten minutes of looping at 120bpm is thirty degrees of honest decay. Stopping does not straighten it; the angle is a function of play, not of time, and sitting still changes nothing. There is a test that pins the arithmetic and a browser session that watched 212 bars carry the surface to −68.2° with the pencil still landing true.
- **Leaving the seat snaps.** The ease that flatters the drift would make the exit a 350ms swing during which every click lands mid-rotation; the way out is instant, and the world is simply level again, as if it had never been otherwise.

---

## v0.1.46 — "Thumbs"

- **The right-hand panels existed only in theory on a phone.** Tapping the right hamburger dutifully added `.active` to a sidebar that stayed at x = 380 on a 375px screen, every time, forever. `.wrapper` is a CSS grid, and an absolutely-positioned grid child measures its offsets against its *own grid area* — which, once the sidebar left the flow, had collapsed to zero pixels hard against the right edge of the world. `right: 0` was faithfully honoured; it just meant nothing. Layers, colours, palette, preview, sound and voxel were unreachable. The drawers are now fixed to the viewport and slide on a transform, so they answer to the screen rather than to a column that isn't there.
- **The menu was reduced to initials.** `F E V Im Pi Vo Piano Roll La Eff To H` — eleven menus squeezed into slivers seventeen pixels wide, because flex will shrink a thing forever before it will admit the row is too narrow. The bar now scrolls sideways between the two hamburgers, with every label at full length and "Piano Roll" back on one line.
- **Everything is thumb-sized.** Tools went from 30×25 to 44×44 and the rail from one column to two — the whole toolbox fits on one screen instead of six hundred pixels of scroll. Menu rows, the folder toggle, the sound toggle and undo all grew to match.
- **Drawers behave like drawers.** One at a time (two open at once left a ninety-pixel slice of canvas), a dimmed backdrop you can tap to dismiss, Escape closes them, picking a tool closes the tool drawer, and growing the window past the breakpoint clears both. Both hamburgers used to announce themselves as "Toggle Menu"; they now say which is which, and whether they are open.
- **Tool options get their own row** on a portrait phone instead of fighting the wordmark for the hundred and thirty pixels left over. The wordmark steps aside there — the finger is still up, just not on your phone — and the Mutant Factory mark carries the branding. The version number leaves the bar too; it is in Help ▸ About, and rides along with every piece of feedback you send.
- **A phone held sideways is now a phone.** 812×375 is far wider than the old 700px breakpoint and far too short for desktop chrome, so landscape used to get the full apparatus on a 375-pixel-tall viewport. It gets drawers now, and a shorter menu bar to go with them.
- **Safe areas honoured.** Nothing hides behind the home indicator or under the notch any more.

---

## Unreleased — "???"

- (redacted)
- (redacted)
- the frog is not fractions
- the frog is not fractions
- please stop resizing the canvas — it can tell
