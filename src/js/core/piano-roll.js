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

/** Sixteen sixteenths to the bar - the resolution every step of the roll is. */
const STEPS_PER_BAR = 16;

/** The bar counts the New Roll dialog offers. Powers of two: music is built by doubling. */
const BAR_CHOICES = [1, 2, 4, 8, 16, 32];

/**
 * A roll sized in the units people think in: bars of time, octaves of pitch.
 *
 * @param {number} bars
 * @param {number} octaves
 * @returns {object|null} keys: steps, pitches
 */
function roll_from_bars(bars, octaves) {
	var b = parseInt(bars, 10);
	var o = parseInt(octaves, 10);

	if (isNaN(b) || isNaN(o) || b < 1 || o < 1) {
		return null;
	}

	return resolve_roll(b * STEPS_PER_BAR, o * 12);
}

/** How long one step lasts at a tempo, with steps as sixteenths. */
function step_seconds(bpm) {
	var b = Number(bpm);
	if (!isFinite(b) || b <= 0) {
		b = 120;
	}
	return 60 / Math.min(300, Math.max(20, b)) / 4;
}

/** Semitone offsets within an octave that are black keys. */
const BLACK_KEYS = [1, 3, 6, 8, 10];

/** Names for the C-row labels. */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * What each pitch lane is, for drawing the keyboard guide: black-key shading and C labels.
 *
 * Indexed BY PITCH (0 = base note), not by canvas row - the caller lays lanes onto rows or
 * columns per the orientation, using the same maps the notes use, so the guide can never
 * disagree with the sound.
 *
 * @param {object} roll keys: pitches
 * @returns {array} [{black: bool, label: 'C4'|null}] - label only on the Cs
 */
function key_guides(roll) {
	var out = [];

	for (var i = 0; i < roll.pitches; i++) {
		var note = BASE_NOTE + i;
		var semitone = note % 12;
		out.push({
			black: BLACK_KEYS.indexOf(semitone) > -1,
			label: semitone === 0 ? 'C' + (Math.floor(note / 12) - 1) : null,
		});
	}

	return out;
}

/**
 * Which notes are sounding at one step of the roll: every painted pixel in that step's lane.
 *
 * The player diffs consecutive steps - a note present in both sustains rather than retriggering,
 * so a run of painted pixels is one held note, which is what a bar drawn across the roll means.
 *
 * @param {Uint8ClampedArray} rgba the flattened roll image
 * @param {object} roll keys: steps, pitches
 * @param {string} orientation
 * @param {number} step
 * @returns {array} MIDI note numbers, ascending
 */
function notes_at_step(rgba, roll, orientation, step) {
	var dims = roll_dimensions(roll, orientation);
	var notes = [];

	for (var p = 0; p < roll.pitches; p++) {
		var x, y;
		if (orientation === 'vertical') {
			x = p;
			y = step;
		}
		else {
			x = step;
			y = roll.pitches - 1 - p;
		}

		if (x < 0 || y < 0 || x >= dims.width || y >= dims.height) {
			continue;
		}
		if (rgba[(y * dims.width + x) * 4 + 3] > 0) {
			notes.push(BASE_NOTE + p);
		}
	}

	return notes;
}

/** The keyboard strip's positions. 'start' hugs the low edge (left / top), 'end' the far one. */
const KEY_SIDES = ['start', 'end', 'tilt'];

/** How deep the keyboard strip draws, in screen pixels. */
const KEY_DEPTH = 44;

/**
 * Where the keyboard strip sits and how its lanes map to pitches, for one orientation and side.
 *
 * The strip runs along the PITCH axis: vertical beside a horizontal roll, horizontal above or
 * below a vertical one. Lane index counts along the strip in screen order; the pitch it plays
 * comes from the same mapping pixel_to_note uses, so pressing a key and painting its lane are
 * always the same note. 'tilt' is 'start' geometry with 47 degrees applied by the renderer -
 * deliberately, exactly, 47: a keyboard at a jaunty angle plays identically and unsettles
 * beautifully.
 *
 * @param {object} roll keys: pitches
 * @param {string} orientation 'horizontal' | 'vertical'
 * @param {string} side one of KEY_SIDES
 * @returns {object} keys: vertical (bool, the STRIP's long axis), edge, tilt (bool),
 *                   pitch_of_lane (function)
 */
function keys_geometry(roll, orientation, side) {
	var tilt = side === 'tilt';
	var at_start = side !== 'end';

	if (orientation === 'vertical') {
		//pitch runs left to right across the roll; the strip lies horizontal, above or below
		return {
			vertical: false,
			edge: at_start ? 'top' : 'bottom',
			tilt: tilt,
			pitch_of_lane: function (lane) {
				return lane >= 0 && lane < roll.pitches ? lane : null;
			},
		};
	}

	//horizontal roll: pitch climbs up the rows; the strip stands vertical, left or right
	return {
		vertical: true,
		edge: at_start ? 'left' : 'right',
		tilt: tilt,
		pitch_of_lane: function (lane) {
			//screen lane 0 is the TOP of the strip, which is the highest pitch
			return lane >= 0 && lane < roll.pitches ? (roll.pitches - 1 - lane) : null;
		},
	};
}

export {DEFAULT_ROLL, MAX_STEPS, MAX_PITCHES, BASE_NOTE, STEPS_PER_BAR, BAR_CHOICES,
	KEY_SIDES, KEY_DEPTH,
	roll_dimensions, rotate_pixels, pixel_to_note, resolve_roll, roll_from_bars, step_seconds,
	key_guides, notes_at_step, keys_geometry};
