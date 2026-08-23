/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * Remove the background: clear the region that reaches the edge of the image. Pure - see
 * tests/background-removal.test.js.
 *
 * WHY THIS IS NOT THE TOOLS WE ALREADY HAVE. Color to Alpha removes a colour EVERYWHERE, so a
 * white background goes and so do the highlights in the eyes. The Magic Eraser is contiguous but
 * wants a click per region, so a subject with sky either side of its head takes three. This starts
 * from every border pixel at once and floods inward, which is the actual definition of background:
 * the part that touches the outside.
 *
 * CONTIGUITY IS THE WHOLE POINT. A hole enclosed by the subject - the gap inside a handle, the sky
 * between an arm and a body that the arm closes off - is the same colour as the background and is
 * NOT the background. Flooding rather than colour-matching is what tells them apart, and there is a
 * test that holds it to that.
 */

/** 0 removes only exact matches; 255 would remove everything. */
const MAX_TOLERANCE = 255;

/**
 * Perceptual-ish distance between two colours, 0 when identical.
 *
 * Weighted toward green because the eye is, so a tolerance that looks right on one hue looks right
 * on the others. Returned on the same 0-255 scale as the tolerance so the setting means something.
 *
 * @returns {number}
 */
function color_distance(r1, g1, b1, r2, g2, b2) {
	var dr = r1 - r2;
	var dg = g1 - g2;
	var db = b1 - b2;

	return Math.sqrt((2 * dr * dr + 4 * dg * dg + 3 * db * db) / 9);
}

/**
 * The colour that most of the border is.
 *
 * The mode rather than the mean: averaging a border that is half sky and half grass gives a colour
 * that is neither, and then nothing matches it. Colours are bucketed slightly so that a gradient
 * sky still agrees with itself.
 *
 * @param {Uint8ClampedArray} rgba
 * @param {number} width
 * @param {number} height
 * @returns {object|null} keys r, g, b
 */
function dominant_border_color(rgba, width, height) {
	if (width < 1 || height < 1) {
		return null;
	}

	var counts = new Map();
	var best = null;
	var best_count = 0;

	var consider = function (x, y) {
		var i = (y * width + x) * 4;
		if (rgba[i + 3] === 0) {
			//already transparent; it says nothing about what the background looks like
			return;
		}
		//bucket to 1/8 of the range so near-identical shades agree
		var key = (rgba[i] >> 3) * 1024 + (rgba[i + 1] >> 3) * 32 + (rgba[i + 2] >> 3);
		var next = (counts.get(key) || 0) + 1;
		counts.set(key, next);

		if (next > best_count) {
			best_count = next;
			best = {r: rgba[i], g: rgba[i + 1], b: rgba[i + 2]};
		}
	};

	for (var x = 0; x < width; x++) {
		consider(x, 0);
		consider(x, height - 1);
	}
	for (var y = 0; y < height; y++) {
		consider(0, y);
		consider(width - 1, y);
	}

	return best;
}

/**
 * Clear the background.
 *
 * @param {Uint8ClampedArray} rgba source pixels, not modified
 * @param {number} width
 * @param {number} height
 * @param {object} options keys:
 *   tolerance - how far from the background colour still counts as background, 0-255
 *   soften    - pixels within this much of the tolerance edge get partial alpha instead of being
 *               cut clean, which is what keeps an anti-aliased outline from turning into a stair
 * @returns {object|null} keys: data, removed, background
 */
function remove_background(rgba, width, height, options) {
	options = options || {};

	if (!(width > 0) || !(height > 0) || rgba == null || rgba.length < width * height * 4) {
		return null;
	}

	var tolerance = Math.max(0, Math.min(MAX_TOLERANCE, Number(options.tolerance)));
	if (isNaN(tolerance)) {
		tolerance = 0;
	}
	var soften = Math.max(0, Number(options.soften) || 0);

	var background = dominant_border_color(rgba, width, height);
	if (background == null) {
		//every border pixel is already transparent; there is nothing to take away
		return {data: new Uint8ClampedArray(rgba), removed: 0, background: null};
	}

	var out = new Uint8ClampedArray(rgba);
	var n = width * height;
	var visited = new Uint8Array(n);
	//a plain array used as a stack: the recursion depth of a flood over a large image is not
	//something to hand to the call stack
	var stack = [];
	var removed = 0;

	var distance_at = function (index) {
		var i = index * 4;
		return color_distance(
			rgba[i], rgba[i + 1], rgba[i + 2],
			background.r, background.g, background.b
		);
	};

	var push = function (index) {
		if (visited[index] === 1) {
			return;
		}
		visited[index] = 1;
		if (distance_at(index) <= tolerance + soften) {
			stack.push(index);
		}
	};

	//seed from EVERY border pixel, not one click
	for (var x = 0; x < width; x++) {
		push(x);
		push((height - 1) * width + x);
	}
	for (var y = 0; y < height; y++) {
		push(y * width);
		push(y * width + width - 1);
	}

	while (stack.length > 0) {
		var index = stack.pop();
		var distance = distance_at(index);
		var i = index * 4;

		if (distance <= tolerance) {
			//background
			out[i + 3] = 0;
			removed++;
		}
		else if (soften > 0) {
			//in the fringe: keep it, but proportionally. An anti-aliased outline lives here, and
			//cutting it clean is what leaves a jagged halo of the old background behind.
			var ratio = (distance - tolerance) / soften;
			out[i + 3] = Math.min(rgba[i + 3], Math.round(rgba[i + 3] * ratio));
			//a fringe pixel is a boundary; do not flood past it into the subject
			continue;
		}
		else {
			continue;
		}

		var px = index % width;
		var py = (index - px) / width;

		if (px > 0) push(index - 1);
		if (px < width - 1) push(index + 1);
		if (py > 0) push(index - width);
		if (py < height - 1) push(index + width);
	}

	return {data: out, removed: removed, background: background};
}

export {MAX_TOLERANCE, color_distance, dominant_border_color, remove_background};
