/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Tolerant parser for JSON colour palettes. Kept free of DOM/config access so
 * it can be unit tested - see tests/palette-parser.test.js.
 */

var MAX_COLORS = 512;

/**
 * @param {number} value
 * @returns {string} two digit lowercase hex
 */
function to_hex_pair(value) {
	var clamped = Math.max(0, Math.min(255, Math.round(value)));

	return ('0' + clamped.toString(16)).slice(-2);
}

/**
 * Normalizes a single colour into '#rrggbb'.
 *
 * Accepts '#abc', 'abc', '#aabbcc', 'aabbcc', '#aabbccdd' (alpha dropped),
 * [r, g, b], {r, g, b} and {hex|color|value|hexcode: ...}.
 *
 * @param {*} color
 * @returns {string|null} null when the value is not a usable colour
 */
function normalize_color(color) {
	if (color == null) {
		return null;
	}

	if (Array.isArray(color)) {
		if (color.length < 3) {
			return null;
		}
		for (var i = 0; i < 3; i++) {
			if (typeof color[i] != 'number' || isNaN(color[i])) {
				return null;
			}
		}

		return '#' + to_hex_pair(color[0]) + to_hex_pair(color[1]) + to_hex_pair(color[2]);
	}

	if (typeof color == 'object') {
		var keys = ['hex', 'color', 'colour', 'value', 'hexcode'];
		for (var k = 0; k < keys.length; k++) {
			if (color[keys[k]] != undefined) {
				return normalize_color(color[keys[k]]);
			}
		}
		if (typeof color.r == 'number' && typeof color.g == 'number' && typeof color.b == 'number') {
			return normalize_color([color.r, color.g, color.b]);
		}

		return null;
	}

	if (typeof color != 'string') {
		return null;
	}

	var hex = color.trim().replace(/^#/, '');
	if (/^[0-9a-f]{3}$/i.test(hex)) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}
	//drop alpha if present
	if (/^[0-9a-f]{8}$/i.test(hex)) {
		hex = hex.substring(0, 6);
	}
	if (!/^[0-9a-f]{6}$/i.test(hex)) {
		return null;
	}

	return '#' + hex.toLowerCase();
}

/**
 * Finds the colour list inside an arbitrary palette object.
 *
 * @param {*} data
 * @returns {array}
 */
function find_color_list(data) {
	if (Array.isArray(data)) {
		return data;
	}
	if (data == null || typeof data != 'object') {
		return [];
	}

	var keys = ['colors', 'colours', 'palette', 'swatches'];
	for (var i = 0; i < keys.length; i++) {
		if (Array.isArray(data[keys[i]])) {
			return data[keys[i]];
		}
	}

	return [];
}

/**
 * Parses a palette definition into the shape used by the app.
 *
 * @param {object|array|string} data parsed JSON or a raw JSON string
 * @param {object} defaults optional fallbacks, e.g. {name: 'file.json'}
 * @returns {object} keys: name, author, source, license, colors (array of '#rrggbb')
 * @throws {Error} when the data contains no usable colours
 */
function parse_palette(data, defaults) {
	defaults = defaults || {};

	if (typeof data == 'string') {
		try {
			data = JSON.parse(data);
		}
		catch (e) {
			throw new Error('Palette is not valid JSON.');
		}
	}

	var raw_colors = find_color_list(data);
	var colors = [];
	var seen = {};

	for (var i = 0; i < raw_colors.length && colors.length < MAX_COLORS; i++) {
		var hex = normalize_color(raw_colors[i]);
		if (hex == null || seen[hex] === true) {
			continue;
		}
		seen[hex] = true;
		colors.push(hex);
	}

	if (colors.length == 0) {
		throw new Error('Palette contains no usable colors.');
	}

	var meta = (data != null && typeof data == 'object' && !Array.isArray(data)) ? data : {};

	return {
		name: String(meta.name || defaults.name || 'Palette'),
		author: meta.author != undefined ? String(meta.author) : null,
		source: meta.source != undefined ? String(meta.source) : null,
		license: meta.license != undefined ? String(meta.license) : null,
		colors: colors,
	};
}

/**
 * Serializes a palette back to the canonical JSON format.
 *
 * @param {object} palette
 * @returns {string}
 */
function stringify_palette(palette) {
	var out = {name: palette.name};

	if (palette.author) out.author = palette.author;
	if (palette.source) out.source = palette.source;
	if (palette.license) out.license = palette.license;
	out.colors = palette.colors;

	return JSON.stringify(out, null, '\t');
}

/**
 * Finds the palette colour closest to the given one, using a weighted RGB
 * distance that roughly matches how the eye judges "close".
 *
 * @param {string} hex
 * @param {array} colors array of '#rrggbb'
 * @returns {string|null}
 */
function nearest_color(hex, colors) {
	var target = normalize_color(hex);
	if (target == null || !colors || colors.length == 0) {
		return null;
	}

	var tr = parseInt(target.substring(1, 3), 16);
	var tg = parseInt(target.substring(3, 5), 16);
	var tb = parseInt(target.substring(5, 7), 16);

	var best = null;
	var best_distance = Infinity;

	for (var i = 0; i < colors.length; i++) {
		var candidate = normalize_color(colors[i]);
		if (candidate == null) {
			continue;
		}

		var dr = tr - parseInt(candidate.substring(1, 3), 16);
		var dg = tg - parseInt(candidate.substring(3, 5), 16);
		var db = tb - parseInt(candidate.substring(5, 7), 16);

		//weights approximate human luminance sensitivity
		var distance = 2 * dr * dr + 4 * dg * dg + 3 * db * db;

		if (distance < best_distance) {
			best_distance = distance;
			best = candidate;
		}
	}

	return best;
}

export {MAX_COLORS, normalize_color, parse_palette, stringify_palette, nearest_color};
