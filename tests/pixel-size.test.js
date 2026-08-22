/**
 * Pixel mode sizes are always plain pixels - these tests pin that down, since
 * the regular canvas dialogs convert through units and resolution.
 */
import {
	MAX_PIXEL_SIZE,
	PIXEL_PRESETS,
	get_preset_labels,
	parse_preset,
	resolve_size,
} from '../src/js/libs/pixel-size.js';

const presets = [
	[16, 24, 'tall sprite'],
	[16, 16, 'icon'],
	[32, 32, 'sprite'],
];

describe('PIXEL_PRESETS', () => {
	test('offers 16x24 first - the size this editor is built around', () => {
		expect(PIXEL_PRESETS[0].slice(0, 2)).toEqual([16, 24]);
	});

	test('every preset is a whole number of pixels with a label', () => {
		for (const [w, h, label] of PIXEL_PRESETS) {
			expect(Number.isInteger(w) && w > 0).toBe(true);
			expect(Number.isInteger(h) && h > 0).toBe(true);
			expect(typeof label).toBe('string');
		}
	});

	test('every preset label round trips through parse_preset', () => {
		for (const [w, h] of PIXEL_PRESETS) {
			const label = get_preset_labels().find((l) => l.startsWith(`${w}x${h} `));

			expect(parse_preset(label)).toEqual({w, h});
		}
	});
});

describe('get_preset_labels', () => {
	test('offers Custom first, then every preset', () => {
		expect(get_preset_labels(presets)).toEqual([
			'Custom',
			'16x24 - tall sprite',
			'16x16 - icon',
			'32x32 - sprite',
		]);
	});
});

describe('parse_preset', () => {
	test('reads dimensions out of a label', () => {
		expect(parse_preset('16x24 - tall sprite')).toEqual({w: 16, h: 24});
		expect(parse_preset('256x240 - NES screen')).toEqual({w: 256, h: 240});
	});

	test('returns null for Custom and junk', () => {
		expect(parse_preset('Custom')).toBe(null);
		expect(parse_preset(undefined)).toBe(null);
		expect(parse_preset('nonsense')).toBe(null);
	});
});

describe('resolve_size', () => {
	test('uses the typed values when the preset is Custom', () => {
		expect(resolve_size({width: 16, height: 24, preset: 'Custom'})).toEqual({w: 16, h: 24});
	});

	test('takes plain pixels with no unit conversion', () => {
		//1 inch at 72dpi would be 72px - pixel mode must not do that
		expect(resolve_size({width: '1', height: '1', preset: 'Custom'})).toEqual({w: 1, h: 1});
	});

	test('a chosen preset wins over the typed values', () => {
		expect(resolve_size({width: 999, height: 999, preset: '16x24 - tall sprite'}))
			.toEqual({w: 16, h: 24});
	});

	test('truncates fractional input to whole pixels', () => {
		expect(resolve_size({width: '16.9', height: '24.2'})).toEqual({w: 16, h: 24});
	});

	test('rejects sizes below one pixel', () => {
		expect(resolve_size({width: 0, height: 24})).toBe(null);
		expect(resolve_size({width: -5, height: 24})).toBe(null);
		expect(resolve_size({width: 'abc', height: 24})).toBe(null);
		expect(resolve_size({})).toBe(null);
	});

	test('caps absurd sizes instead of hanging the browser', () => {
		expect(resolve_size({width: 999999, height: 999999}))
			.toEqual({w: MAX_PIXEL_SIZE, h: MAX_PIXEL_SIZE});
	});
});
