/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Pure geometry helpers for the sidebar preview window.
 *
 * These are kept free of DOM/config access so they can be unit tested. See
 * tests/preview-geometry.test.js.
 */

/**
 * Maximum area the preview canvas may occupy inside the right sidebar.
 * The preview canvas is fitted inside this box while keeping the image
 * aspect ratio, so it never gets stretched.
 */
const PREVIEW_BOX = {w: 176, h: 176};

/**
 * Calculates preview canvas dimensions that fit inside the given box while
 * preserving the aspect ratio of the image.
 *
 * @param {number} image_width
 * @param {number} image_height
 * @param {object} box keys: w, h. Defaults to PREVIEW_BOX.
 * @returns {object} keys: w, h (integers, >= 1)
 */
function calc_preview_size(image_width, image_height, box) {
	box = box || PREVIEW_BOX;

	var box_w = Math.max(1, Math.floor(box.w));
	var box_h = Math.max(1, Math.floor(box.h));

	if (!(image_width > 0) || !(image_height > 0)) {
		//no usable image dimensions - fall back to the full box
		return {w: box_w, h: box_h};
	}

	var scale = Math.min(box_w / image_width, box_h / image_height);

	var w = Math.max(1, Math.min(box_w, Math.round(image_width * scale)));
	var h = Math.max(1, Math.min(box_h, Math.round(image_height * scale)));

	return {w: w, h: h};
}

/**
 * Scale factors used to draw the image into the preview canvas.
 * Both axes always get the same factor - that is what keeps the preview
 * undistorted.
 *
 * @param {number} image_width
 * @param {number} image_height
 * @param {object} preview_size keys: w, h
 * @returns {object} keys: x, y
 */
function calc_preview_scale(image_width, image_height, preview_size) {
	if (!(image_width > 0) || !(image_height > 0)) {
		return {x: 1, y: 1};
	}

	var scale = Math.min(preview_size.w / image_width, preview_size.h / image_height);

	return {x: scale, y: scale};
}

/**
 * Calculates the rectangle highlighting the currently visible part of the
 * image inside the preview canvas.
 *
 * @param {object} state keys:
 *   image_width, image_height - canvas dimensions in pixels
 *   preview_width, preview_height - preview canvas dimensions in pixels
 *   visible_width, visible_height - visible area on screen in pixels
 *   zoom - current zoom level (1 = 100%)
 *   world_x, world_y - image coordinates of the top left visible pixel
 * @returns {object|null} keys x, y, w, h. null when everything is visible.
 */
function calc_active_zone(state) {
	var preview_w = state.preview_width;
	var preview_h = state.preview_height;

	if (!(state.image_width > 0) || !(state.image_height > 0) || !(state.zoom > 0)) {
		return null;
	}

	var visible_w = state.visible_width / state.zoom;
	var visible_h = state.visible_height / state.zoom;

	var w = preview_w * visible_w / state.image_width;
	var h = preview_h * visible_h / state.image_height;

	var x = state.world_x / state.image_width * preview_w;
	var y = state.world_y / state.image_height * preview_h;

	//validate
	x = Math.max(0, x);
	y = Math.max(0, y);
	w = Math.min(preview_w - 1, w);
	h = Math.min(preview_h - 1, h);
	if (x + w > preview_w)
		x = preview_w - w;
	if (y + h > preview_h)
		y = preview_h - h;

	if (x == 0 && y == 0 && w == preview_w - 1 && h == preview_h - 1) {
		//everything is visible
		return null;
	}

	return {x: x, y: y, w: w, h: h};
}

/**
 * Converts a click/touch inside the preview canvas into the image offset the
 * visible window should move to.
 *
 * @param {object} state keys:
 *   mouse_x, mouse_y - position inside the preview canvas
 *   image_width, image_height, preview_width, preview_height
 *   visible_width, visible_height, zoom
 * @returns {object} keys: x, y (image coordinates)
 */
function calc_zoom_position(state) {
	var visible_w = state.visible_width / state.zoom;
	var visible_h = state.visible_height / state.zoom;

	var mini_w = state.preview_width * visible_w / state.image_width;
	var mini_h = state.preview_height * visible_h / state.image_height;

	return {
		x: (state.mouse_x - mini_w / 2) / state.preview_width * state.image_width,
		y: (state.mouse_y - mini_h / 2) / state.preview_height * state.image_height,
	};
}

export {PREVIEW_BOX, calc_preview_size, calc_preview_scale, calc_active_zone, calc_zoom_position};
