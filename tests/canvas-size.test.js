/**
 * A document -15 pixels wide is not a small document, it is a broken one, and it broke things a
 * long way from here: Fit divided by it, got a negative zoom, clamped to 1%, and every click on
 * the canvas mapped to somewhere off it.
 */
import {MIN_CANVAS, FALLBACK, pick_canvas_size} from '../src/js/libs/canvas-size.js';

/** the sizes the app offers, smallest first */
const PRESETS = [
	[640, 480, '480p'],
	[800, 600, 'SVGA'],
	[1024, 768, 'XGA'],
	[1280, 720, 'hdtv, 720p'],
	[1600, 1200, 'UXGA'],
	[1920, 1080, 'Full HD, 1080p'],
	[3840, 2160, '4K UHD'],
];
const pick = (w, h) => pick_canvas_size(w, h, PRESETS);

describe('pick_canvas_size', () => {
	test('THE BUG: an unmeasured window must not produce a negative document', () => {
		//autodetect runs before the layout exists, so the wrapper reports 0 - and 0 - 15 is -15
		expect(pick(0, 0)).toEqual(FALLBACK);
		expect(pick(0, 0).width).toBeGreaterThan(0);
		expect(pick(0, 0).height).toBeGreaterThan(0);
	});

	test('takes the last standard size that fits, scanning from the largest', () => {
		//the list is not ordered by area - 1280x720 is wider and shorter than 1024x768 - and the
		//scan takes the first fit from the end, which is the behaviour this has always had
		expect(pick(1300, 800)).toEqual({width: 1280, height: 720});
		expect(pick(2000, 1300)).toEqual({width: 1920, height: 1080});
		expect(pick(700, 500)).toEqual({width: 640, height: 480});
	});

	test('needs BOTH dimensions to fit, not either', () => {
		//a wide, short window must not be given a size taller than it
		expect(pick(4000, 500)).toEqual({width: 640, height: 480});
	});

	test('a genuinely small screen gets the room it has, less a margin', () => {
		expect(pick(500, 400)).toEqual({width: 485, height: 390});
	});

	test('but never smaller than something you could work on', () => {
		expect(pick(40, 40)).toEqual(FALLBACK);
		expect(pick(MIN_CANVAS + 14, MIN_CANVAS + 9)).toEqual(FALLBACK);
	});

	test('every result is a positive whole number of pixels', () => {
		for (const [w, h] of [[0, 0], [1, 1], [-100, -100], [47, 41], [500, 400], [4000, 3000],
			[NaN, NaN], [Infinity, Infinity], [1025, 639]]) {
			const size = pick(w, h);
			expect(Number.isInteger(size.width)).toBe(true);
			expect(Number.isInteger(size.height)).toBe(true);
			expect(size.width).toBeGreaterThan(0);
			expect(size.height).toBeGreaterThan(0);
		}
	});

	test('the size Fit will later divide by is never zero or negative', () => {
		//this is the property that actually matters: zoom_auto computes page / size
		for (const [w, h] of [[0, 0], [-5, -5], [10, 10], [1025, 639]]) {
			const size = pick(w, h);
			expect(1025 / size.width).toBeGreaterThan(0);
			expect(639 / size.height).toBeGreaterThan(0);
		}
	});

	test('copes with no presets at all', () => {
		expect(pick_canvas_size(0, 0, [])).toEqual(FALLBACK);
		expect(pick_canvas_size(500, 400, null)).toEqual({width: 485, height: 390});
	});
});
