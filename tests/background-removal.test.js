/**
 * The one thing that makes this different from Color to Alpha is CONTIGUITY: background is what
 * touches the outside, not what happens to be that colour. The enclosed-hole test is the whole
 * reason this file exists - remove it and a flood fill and a colour match are indistinguishable.
 */
import {
	MAX_TOLERANCE,
	color_distance,
	dominant_border_color,
	remove_background,
} from '../src/js/core/background-removal.js';

const W = 24, H = 24;

/** a canvas filled with `bg`, on which `paint(set)` may draw */
const image = (bg, paint, w = W, h = H) => {
	const data = new Uint8ClampedArray(w * h * 4);
	const set = (x, y, c) => {
		const i = (y * w + x) * 4;
		data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = c.length > 3 ? c[3] : 255;
	};
	for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, bg);
	if (paint) paint(set);
	return data;
};
const alpha = (data, x, y, w = W) => data[(y * w + x) * 4 + 3];

const BLUE = [40, 80, 200];
const RED = [220, 40, 40];

/** a red ring from 6,6 to 18,18 - hollow, so its middle is blue the flood can never reach */
const ring = () => image(BLUE, (set) => {
	for (let y = 6; y < 18; y++)
		for (let x = 6; x < 18; x++)
			if (y < 8 || y >= 16 || x < 8 || x >= 16) set(x, y, RED);
});

describe('color_distance', () => {
	test('is zero for the same colour and grows with difference', () => {
		expect(color_distance(10, 20, 30, 10, 20, 30)).toBe(0);
		expect(color_distance(0, 0, 0, 255, 255, 255)).toBeGreaterThan(200);
		expect(color_distance(0, 0, 0, 10, 10, 10))
			.toBeLessThan(color_distance(0, 0, 0, 60, 60, 60));
	});

	test('stays on the 0-255 scale the tolerance is quoted in', () => {
		//otherwise the slider means nothing in particular
		expect(color_distance(0, 0, 0, 255, 255, 255)).toBeLessThanOrEqual(MAX_TOLERANCE);
	});
});

describe('dominant_border_color', () => {
	test('finds the colour the border mostly is', () => {
		expect(dominant_border_color(image(BLUE), W, H)).toEqual({r: 40, g: 80, b: 200});
	});

	test('THE MODE, NOT THE MEAN - a two-tone border picks one, not a blend of both', () => {
		//averaging black and white sky gives grey, which matches neither and removes nothing
		const data = image([0, 0, 0], (set) => {
			for (let x = 0; x < W; x++) for (let y = 0; y < 3; y++) set(x, y, [255, 255, 255]);
		});
		const found = dominant_border_color(data, W, H);
		expect(found.r === 0 || found.r === 255).toBe(true);
	});

	test('ignores pixels that are already transparent', () => {
		const data = image([0, 0, 0, 0], (set) => {
			for (let x = 0; x < W; x++) set(x, 0, BLUE);
		});
		expect(dominant_border_color(data, W, H)).toEqual({r: 40, g: 80, b: 200});
	});

	test('reports nothing when the whole border is already transparent', () => {
		expect(dominant_border_color(image([9, 9, 9, 0]), W, H)).toBe(null);
	});
});

describe('remove_background', () => {
	test('clears the background and leaves the subject alone', () => {
		const out = remove_background(ring(), W, H, {tolerance: 10});
		expect(alpha(out.data, 0, 0)).toBe(0);
		expect(alpha(out.data, 12, 6)).toBe(255);
		expect(out.removed).toBeGreaterThan(0);
	});

	test('THE POINT: a background-coloured hole enclosed by the subject survives', () => {
		//the middle of the ring is exactly the background colour but is not the background - a
		//colour-match tool takes it and leaves a window through the subject
		const out = remove_background(ring(), W, H, {tolerance: 10});
		expect(alpha(out.data, 12, 12)).toBe(255);
		//...and it is genuinely the same colour, so the test is testing what it claims to
		const i = (12 * W + 12) * 4;
		expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual(BLUE);
	});

	test('reaches background that wraps around the subject without a second click', () => {
		//a bar across the middle: the flood must get to the strip below it from the sides
		const data = image(BLUE, (set) => {
			for (let x = 4; x < 20; x++) for (let y = 10; y < 14; y++) set(x, y, RED);
		});
		const out = remove_background(data, W, H, {tolerance: 10});
		expect(alpha(out.data, 12, 2)).toBe(0);
		expect(alpha(out.data, 12, 20)).toBe(0);
		expect(alpha(out.data, 12, 12)).toBe(255);
	});

	test('tolerance decides how much variation still counts as background', () => {
		//a noisy background: near-misses of the dominant colour
		const data = image(BLUE, (set) => {
			for (let y = 0; y < H; y++)
				for (let x = 0; x < W; x++)
					if ((x + y) % 2 === 0) set(x, y, [55, 95, 215]);
		});
		const strict = remove_background(data, W, H, {tolerance: 0});
		const loose = remove_background(data, W, H, {tolerance: 40});

		expect(loose.removed).toBeGreaterThan(strict.removed);
		expect(loose.removed).toBe(W * H);
	});

	test('a tolerance of zero takes only exact matches', () => {
		const data = image(BLUE, (set) => set(0, 5, [41, 80, 200]));
		const out = remove_background(data, W, H, {tolerance: 0});
		expect(alpha(out.data, 0, 5)).toBe(255);
	});

	test('soften gives the fringe partial alpha instead of a stair-step cut', () => {
		//an anti-aliased outline: one ring of half-way colour between background and subject
		const data = image(BLUE, (set) => {
			for (let y = 8; y < 16; y++)
				for (let x = 8; x < 16; x++)
					set(x, y, (y === 8 || y === 15 || x === 8 || x === 15) ? [130, 60, 120] : RED);
		});
		const hard = remove_background(data, W, H, {tolerance: 20});
		const soft = remove_background(data, W, H, {tolerance: 20, soften: 120});

		//hard keeps the fringe at full strength - the halo of old background you can see
		expect(alpha(hard.data, 12, 8)).toBe(255);
		const a = alpha(soft.data, 12, 8);
		expect(a).toBeGreaterThan(0);
		expect(a).toBeLessThan(255);
		//and softening never eats into the subject proper
		expect(alpha(soft.data, 12, 12)).toBe(255);
	});

	test('softening does not flood through the subject', () => {
		//a fringe pixel is a boundary; treat it as passable and the flood walks straight through the
		//outline and hollows the subject out from the inside
		const out = remove_background(ring(), W, H, {tolerance: 10, soften: 200});
		expect(alpha(out.data, 12, 12)).toBe(255);
	});

	test('does not modify the pixels it was handed', () => {
		const src = ring();
		const before = Array.from(src);
		remove_background(src, W, H, {tolerance: 10, soften: 40});
		expect(Array.from(src)).toEqual(before);
	});

	test('an image that is all background goes completely', () => {
		const out = remove_background(image(BLUE), W, H, {tolerance: 5});
		expect(out.removed).toBe(W * H);
	});

	test('a flat image is all background, and says so rather than guessing', () => {
		//no edge anywhere means nothing distinguishes subject from background; taking the lot is the
		//honest reading of "clear what touches the outside", and undo is one keystroke away
		const out = remove_background(image(RED), W, H, {tolerance: 0});
		expect(out.background).toEqual({r: 220, g: 40, b: 40});
		//it removes what the border is, which here is all of it - the honest answer for a flat image
		expect(out.removed).toBe(W * H);
	});

	test('an already-transparent image is left as it is', () => {
		const out = remove_background(image([0, 0, 0, 0]), W, H, {tolerance: 10});
		expect(out.removed).toBe(0);
		expect(out.background).toBe(null);
	});

	test('reports what it did, so the caller can say so', () => {
		const out = remove_background(ring(), W, H, {tolerance: 10});
		expect(out.background).toEqual({r: 40, g: 80, b: 200});
		expect(typeof out.removed).toBe('number');
		expect(out.data.length).toBe(W * H * 4);
	});

	test('survives junk without throwing', () => {
		const src = ring();
		for (const opts of [{}, null, {tolerance: -5}, {tolerance: 'x'}, {tolerance: 1e6},
			{tolerance: 10, soften: -3}, {soften: 'x'}]) {
			const out = remove_background(src, W, H, opts);
			expect(out).not.toBe(null);
			expect(Array.from(out.data).every((v) => Number.isFinite(v))).toBe(true);
		}
	});

	test('refuses sizes that do not match the data rather than reading past it', () => {
		expect(remove_background(ring(), 0, 0, {})).toBe(null);
		expect(remove_background(ring(), 1000, 1000, {})).toBe(null);
		expect(remove_background(null, W, H, {})).toBe(null);
	});

	test('a one-pixel image does not trip the border seeding', () => {
		const out = remove_background(new Uint8ClampedArray([10, 10, 10, 255]), 1, 1, {tolerance: 0});
		expect(out.removed).toBe(1);
	});
});
