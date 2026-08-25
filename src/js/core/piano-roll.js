/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * The piano roll: a canvas whose pixels are notes. Pure - see tests/piano-roll.test.js.
 *
 * IT IS ESSENTIALLY PIXELS, on purpose. One axis is time in steps, the other is pitch in
 * semitones, and a painted pixel is a note. There is no sequencer data model hiding behind the
 * image - the image IS the roll, which is why it saves, loads, copies and erases with the tools
 * that already exist. Rows are laid out playback-ready (one row per semitone, low notes at the
 * bottom of a horizontal roll) so a player can scan columns later without the format changing.
 *
 * ONE LAYER FOR THE WHOLE THING. Pixel mode lets the pencil grow a stack of vector layers; a roll
 * wants to stay a single flat surface, so roll mode paints straight into the one Roll layer. A
 * person who wants more than one roll saves more than one file.
 */

/** 64 steps of 2 octaves - four bars of sixteenths, C3 to B4 - is a loop, not a career. */
const DEFAULT_ROLL = {steps: 64, pitches: 24};

/** Rolls bigger than this stop being readable at pixel size. */
const MAX_STEPS = 512;
const MAX_PITCHES = 96;

/** The note of the BOTTOM row of a horizontal roll (C3). */
const BASE_NOTE = 48;

/**
 * Canvas dimensions for a roll in a given orientation.
 *
 * Horizontal: time runs left to right, pitch bottom to top - the convention every DAW shares.
 * Vertical: time runs top to bottom, pitch left to right - the taller shape a sidebar-heavy
 * screen may prefer, one quarter turn CLOCKWISE from horizontal.
 *
 * @param {object} roll keys: steps, pitches
 * @param {string} orientation 'horizontal' | 'vertical'
 * @returns {object} keys: width, height
 */
function roll_dimensions(roll, orientation) {
	if (orientation === 'vertical') {
		return {width: roll.pitches, height: roll.steps};
	}
	return {width: roll.steps, height: roll.pitches};
}

/**
 * Rotate RGBA pixels a quarter turn, the transform that flips a roll between orientations.
 *
 * CHIRALITY LESSON APPLIED IN ADVANCE. A quarter turn is a rotation, determinant +1 - the roll
 * must never MIRROR when re-oriented, or every melody comes back inverted. Clockwise sends the
 * top-left to the top-right: out(y, x') where x' counts from the far edge.
 *
 * @param {Uint8ClampedArray} rgba
 * @param {number} width
 * @param {number} height
 * @param {string} direction 'cw' | 'ccw'
 * @returns {object} keys: data, width, height - width and height swapped
 */
function rotate_pixels(rgba, width, height, direction) {
	var out = new Uint8ClampedArray(rgba.length);

	for (var y = 0; y < height; y++) {
		for (var x = 0; x < width; x++) {
			var src = (y * width + x) * 4;
			var dst = direction === 'ccw'
				? (((width - 1) - x) * height + y) * 4
				: (x * height + ((height - 1) - y)) * 4;

			out[dst] = rgba[src];
			out[dst + 1] = rgba[src + 1];
			out[dst + 2] = rgba[src + 2];
			out[dst + 3] = rgba[src + 3];
		}
	}

	return {data: out, width: height, height: width};
}

/**
 * Which note and step a canvas pixel means, under the current orientation.
 *
 * @param {number} x
 * @param {number} y
 * @param {object} roll keys: steps, pitches
 * @param {string} orientation
 * @returns {object|null} keys: step, note - null outside the roll
 */
function pixel_to_note(x, y, roll, orientation) {
	var dims = roll_dimensions(roll, orientation);

	if (x < 0 || y < 0 || x >= dims.width || y >= dims.height) {
		return null;
	}

	if (orientation === 'vertical') {
		//time top to bottom, pitch left to right
		return {step: y, note: BASE_NOTE + x};
	}

	//horizontal: canvas y grows downward, pitch grows upward
	return {step: x, note: BASE_NOTE + (roll.pitches - 1 - y)};
}

/**
 * Clamp a requested roll size to something drawable.
 *
 * @param {number} steps
 * @param {number} pitches
 * @returns {object|null} null when the numbers are not numbers
 */
function resolve_roll(steps, pitches) {
	var s = parseInt(steps, 10);
	var p = parseInt(pitches, 10);

	if (isNaN(s) || isNaN(p) || s < 1 || p < 1) {
		return null;
	}

	return {
		steps: Math.min(MAX_STEPS, s),
		pitches: Math.min(MAX_PITCHES, p),
	};
}

export {DEFAULT_ROLL, MAX_STEPS, MAX_PITCHES, BASE_NOTE, roll_dimensions, rotate_pixels, pixel_to_note, resolve_roll};
