/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Pure helpers deciding when and where the per-pixel grid is drawn. See
 * tests/pixel-grid.test.js.
 *
 * Positions are returned in screen pixels rather than image coordinates: the
 * canvas transform in the middle of the render loop is not the plain zoom
 * matrix, so the grid is drawn with the transform reset.
 */

/** below this zoom level pixel grid lines would be thicker than the pixels */
const MIN_ZOOM = 6;

/** drawing more lines than this costs more than the grid is worth */
const MAX_LINES = 4000;

/** every Nth line is drawn stronger, to make counting pixels easier */
const MAJOR_EVERY = 8;

/**
 * @param {object} state keys: pixel_mode, grid_enabled, zoom, width, height
 * @param {object} options optional overrides for MIN_ZOOM / MAX_LINES
 * @returns {boolean}
 */
function should_draw_pixel_grid(state, options) {
	options = options || {};

	var min_zoom = options.min_zoom != undefined ? options.min_zoom : MIN_ZOOM;
	var max_lines = options.max_lines != undefined ? options.max_lines : MAX_LINES;

	if (!state.pixel_mode || !state.grid_enabled) {
		return false;
	}
	if (!(state.zoom >= min_zoom)) {
		return false;
	}
	if (!(state.width > 0) || !(state.height > 0)) {
		return false;
	}
	if (state.width + state.height > max_lines) {
		return false;
	}

	return true;
}

/**
 * @param {number} index
 * @param {number} major_every
 * @returns {boolean} true when this line should be drawn stronger
 */
function is_major_line(index, major_every) {
	major_every = major_every || MAJOR_EVERY;

	return index % major_every === 0;
}

/**
 * Screen positions of the grid lines along one axis. Lines that fall outside
 * the visible canvas are left out, so a zoomed in corner of a large image only
 * costs the lines actually on screen.
 *
 * @param {object} state keys:
 *   count - number of image pixels along this axis
 *   zoom - current zoom level
 *   origin - image coordinate shown at screen position 0
 *   screen_size - size of the visible canvas along this axis, in pixels
 *   major_every - optional, defaults to MAJOR_EVERY
 * @returns {array} [{index, position, major}] - position is a half pixel
 *   offset so the 1px line lands on a whole device pixel
 */
function grid_line_positions(state) {
	var lines = [];

	if (!(state.count > 0) || !(state.zoom > 0)) {
		return lines;
	}

	var origin = state.origin || 0;

	for (var i = 1; i < state.count; i++) {
		var position = Math.round((i - origin) * state.zoom) + 0.5;

		if (position < 0 || position > state.screen_size) {
			//off screen
			continue;
		}

		lines.push({
			index: i,
			position: position,
			major: is_major_line(i, state.major_every),
		});
	}

	return lines;
}

export {MIN_ZOOM, MAX_LINES, MAJOR_EVERY, should_draw_pixel_grid, is_major_line, grid_line_positions};
