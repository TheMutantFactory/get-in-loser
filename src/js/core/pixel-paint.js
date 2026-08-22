/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Whole-pixel plotting for the painting tools in pixel mode. Pure - see tests/pixel-paint.test.js.
 *
 * WHY THIS EXISTS. Pixel mode originally only changed how the canvas was SAMPLED (nearest
 * neighbour) and drew a grid over it. No tool consulted it. The pencil looked correct because it
 * has always plotted with fillRect on integer coordinates; the brush and eraser are vector tools -
 * stroked paths with round caps at float coordinates - so in pixel mode the brush laid down
 * feathered sub-pixel coverage and the eraser subtracted PART of a pixel's alpha, which reads as
 * not erasing at all. Reported from the app itself, with a screenshot that showed "PENCIL" snapped
 * to the grid next to a smooth anti-aliased "Brush".
 *
 * A pixel is either painted or it is not. Everything here works in whole pixels so a tool cannot
 * produce partial coverage even by accident.
 */

/** A nib is at least one pixel; a zero-size nib paints nothing and reads as a broken tool. */
const MIN_NIB = 1;

/** Guard against a pathological line eating the frame. Far beyond any real canvas diagonal. */
const MAX_LINE_PIXELS = 20000;

/**
 * The pixel a float coordinate falls inside.
 *
 * Math.floor, not Math.round: a canvas pixel spans [n, n+1), so the point 3.7 is inside pixel 3.
 * Rounding would put it in pixel 4 and shift every stroke half a pixel down and right.
 *
 * @param {number} value
 * @returns {number}
 */
function snap(value) {
	return Math.floor(value);
}

/**
 * Top left corner of a square nib centred on a point, in whole pixels.
 *
 * Even sizes cannot be centred exactly, so they sit one pixel up and left of centre - consistent
 * for every stroke, which matters more than which way it leans.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} size nib width in pixels
 * @returns {object} keys: x, y, size
 */
function nib_origin(x, y, size) {
	var s = Math.max(MIN_NIB, Math.round(size) || MIN_NIB);
	var half = Math.floor((s - 1) / 2);

	return {
		x: snap(x) - half,
		y: snap(y) - half,
		size: s,
	};
}

/**
 * Every whole pixel along a line, endpoints included - Bresenham.
 *
 * The tools need this because a mouse moving quickly reports points several pixels apart, and the
 * gap has to be filled. Bresenham gives a CONNECTED run: consecutive pixels always touch, so a
 * fast stroke has no holes. Sampling a line by distance (what the pencil does) both skips pixels
 * and plots some twice.
 *
 * @param {number} from_x
 * @param {number} from_y
 * @param {number} to_x
 * @param {number} to_y
 * @param {number} limit optional cap on the number of pixels returned
 * @returns {array} [{x, y}] in order, from -> to
 */
function line_pixels(from_x, from_y, to_x, to_y, limit) {
	var max = limit != undefined ? limit : MAX_LINE_PIXELS;
	var x0 = snap(from_x);
	var y0 = snap(from_y);
	var x1 = snap(to_x);
	var y1 = snap(to_y);

	if (!isFinite(x0) || !isFinite(y0) || !isFinite(x1) || !isFinite(y1)) {
		return [];
	}

	var dx = Math.abs(x1 - x0);
	var dy = -Math.abs(y1 - y0);
	var step_x = x0 < x1 ? 1 : -1;
	var step_y = y0 < y1 ? 1 : -1;
	var error = dx + dy;
	var pixels = [];

	while (pixels.length < max) {
		pixels.push({x: x0, y: y0});

		if (x0 === x1 && y0 === y1) {
			break;
		}

		var doubled = 2 * error;
		if (doubled >= dy) {
			error += dy;
			x0 += step_x;
		}
		if (doubled <= dx) {
			error += dx;
			y0 += step_y;
		}
	}

	return pixels;
}

/**
 * The nibs to paint for a stroke from one point to another.
 *
 * @param {number} from_x
 * @param {number} from_y
 * @param {number} to_x
 * @param {number} to_y
 * @param {number} size
 * @returns {array} [{x, y, size}] top left corners, ready for fillRect
 */
function stroke_nibs(from_x, from_y, to_x, to_y, size) {
	return line_pixels(from_x, from_y, to_x, to_y)
		.map((p) => nib_origin(p.x, p.y, size));
}

export {MIN_NIB, MAX_LINE_PIXELS, snap, nib_origin, line_pixels, stroke_nibs};
