import {
	PREVIEW_BOX,
	calc_preview_size,
	calc_preview_scale,
	calc_active_zone,
	calc_zoom_position,
} from '../src/js/core/gui/preview-geometry.js';

/**
 * A preview that is 1px off because of integer rounding is fine, a preview
 * that is stretched is not. Allow the aspect ratio to drift by no more than
 * what a single pixel of rounding on the smaller axis can explain.
 */
function assert_aspect_preserved(image_w, image_h, preview) {
	const expected = image_w / image_h;
	const actual = preview.w / preview.h;
	const tolerance = expected * (1 / Math.min(preview.w, preview.h));

	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

describe('calc_preview_size', () => {
	const cases = [
		['16x24 pixel art', 16, 24],
		['square', 512, 512],
		['landscape 1920x1080', 1920, 1080],
		['portrait 1080x1920', 1080, 1920],
		['very wide banner', 2000, 100],
		['very tall strip', 100, 2000],
		['odd dimensions', 333, 197],
		['tiny image', 1, 3],
		['huge image', 8000, 6000],
	];

	test.each(cases)('%s keeps the canvas aspect ratio', (_name, w, h) => {
		assert_aspect_preserved(w, h, calc_preview_size(w, h));
	});

	test.each(cases)('%s fits inside the preview box', (_name, w, h) => {
		const preview = calc_preview_size(w, h);

		expect(preview.w).toBeLessThanOrEqual(PREVIEW_BOX.w);
		expect(preview.h).toBeLessThanOrEqual(PREVIEW_BOX.h);
		expect(preview.w).toBeGreaterThanOrEqual(1);
		expect(preview.h).toBeGreaterThanOrEqual(1);
	});

	test.each(cases)('%s touches at least one edge of the box', (_name, w, h) => {
		const preview = calc_preview_size(w, h);
		const fills_width = preview.w === PREVIEW_BOX.w;
		const fills_height = preview.h === PREVIEW_BOX.h;

		expect(fills_width || fills_height).toBe(true);
	});

	test('16x24 image gets a portrait preview, not a landscape one', () => {
		const preview = calc_preview_size(16, 24);

		expect(preview.h).toBeGreaterThan(preview.w);
		expect(preview).toEqual({w: 117, h: 176});
	});

	test('this is the bug: the old fixed 176x100 preview distorted a 16x24 image', () => {
		const old_preview = {w: 176, h: 100};
		const old_scale = {x: old_preview.w / 16, y: old_preview.h / 24};

		//old behaviour stretched the image ~2.6x wider than tall
		expect(old_scale.x / old_scale.y).toBeCloseTo(2.64, 2);

		const preview = calc_preview_size(16, 24);
		const scale = calc_preview_scale(16, 24, preview);

		expect(scale.x).toBe(scale.y);
	});

	test('honours a custom box', () => {
		expect(calc_preview_size(100, 50, {w: 50, h: 50})).toEqual({w: 50, h: 25});
		expect(calc_preview_size(50, 100, {w: 50, h: 50})).toEqual({w: 25, h: 50});
	});

	test('falls back to the box for missing dimensions', () => {
		expect(calc_preview_size(0, 24)).toEqual({w: PREVIEW_BOX.w, h: PREVIEW_BOX.h});
		expect(calc_preview_size(null, null)).toEqual({w: PREVIEW_BOX.w, h: PREVIEW_BOX.h});
	});
});

describe('calc_preview_scale', () => {
	test('is uniform on both axes for every aspect ratio', () => {
		for (const [w, h] of [[16, 24], [1920, 1080], [333, 197], [1, 1]]) {
			const scale = calc_preview_scale(w, h, calc_preview_size(w, h));

			expect(scale.x).toBe(scale.y);
		}
	});

	test('maps the whole image inside the preview canvas', () => {
		const image = {w: 16, h: 24};
		const preview = calc_preview_size(image.w, image.h);
		const scale = calc_preview_scale(image.w, image.h, preview);

		expect(image.w * scale.x).toBeLessThanOrEqual(preview.w + 0.5);
		expect(image.h * scale.y).toBeLessThanOrEqual(preview.h + 0.5);
	});
});

describe('calc_active_zone', () => {
	const base = {
		image_width: 16,
		image_height: 24,
		preview_width: 117,
		preview_height: 176,
		visible_width: 160,
		visible_height: 240,
		zoom: 10,
		world_x: 0,
		world_y: 0,
	};

	test('returns null when the whole image is visible', () => {
		expect(calc_active_zone({...base, zoom: 1, visible_width: 16, visible_height: 24})).toBe(null);
	});

	test('active zone has the same aspect ratio as the visible viewport', () => {
		const zone = calc_active_zone({
			...base,
			zoom: 20,
			visible_width: 160,
			visible_height: 240,
			world_x: 2,
			world_y: 3,
		});

		//viewport shows 8x12 image pixels -> preview rect should match that ratio
		const preview_scale = base.preview_width / base.image_width;

		expect(zone.w).toBeCloseTo(8 * preview_scale, 5);
		expect(zone.h).toBeCloseTo(12 * (base.preview_height / base.image_height), 5);
	});

	test('stays inside the preview canvas', () => {
		const zone = calc_active_zone({...base, world_x: 15, world_y: 23});

		expect(zone.x).toBeGreaterThanOrEqual(0);
		expect(zone.y).toBeGreaterThanOrEqual(0);
		expect(zone.x + zone.w).toBeLessThanOrEqual(base.preview_width);
		expect(zone.y + zone.h).toBeLessThanOrEqual(base.preview_height);
	});

	test('returns null for an unusable state', () => {
		expect(calc_active_zone({...base, image_width: 0})).toBe(null);
		expect(calc_active_zone({...base, zoom: 0})).toBe(null);
	});
});

describe('calc_zoom_position', () => {
	test('clicking the preview centre centres the viewport on the image', () => {
		const image = {w: 16, h: 24};
		const preview = calc_preview_size(image.w, image.h);
		const zoom = 10;
		const visible = {w: 80, h: 120};

		const pos = calc_zoom_position({
			mouse_x: preview.w / 2,
			mouse_y: preview.h / 2,
			image_width: image.w,
			image_height: image.h,
			preview_width: preview.w,
			preview_height: preview.h,
			visible_width: visible.w,
			visible_height: visible.h,
			zoom,
		});

		//viewport covers 8x12 image pixels, centred on 8,12 -> starts at 4,6
		expect(pos.x).toBeCloseTo(4, 5);
		expect(pos.y).toBeCloseTo(6, 5);
	});
});
