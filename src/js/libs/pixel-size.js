/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Pure size helpers for pixel edit mode. Unlike the regular canvas size
 * dialogs these never convert units - a pixel is a pixel. See
 * tests/pixel-size.test.js.
 */

/** largest canvas pixel mode will create, as a guard against typos */
const MAX_PIXEL_SIZE = 10000;

/**
 * Common pixel art canvas sizes. The first entry is the size this editor is
 * mostly used for.
 */
const PIXEL_PRESETS = [
	[16, 24, 'tall sprite'],
	[16, 16, 'icon'],
	[8, 8, 'tile'],
	[32, 32, 'sprite'],
	[32, 48, 'tall sprite'],
	[64, 64, 'portrait'],
	[128, 128, 'scene'],
	[160, 144, 'Game Boy screen'],
	[256, 240, 'NES screen'],
];

/**
 * @param {array} presets defaults to PIXEL_PRESETS
 * @returns {array} ['Custom', '16x24 - tall sprite', ...]
 */
function get_preset_labels(presets) {
	presets = presets || PIXEL_PRESETS;

	return ['Custom'].concat(
		presets.map((preset) => preset[0] + 'x' + preset[1] + ' - ' + preset[2])
	);
}

/**
 * @param {string} label
 * @returns {object|null} keys: w, h
 */
function parse_preset(label) {
	if (label == undefined || label == 'Custom') {
		return null;
	}

	var dimensions = String(label).split(' ')[0].split('x');
	var w = parseInt(dimensions[0], 10);
	var h = parseInt(dimensions[1], 10);

	if (isNaN(w) || isNaN(h)) {
		return null;
	}

	return {w: w, h: h};
}

/**
 * Reads width/height out of dialog params, preferring the preset when one is
 * picked.
 *
 * @param {object} params keys: width, height, preset
 * @returns {object|null} keys: w, h. null when the input is unusable.
 */
function resolve_size(params) {
	params = params || {};

	var preset = parse_preset(params.preset);
	var w = preset != null ? preset.w : parseInt(params.width, 10);
	var h = preset != null ? preset.h : parseInt(params.height, 10);

	if (isNaN(w) || isNaN(h) || w < 1 || h < 1) {
		return null;
	}

	return {
		w: Math.min(w, MAX_PIXEL_SIZE),
		h: Math.min(h, MAX_PIXEL_SIZE),
	};
}

export {MAX_PIXEL_SIZE, PIXEL_PRESETS, get_preset_labels, parse_preset, resolve_size};
