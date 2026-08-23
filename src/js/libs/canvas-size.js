/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * How big a new document should be, given how much room the window has. Pure - see
 * tests/canvas-size.test.js.
 *
 * THE BUG THIS EXISTS TO FIX. Startup picked the largest standard size that fits the window, and
 * fell back to "the window, less a small margin" when the window was smaller than every standard
 * size. That fallback was `page_w - 15`, and it ran before the layout had been computed, when the
 * wrapper still measured ZERO. So a fresh document came up **-15 x -10** pixels.
 *
 * Nothing complained, because nothing checked. The canvas was drawn at a negative size, which is to
 * say not at all, and the damage surfaced somewhere else entirely: Fit divides the window by the
 * document, so it computed a NEGATIVE zoom, which the clamp then floored to the minimum. Clicking
 * Fit took you to 1%. And since every click on the canvas is mapped back through that zoom, drawing
 * afterwards landed thousands of pixels off-canvas - the brush appeared to do nothing at all.
 *
 * A size has to be a positive number of pixels. It is checked here now, once, at the source.
 */

/** Smaller than this is not a canvas anybody can work on, and is a sign the measurement failed. */
const MIN_CANVAS = 32;

/** Used when the window cannot be measured at all - the smallest standard size. */
const FALLBACK = {width: 640, height: 480};

/** Room left for the scrollbars and the document's drop shadow. */
const MARGIN_X = 15;
const MARGIN_Y = 10;

/**
 * Choose a document size for the space available.
 *
 * @param {number} page_w the wrapper's width, which may be 0 if it has not been laid out yet
 * @param {number} page_h
 * @param {Array} presets entries [width, height, label], smallest first
 * @returns {object} keys: width, height
 */
function pick_canvas_size(page_w, page_h, presets) {
	presets = presets || [];

	//the largest standard size that fits
	for (var i = presets.length - 1; i >= 0; i--) {
		if (presets[i][0] <= page_w && presets[i][1] <= page_h) {
			return {width: parseInt(presets[i][0], 10), height: parseInt(presets[i][1], 10)};
		}
	}

	//smaller than every standard size: use the room there is, less a margin
	var width = Math.floor(page_w) - MARGIN_X;
	var height = Math.floor(page_h) - MARGIN_Y;

	if (!(width >= MIN_CANVAS) || !(height >= MIN_CANVAS)) {
		//the window measured as nothing, so this is not a small screen - it is a measurement taken
		//too early. A guess that can be worked with beats a size that is arithmetic nonsense.
		return {width: FALLBACK.width, height: FALLBACK.height};
	}

	return {width: width, height: height};
}

export {MIN_CANVAS, FALLBACK, pick_canvas_size};
