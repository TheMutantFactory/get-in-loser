/**
 * Three failures put this file's shape where it is, and each has a test named after it:
 * the tool could INVERT and delete the subject, it could LEAK down an anti-aliased edge, and its
 * mask was binary so every edge came out a staircase. Plus the property that defines the tool at
 * all: a background-coloured region enclosed by the subject is not background.
 */
import {
	MAX_TOLERANCE,
	color_distance,
	cluster_colors,
	border_samples,
	background_clusters,
	protected_region,
	remove_background,
} from '../src/js/core/background-removal.js';

const W = 64, H = 64;

const blank = (w, h) => new Uint8ClampedArray(w * h * 4);
const put = (d, w, x, y, c) => {
	const i = (y * w + x) * 4;
	d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c.length > 3 ? c[3] : 255;
};
const alpha = (d, x, y, w = W) => d[(y * w + x) * 4 + 3];
const rgb = (d, x, y, w = W) => [d[(y * w + x) * 4], d[(y * w + x) * 4 + 1], d[(y * w + x) * 4 + 2]];

const fill = (d, w, h, c) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(d, w, x, y, c); };

const BLUE = [40, 80, 200];
const RED = [220, 40, 40];
const SKIN = [208, 186, 166];
const WALL = [200, 205, 215];

/** a red ring on blue: hollow, so its middle is blue the flood can never legitimately reach */
const ring = () => {
	const d = blank(W, H);
	fill(d, W, H, BLUE);
	for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) put(d, W, x, y, RED);
	for (let y = 24; y < 40; y++) for (let x = 24; x < 40; x++) put(d, W, x, y, BLUE);
	return d;
};

/** a disc with a genuinely anti-aliased edge, blended against the background */
const soft_disc = (bg, fg, cx = 32, cy = 32, r = 18) => {
	const d = blank(W, H);
	fill(d, W, H, bg);
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			let hits = 0;
			for (let sy = 0; sy < 4; sy++)
				for (let sx = 0; sx < 4; sx++)
					if ((x + sx / 4 - cx) ** 2 + (y + sy / 4 - cy) ** 2 <= r * r) hits++;
			const a = hits / 16;
			if (a > 0) put(d, W, x, y, [
				bg[0] * (1 - a) + fg[0] * a, bg[1] * (1 - a) + fg[1] * a, bg[2] * (1 - a) + fg[2] * a]);
		}
	return d;
};

describe('color_distance', () => {
	test('is zero for the same colour and grows with difference', () => {
		expect(color_distance(10, 20, 30, 10, 20, 30)).toBe(0);
		expect(color_distance(0, 0, 0, 10, 10, 10))
			.toBeLessThan(color_distance(0, 0, 0, 60, 60, 60));
	});

	test('stays on the 0-255 scale the tolerance is quoted in', () => {
		expect(color_distance(0, 0, 0, 255, 255, 255)).toBeLessThanOrEqual(MAX_TOLERANCE);
	});
});

describe('cluster_colors', () => {
	test('separates two populations instead of averaging them', () => {
		//the mode-of-one-colour version could not do this, and a sky-over-grass border broke it
		const samples = [];
		for (let i = 0; i < 40; i++) samples.push([10, 20, 200, 1]);
		for (let i = 0; i < 40; i++) samples.push([20, 200, 30, 1]);
		const out = cluster_colors(samples, 4);

		expect(out.length).toBeGreaterThanOrEqual(2);
		expect(out.some((c) => c.b > 150)).toBe(true);
		expect(out.some((c) => c.g > 150)).toBe(true);
		//and nothing sitting uselessly between them
		expect(out.every((c) => !(c.b > 80 && c.b < 150 && c.g > 80 && c.g < 150))).toBe(true);
	});

	test('is deterministic - a live preview must not flicker as the slider moves', () => {
		const samples = [];
		for (let i = 0; i < 60; i++) samples.push([i * 3 % 256, i * 7 % 256, i * 11 % 256, 1]);
		expect(cluster_colors(samples, 4)).toEqual(cluster_colors(samples, 4));
	});

	test('nothing in, nothing out', () => {
		expect(cluster_colors([], 4)).toEqual([]);
	});
});

describe('border_samples', () => {
	test('weights the corners, which is where the background hides in a tight crop', () => {
		const d = blank(W, H);
		fill(d, W, H, WALL);
		const total = border_samples(d, W, H).reduce((s, x) => s + x[3], 0);
		//more weight than there are border pixels means some of them counted for more
		expect(total).toBeGreaterThan(4 * W - 4);
	});

	test('ignores pixels that are already transparent', () => {
		const d = blank(W, H);
		for (let x = 0; x < W; x++) put(d, W, x, 0, BLUE);
		//only the top row has any alpha at all
		expect(border_samples(d, W, H).length).toBe(W);
	});
});

describe('background_clusters', () => {
	test('a two-tone border yields both tones, not a blend of neither', () => {
		const d = blank(W, H);
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) put(d, W, x, y, y < H / 2 ? [60, 120, 230] : [70, 160, 60]);
		const out = background_clusters(d, W, H, {tolerance: 20});

		expect(out.length).toBeGreaterThanOrEqual(2);
	});

	test('always finds something rather than refusing', () => {
		const d = blank(W, H);
		fill(d, W, H, WALL);
		expect(background_clusters(d, W, H, {tolerance: 30}).length).toBeGreaterThan(0);
	});

	test('reports nothing when the whole border is already transparent', () => {
		expect(background_clusters(blank(W, H), W, H, {tolerance: 30})).toEqual([]);
	});
});

describe('protected_region', () => {
	test('finds the subject in the middle', () => {
		const d = ring();
		const kept = protected_region(d, W, H, background_clusters(d, W, H, {tolerance: 20}), 20, 10);
		expect(kept.length).toBeGreaterThan(0);
	});

	test('protects nothing on a flat image, so a flat image can still be cleared', () => {
		const d = blank(W, H);
		fill(d, W, H, WALL);
		expect(protected_region(d, W, H, background_clusters(d, W, H, {tolerance: 30}), 30, 15))
			.toEqual([]);
	});
});

describe('remove_background', () => {
	test('clears the background and leaves the subject alone', () => {
		const out = remove_background(ring(), W, H, {tolerance: 15, refine: 0});
		expect(alpha(out.data, 0, 0)).toBe(0);
		expect(alpha(out.data, 32, 18)).toBe(255);
		expect(out.removed).toBeGreaterThan(0);
	});

	test('THE POINT: a background-coloured hole enclosed by the subject survives', () => {
		//the middle of the ring is exactly the background colour but is not the background - a
		//colour-match tool takes it and leaves a window through the subject
		const out = remove_background(ring(), W, H, {tolerance: 15, refine: 0});
		expect(alpha(out.data, 32, 32)).toBe(255);
		expect(rgb(out.data, 32, 32)).toEqual(BLUE);
	});

	test('NO INVERSION: a subject that owns the border is not mistaken for the background', () => {
		//THE BUG. The old version took the commonest border colour as background. On a tight crop
		//the subject IS most of the border, so it deleted the subject and kept the wall: measured
		//100% of the subject cleared and 100% of the wall surviving.
		const d = blank(W, H);
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) put(d, W, x, y, y > 10 ? SKIN : WALL);
		const out = remove_background(d, W, H, {tolerance: 30, refine: 0});

		expect(out.background.g).toBeGreaterThan(out.background.r - 20);
		//the wall goes...
		expect(alpha(out.data, 32, 2)).toBe(0);
		//...and the subject stays
		expect(alpha(out.data, 32, 40)).toBe(255);
		expect(alpha(out.data, 2, 60)).toBe(255);
	});

	test('NO LEAK: a tolerance wide enough to cover the subject still does not eat it', () => {
		//THE BUG. Between tolerance 30 (correct) and 60 (89.5% of the subject destroyed) there was
		//no safe setting, only a lucky one. The subject here is ~42 units from the background, so a
		//tolerance of 60 nominally covers it - and it must survive anyway.
		const d = soft_disc(WALL, SKIN);
		const loose = remove_background(d, W, H, {tolerance: 60, refine: 2});

		expect(alpha(loose.data, 32, 32)).toBe(255);
		expect(alpha(loose.data, 32, 24)).toBeGreaterThan(200);
		expect(alpha(loose.data, 2, 2)).toBe(0);
		//and it says which tolerance it actually dared use
		expect(loose.tolerance_used).toBeLessThan(60);
	});

	test('NOT CHOPPY: an anti-aliased edge comes back with fractional alpha', () => {
		//THE BUG. A binary mask cannot express "this pixel is 40% subject", so every edge was a
		//staircase with a one-pixel skin.
		const out = remove_background(soft_disc(BLUE, RED), W, H, {tolerance: 25, refine: 3});

		const across = [];
		for (let y = 8; y <= 20; y++) across.push(alpha(out.data, 32, y));
		//it must rise, and never fall, on the way in
		for (let i = 1; i < across.length; i++) expect(across[i]).toBeGreaterThanOrEqual(across[i - 1]);
		expect(across[0]).toBe(0);
		expect(across[across.length - 1]).toBe(255);
		//and genuinely land in between on the way
		expect(across.filter((a) => a > 20 && a < 235).length).toBeGreaterThanOrEqual(1);

		//across the whole disc, the boundary must be a rim of fractional coverage rather than a
		//staircase - a binary mask scores near zero here however wide its one-pixel skin is
		let fractional = 0;
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const a = alpha(out.data, x, y);
				if (a > 10 && a < 245) fractional++;
			}
		expect(fractional).toBeGreaterThan(50);
	});

	test('DECONTAMINATION: edge pixels keep the subject colour, not a mix with the old background', () => {
		//a half-covered red pixel on blue is literally purple; leave it and the cutout wears a rim
		//of wherever it used to be
		const out = remove_background(soft_disc(BLUE, RED), W, H, {tolerance: 25, refine: 3});

		let checked = 0;
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const a = alpha(out.data, x, y);
				if (a > 60 && a < 250) {
					const [r, g, b] = rgb(out.data, x, y);
					//nearer red than the purple it arrived as
					expect(r).toBeGreaterThan(b);
					checked++;
				}
			}
		expect(checked).toBeGreaterThan(0);
	});

	test('a two-tone background goes in one pass', () => {
		//sky over grass, subject in front: the single-colour version could only ever take one of them
		const d = blank(W, H);
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) put(d, W, x, y, y < 30 ? [60, 120, 230] : [70, 160, 60]);
		for (let y = 20; y < 44; y++) for (let x = 24; x < 40; x++) put(d, W, x, y, RED);
		const out = remove_background(d, W, H, {tolerance: 20, refine: 0});

		expect(alpha(out.data, 2, 2)).toBe(0);
		expect(alpha(out.data, 2, 60)).toBe(0);
		expect(alpha(out.data, 32, 32)).toBe(255);
	});

	test('reaches background that wraps around the subject without a second click', () => {
		const d = blank(W, H);
		fill(d, W, H, BLUE);
		for (let y = 28; y < 36; y++) for (let x = 8; x < 56; x++) put(d, W, x, y, RED);
		const out = remove_background(d, W, H, {tolerance: 15, refine: 0});

		expect(alpha(out.data, 32, 4)).toBe(0);
		expect(alpha(out.data, 32, 60)).toBe(0);
		expect(alpha(out.data, 32, 32)).toBe(255);
	});

	test('does not modify the pixels it was handed', () => {
		const src = ring();
		const before = Array.from(src);
		remove_background(src, W, H, {tolerance: 20, refine: 3});
		expect(Array.from(src)).toEqual(before);
	});

	test('a flat image is all background, and says so rather than guessing', () => {
		//nothing distinguishes subject from background; taking the lot is the honest reading of
		//"clear what touches the outside", and undo is one keystroke away
		const d = blank(W, H);
		fill(d, W, H, RED);
		expect(remove_background(d, W, H, {tolerance: 5, refine: 0}).removed).toBe(W * H);
	});

	test('an already-transparent image is left as it is', () => {
		const out = remove_background(blank(W, H), W, H, {tolerance: 10});
		expect(out.removed).toBe(0);
		expect(out.background).toBe(null);
	});

	test('reports what it did, so the caller can say so', () => {
		const out = remove_background(ring(), W, H, {tolerance: 15, refine: 0});
		expect(out.background).toEqual({r: 40, g: 80, b: 200});
		expect(typeof out.removed).toBe('number');
		expect(out.data.length).toBe(W * H * 4);
	});

	test('survives junk without throwing', () => {
		const src = ring();
		for (const opts of [{}, null, {tolerance: -5}, {tolerance: 'x'}, {tolerance: 1e6},
			{tolerance: 10, refine: -3}, {refine: 'x'}, {refine: 1e6}]) {
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
