/**
 * Feathering is judged on one thing: does the softened edge keep the colour it should have. The
 * dark-halo test below is the whole reason this is not three lines of "blur the alpha".
 */
import {MAX_RADIUS, feather_pixels} from '../src/js/core/feather.js';

/** an opaque square of one colour, on a fully transparent field whose RGB is black */
const square = (w, h, x0, y0, x1, y1, colour) => {
	const data = new Uint8ClampedArray(w * h * 4);
	for (let y = y0; y < y1; y++)
		for (let x = x0; x < x1; x++) {
			const i = (y * w + x) * 4;
			data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2]; data[i + 3] = 255;
		}
	return data;
};
const at = (data, w, x, y) => {
	const i = (y * w + x) * 4;
	return {r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3]};
};

const WHITE = [255, 255, 255];
const W = 32, H = 32;

describe('feather_pixels', () => {
	test('a radius of zero changes nothing', () => {
		const src = square(W, H, 8, 8, 24, 24, WHITE);
		expect(Array.from(feather_pixels(src, W, H, {radius: 0}))).toEqual(Array.from(src));
	});

	test('returns a copy, never the array it was handed', () => {
		const src = square(W, H, 8, 8, 24, 24, WHITE);
		const out = feather_pixels(src, W, H, {radius: 4});
		expect(out).not.toBe(src);
		//the source is untouched, so a live preview can re-run from it
		expect(at(src, W, 8, 16).a).toBe(255);
	});

	test('the interior stays fully opaque', () => {
		//THE RADIUS MUST NOT REACH THE MIDDLE. This caught the blur spending three box passes of the
		//full radius and so reaching three times as far as asked - a 16px square feathered by 3 came
		//back with its centre at 248, dimming the shape instead of only its edge.
		const out = feather_pixels(square(W, H, 8, 8, 24, 24, WHITE), W, H, {radius: 3});
		expect(at(out, W, 16, 16).a).toBe(255);
	});

	test('the edge becomes a ramp rather than a cliff', () => {
		const out = feather_pixels(square(W, H, 8, 8, 24, 24, WHITE), W, H, {radius: 4});
		//ACROSS the top edge, not along it: walking inward, alpha must rise and never fall
		let previous = -1;
		for (let y = 2; y <= 14; y++) {
			const a = at(out, W, 16, y).a;
			expect(a).toBeGreaterThanOrEqual(previous);
			previous = a;
		}
		//it must actually arrive: transparent well outside, solid well inside
		expect(at(out, W, 16, 2).a).toBe(0);
		expect(at(out, W, 16, 14).a).toBe(255);
		//and the crossing is gradual rather than one step from nothing to everything
		const partial = [];
		for (let y = 2; y <= 14; y++) {
			const a = at(out, W, 16, y).a;
			if (a > 0 && a < 255) partial.push(a);
		}
		expect(partial.length).toBeGreaterThanOrEqual(4);
	});

	test('the ramp is about as wide as the radius asked for', () => {
		//the number in the dialog has to mean pixels, or it is a dimensionless fiddle knob
		const src = square(W, H, 8, 8, 24, 24, WHITE);
		const ramp_width = (r) => {
			const out = feather_pixels(src, W, H, {radius: r});
			let count = 0;
			for (let y = 0; y < 16; y++) {
				const a = at(out, W, 16, y).a;
				if (a > 0 && a < 255) count++;
			}
			return count;
		};
		//spread across the boundary is radius either way, so about 2r - allow the blur its tails
		for (const r of [2, 4, 6]) {
			expect(ramp_width(r)).toBeGreaterThanOrEqual(r);
			expect(ramp_width(r)).toBeLessThanOrEqual(r * 3);
		}
	});

	test('NO DARK HALO - the softened edge keeps the shape colour', () => {
		//the failure this guards: transparent pixels are black, and blurring alpha alone lets that
		//black become visible, so a white cutout comes back with a grey rim
		const out = feather_pixels(square(W, H, 8, 8, 24, 24, WHITE), W, H, {radius: 4});

		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const p = at(out, W, x, y);
				if (p.a > 8) {
					//anywhere with real coverage must still be white, not a grey blend toward black
					expect(p.r).toBeGreaterThan(240);
					expect(p.g).toBeGreaterThan(240);
					expect(p.b).toBeGreaterThan(240);
				}
			}
	});

	test('IT IS AN ALPHA OPERATION - detail inside the shape is not smudged', () => {
		//caught in the browser: a red square with a blue panel in it came back with the red/blue
		//boundary blurred, nowhere near an edge. Feathering softens coverage, not the picture.
		const src = square(W, H, 6, 6, 26, 26, [220, 40, 40]);
		for (let y = 12; y < 20; y++)
			for (let x = 12; x < 20; x++) {
				const i = (y * W + x) * 4;
				src[i] = 40; src[i + 1] = 80; src[i + 2] = 200; src[i + 3] = 255;
			}
		const out = feather_pixels(src, W, H, {radius: 4});

		//the interior boundary must be exactly where it was, with no blend between the two colours
		expect(at(out, W, 12, 16)).toEqual({r: 40, g: 80, b: 200, a: 255});
		expect(at(out, W, 11, 16)).toEqual({r: 220, g: 40, b: 40, a: 255});
		//and every fully opaque pixel keeps its exact colour
		for (let y = 10; y < 22; y++)
			for (let x = 10; x < 22; x++) {
				const p = at(out, W, x, y);
				if (p.a === 255) expect([p.r, p.g, p.b]).toEqual(
					(x >= 12 && x < 20 && y >= 12 && y < 20) ? [40, 80, 200] : [220, 40, 40]);
			}
	});

	test('a fully transparent image stays fully transparent', () => {
		const empty = new Uint8ClampedArray(W * H * 4);
		const out = feather_pixels(empty, W, H, {radius: 5});
		expect(Array.from(out).every((v) => v === 0)).toBe(true);
	});

	test('a fully opaque image is unchanged - there is no edge to soften', () => {
		const full = square(W, H, 0, 0, W, H, WHITE);
		const out = feather_pixels(full, W, H, {radius: 4});
		for (let i = 3; i < out.length; i += 4) expect(out[i]).toBe(255);
	});

	test('inside_only keeps the shape from growing', () => {
		const src = square(W, H, 8, 8, 24, 24, WHITE);
		const spread = feather_pixels(src, W, H, {radius: 4});
		const inward = feather_pixels(src, W, H, {radius: 4, inside_only: true});

		//outside the original square the spreading version gains coverage and the inward one cannot
		expect(at(spread, W, 6, 16).a).toBeGreaterThan(0);
		expect(at(inward, W, 6, 16).a).toBe(0);
		//and inward still softens the edge it kept
		expect(at(inward, W, 8, 16).a).toBeLessThan(255);
	});

	test('a bigger radius softens further', () => {
		const src = square(W, H, 8, 8, 24, 24, WHITE);
		const reach = (r) => {
			const out = feather_pixels(src, W, H, {radius: r});
			let count = 0;
			for (let x = 0; x < 8; x++) if (at(out, W, x, 16).a > 0) count++;
			return count;
		};
		expect(reach(6)).toBeGreaterThan(reach(2));
	});

	test('survives junk without throwing or returning NaN', () => {
		const src = square(8, 8, 2, 2, 6, 6, WHITE);
		for (const opts of [{}, {radius: -5}, {radius: 'x'}, {radius: 1e6}, null]) {
			const out = feather_pixels(src, 8, 8, opts);
			expect(out.length).toBe(src.length);
			expect(Array.from(out).every((v) => Number.isFinite(v))).toBe(true);
		}
		expect(feather_pixels(new Uint8ClampedArray(0), 0, 0, {radius: 4}).length).toBe(0);
	});

	test('the radius is capped rather than trusted', () => {
		const src = square(16, 16, 4, 4, 12, 12, WHITE);
		expect(() => feather_pixels(src, 16, 16, {radius: MAX_RADIUS * 100})).not.toThrow();
	});
});
