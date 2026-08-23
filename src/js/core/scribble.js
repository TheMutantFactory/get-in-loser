/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * Turning a dragged gesture into marks. Pure - see tests/scribble.test.js.
 *
 * WHY A STROKE AND NOT A CLICK. The Background Eraser started click-only, and a click describes the
 * background with one small disc - a single tone, from one spot. Backgrounds are rarely one tone: a
 * wall has a gradient, a floor has texture, a sky goes from pale at the horizon to deep overhead.
 * One disc says almost nothing about any of them, and the flood then spends the whole job deciding
 * how far that one sample generalises. A stroke drawn across the background hands over hundreds of
 * pixels spanning the range it actually covers, which is a far better answer to the same question.
 *
 * POINTS ARE KEPT IN WORLD COORDINATES, not layer coordinates, and that is deliberate: the first
 * click of a cutout can trigger an automatic rasterize, which replaces the layer underneath the
 * gesture. Anything measured against the old layer would be measured against something that no
 * longer exists. World coordinates outlive it, and the conversion happens once, at the end.
 */

/** Points closer together than this add nothing but work. In world units. */
const MIN_STEP = 1.5;

/**
 * Append a point to a stroke, unless it is on top of the last one.
 *
 * @param {Array} points entries [x, y], modified in place
 * @param {number} x
 * @param {number} y
 * @param {number} min_step
 * @returns {boolean} whether it was added
 */
function add_point(points, x, y, min_step) {
	if (!isFinite(x) || !isFinite(y)) {
		return false;
	}

	var gap = min_step == null ? MIN_STEP : min_step;
	var last = points.length > 0 ? points[points.length - 1] : null;

	if (last != null) {
		var dx = x - last[0];
		var dy = y - last[1];
		if (dx * dx + dy * dy < gap * gap) {
			return false;
		}
	}

	points.push([x, y]);
	return true;
}

/**
 * Where a world point sits on the canvas element, in screen pixels.
 *
 * The overlay is drawn with the transform reset, because the ambient transform mid-render-loop is
 * not the plain zoom matrix - the same reason the pixel grid draws in screen space.
 *
 * @param {number} world_x
 * @param {number} world_y
 * @param {object} view keys: origin_x, origin_y (the world point at the canvas corner), zoom
 * @returns {object} keys: x, y
 */
function to_screen(world_x, world_y, view) {
	return {
		x: (world_x - view.origin_x) * view.zoom,
		y: (world_y - view.origin_y) * view.zoom,
	};
}

/**
 * Which pixel of a layer's own image a world point lands on.
 *
 * @param {number} world_x
 * @param {number} world_y
 * @param {object} layer keys: x, y, scale_x, scale_y (drawn size over original size)
 * @returns {object} keys: x, y - whole pixels
 */
function to_layer(world_x, world_y, layer) {
	var scale_x = layer.scale_x > 0 ? layer.scale_x : 1;
	var scale_y = layer.scale_y > 0 ? layer.scale_y : 1;

	return {
		x: Math.round((world_x - layer.x) / scale_x),
		y: Math.round((world_y - layer.y) / scale_y),
	};
}

/**
 * Convert a stroke to layer pixels, dropping anything that falls outside the image.
 *
 * @param {Array} points entries [x, y] in world coordinates
 * @param {object} layer keys: x, y, scale_x, scale_y, width, height
 * @returns {Array} entries [x, y] in layer pixels
 */
function stroke_to_marks(points, layer) {
	var marks = [];

	for (var i = 0; i < points.length; i++) {
		var p = to_layer(points[i][0], points[i][1], layer);

		if (p.x < 0 || p.y < 0 || p.x >= layer.width || p.y >= layer.height) {
			//a stroke that runs off the edge of the picture keeps the part that did not
			continue;
		}
		marks.push([p.x, p.y]);
	}

	return marks;
}

export {MIN_STEP, add_point, to_screen, to_layer, stroke_to_marks};
