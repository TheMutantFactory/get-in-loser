/**
 * The rule these all serve: in pixel mode a pixel is painted or it is not. Anything that can
 * produce a fractional coordinate here becomes partial alpha on the canvas, which is exactly what
 * the brush and eraser were reported for.
 */
import {
	MIN_NIB,
	MAX_LINE_PIXELS,
	snap,
	nib_origin,
	line_pixels,
	stroke_nibs,
} from '../src/js/core/pixel-paint.js';

describe('snap', () => {
	test('takes the pixel a coordinate falls inside', () => {
		//a canvas pixel spans [n, n+1), so 3.0 through 3.9 are all pixel 3
		expect(snap(3)).toBe(3);
		expect(snap(3.1)).toBe(3);
		expect(snap(3.9)).toBe(3);
		expect(snap(4)).toBe(4);
	});

	test('floors rather than rounds, so strokes are not shifted half a pixel', () => {
		//Math.round(3.7) would be 4 - down and right of where the pointer actually is
		expect(snap(3.7)).toBe(3);
		expect(snap(3.5)).toBe(3);
	});

	test('handles negatives without jumping toward zero', () => {
		expect(snap(-0.5)).toBe(-1);
		expect(snap(-3.2)).toBe(-4);
	});
});

describe('nib_origin', () => {
	test('always lands on whole pixels', () => {
		for (const size of [1, 2, 3, 4, 7, 30]) {
			const nib = nib_origin(10.7, 4.2, size);

			expect(Number.isInteger(nib.x)).toBe(true);
			expect(Number.isInteger(nib.y)).toBe(true);
			expect(Number.isInteger(nib.size)).toBe(true);
		}
	});

	test('a 1px nib is exactly the pixel under the pointer', () => {
		expect(nib_origin(10.7, 4.2, 1)).toEqual({x: 10, y: 4, size: 1});
	});

	test('odd sizes centre on the pointer', () => {
		expect(nib_origin(10, 10, 3)).toEqual({x: 9, y: 9, size: 3});
		expect(nib_origin(10, 10, 5)).toEqual({x: 8, y: 8, size: 5});
	});

	test('even sizes lean the same way every time', () => {
		//they cannot be centred exactly; consistency is what matters
		expect(nib_origin(10, 10, 2)).toEqual({x: 10, y: 10, size: 2});
		expect(nib_origin(10, 10, 4)).toEqual({x: 9, y: 9, size: 4});
	});

	test('never produces a nib that paints nothing', () => {
		for (const size of [0, -5, 0.2, null, undefined, NaN]) {
			expect(nib_origin(5, 5, size).size).toBeGreaterThanOrEqual(MIN_NIB);
		}
	});

	test('a fractional size becomes a whole number of pixels', () => {
		expect(nib_origin(5, 5, 3.4).size).toBe(3);
		expect(nib_origin(5, 5, 3.6).size).toBe(4);
	});
});

describe('line_pixels', () => {
	const key = (p) => `${p.x},${p.y}`;

	test('a zero length line is one pixel, not none', () => {
		expect(line_pixels(4, 4, 4, 4)).toEqual([{x: 4, y: 4}]);
	});

	test('includes both endpoints', () => {
		const line = line_pixels(0, 0, 5, 0);

		expect(line[0]).toEqual({x: 0, y: 0});
		expect(line[line.length - 1]).toEqual({x: 5, y: 0});
	});

	test.each([
		['horizontal', 0, 0, 6, 0],
		['vertical', 0, 0, 0, 6],
		['diagonal', 0, 0, 6, 6],
		['shallow', 0, 0, 9, 2],
		['steep', 0, 0, 2, 9],
		['backwards', 9, 7, 1, 2],
	])('%s lines are CONNECTED - a fast stroke has no holes', (_name, x0, y0, x1, y1) => {
		const line = line_pixels(x0, y0, x1, y1);

		for (let i = 1; i < line.length; i++) {
			const dx = Math.abs(line[i].x - line[i - 1].x);
			const dy = Math.abs(line[i].y - line[i - 1].y);

			//every step touches the previous pixel
			expect(dx).toBeLessThanOrEqual(1);
			expect(dy).toBeLessThanOrEqual(1);
			expect(dx + dy).toBeGreaterThan(0);
		}
	});

	test('never plots the same pixel twice', () => {
		const line = line_pixels(0, 0, 17, 6);

		expect(new Set(line.map(key)).size).toBe(line.length);
	});

	test('covers the same pixels drawn either direction', () => {
		const forward = line_pixels(2, 3, 11, 8).map(key).sort();
		const backward = line_pixels(11, 8, 2, 3).map(key).sort();

		expect(forward).toEqual(backward);
	});

	test('every pixel is a whole pixel', () => {
		for (const p of line_pixels(0.3, 0.8, 9.7, 4.2)) {
			expect(Number.isInteger(p.x)).toBe(true);
			expect(Number.isInteger(p.y)).toBe(true);
		}
	});

	test('a long line is capped rather than eating the frame', () => {
		expect(line_pixels(0, 0, 1e9, 1e9).length).toBe(MAX_LINE_PIXELS);
		expect(line_pixels(0, 0, 100, 0, 10).length).toBe(10);
	});

	test('refuses a nonsense coordinate instead of looping forever', () => {
		expect(line_pixels(0, 0, Infinity, 0)).toEqual([]);
		expect(line_pixels(NaN, 0, 5, 5)).toEqual([]);
	});
});

describe('stroke_nibs', () => {
	test('one nib per pixel along the line', () => {
		const nibs = stroke_nibs(0, 0, 5, 0, 1);

		expect(nibs.length).toBe(6);
		expect(nibs[0]).toEqual({x: 0, y: 0, size: 1});
		expect(nibs[5]).toEqual({x: 5, y: 0, size: 1});
	});

	test('a wider nib keeps whole-pixel corners', () => {
		for (const nib of stroke_nibs(0.4, 0.6, 7.2, 3.9, 4)) {
			expect(Number.isInteger(nib.x)).toBe(true);
			expect(Number.isInteger(nib.y)).toBe(true);
			expect(nib.size).toBe(4);
		}
	});

	test('a stroke that does not move still paints', () => {
		//a single click must leave a mark
		expect(stroke_nibs(3, 3, 3, 3, 1)).toEqual([{x: 3, y: 3, size: 1}]);
	});
});
