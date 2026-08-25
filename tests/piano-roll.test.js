/**
 * The roll is an image whose pixels are notes, so the mappings here are musical facts: a mirror
 * inverts every melody, and an off-by-one plays everything a semitone sharp forever.
 */
import {DEFAULT_ROLL, BASE_NOTE, roll_dimensions, rotate_pixels, pixel_to_note, resolve_roll}
	from '../src/js/core/piano-roll.js';

describe('roll_dimensions', () => {
	test('horizontal is time-wide, vertical is time-tall', () => {
		expect(roll_dimensions(DEFAULT_ROLL, 'horizontal')).toEqual({width: 64, height: 24});
		expect(roll_dimensions(DEFAULT_ROLL, 'vertical')).toEqual({width: 24, height: 64});
	});
});

describe('rotate_pixels', () => {
	const mark = (w, h, x, y) => {
		const d = new Uint8ClampedArray(w * h * 4);
		const i = (y * w + x) * 4;
		d[i] = 255; d[i + 3] = 255;
		return d;
	};
	const at = (r, x, y) => r.data[(y * r.width + x) * 4 + 3];

	test('clockwise sends the top-left to the top-right', () => {
		const r = rotate_pixels(mark(4, 3, 0, 0), 4, 3, 'cw');
		expect([r.width, r.height]).toEqual([3, 4]);
		expect(at(r, 2, 0)).toBe(255);
	});

	test('counter-clockwise sends the top-left to the bottom-left', () => {
		const r = rotate_pixels(mark(4, 3, 0, 0), 4, 3, 'ccw');
		expect(at(r, 0, 3)).toBe(255);
	});

	test('A ROTATION, NOT A MIRROR - cw then ccw is the identity', () => {
		//a mirror would invert every melody on the way through; determinant +1 or nothing
		const d = new Uint8ClampedArray(4 * 3 * 4);
		for (let i = 0; i < d.length; i++) d[i] = (i * 37) % 256;
		const there = rotate_pixels(d, 4, 3, 'cw');
		const back = rotate_pixels(there.data, there.width, there.height, 'ccw');
		expect(Array.from(back.data)).toEqual(Array.from(d));
	});

	test('four clockwise turns are the identity too', () => {
		let d = new Uint8ClampedArray(5 * 2 * 4).map((_, i) => (i * 11) % 256);
		let r = {data: d, width: 5, height: 2};
		for (let i = 0; i < 4; i++) r = rotate_pixels(r.data, r.width, r.height, 'cw');
		expect(Array.from(r.data)).toEqual(Array.from(d));
	});
});

describe('pixel_to_note', () => {
	test('horizontal: bottom row is the base note, pitch climbs upward', () => {
		expect(pixel_to_note(0, 23, DEFAULT_ROLL, 'horizontal')).toEqual({step: 0, note: BASE_NOTE});
		expect(pixel_to_note(0, 0, DEFAULT_ROLL, 'horizontal')).toEqual({step: 0, note: BASE_NOTE + 23});
		expect(pixel_to_note(63, 23, DEFAULT_ROLL, 'horizontal').step).toBe(63);
	});

	test('vertical: time runs down, pitch runs right', () => {
		expect(pixel_to_note(0, 0, DEFAULT_ROLL, 'vertical')).toEqual({step: 0, note: BASE_NOTE});
		expect(pixel_to_note(23, 5, DEFAULT_ROLL, 'vertical')).toEqual({step: 5, note: BASE_NOTE + 23});
	});

	test('the two orientations agree through the rotation', () => {
		//the SAME note painted horizontally, rotated cw, must read back as the same note
		//horizontal (x, y) -> cw -> vertical (width-1-y ... ) - assert via the maps
		const h = pixel_to_note(10, 3, DEFAULT_ROLL, 'horizontal');
		//cw: (x, y) of a 64x24 image lands at (24-1-y, x) in the 24x64 image
		const v = pixel_to_note(24 - 1 - 3, 10, DEFAULT_ROLL, 'vertical');
		expect(v).toEqual(h);
	});

	test('outside the roll is null, not a wrong note', () => {
		expect(pixel_to_note(64, 0, DEFAULT_ROLL, 'horizontal')).toBe(null);
		expect(pixel_to_note(-1, 0, DEFAULT_ROLL, 'horizontal')).toBe(null);
	});
});

describe('resolve_roll', () => {
	test('clamps to drawable sizes and refuses nonsense', () => {
		expect(resolve_roll(64, 24)).toEqual({steps: 64, pitches: 24});
		expect(resolve_roll(10000, 10000)).toEqual({steps: 512, pitches: 96});
		expect(resolve_roll('x', 24)).toBe(null);
		expect(resolve_roll(0, 24)).toBe(null);
	});
});
