import fs from 'fs';
import path from 'path';

import {
	normalize_color,
	parse_palette,
	stringify_palette,
	nearest_color,
} from '../src/js/libs/palette-parser.js';

describe('normalize_color', () => {
	test.each([
		['#1a1c2c', '#1a1c2c'],
		['1a1c2c', '#1a1c2c'],
		['#1A1C2C', '#1a1c2c'],
		['  #1a1c2c  ', '#1a1c2c'],
		['#f0f', '#ff00ff'],
		['f0f', '#ff00ff'],
		['#1a1c2cff', '#1a1c2c'],
	])('accepts the string %s', (input, expected) => {
		expect(normalize_color(input)).toBe(expected);
	});

	test('accepts rgb triplets and objects', () => {
		expect(normalize_color([26, 28, 44])).toBe('#1a1c2c');
		expect(normalize_color({r: 26, g: 28, b: 44})).toBe('#1a1c2c');
		expect(normalize_color({name: 'ink', hex: '#1a1c2c'})).toBe('#1a1c2c');
		expect(normalize_color({value: '1a1c2c'})).toBe('#1a1c2c');
	});

	test('clamps and rounds out of range rgb values', () => {
		expect(normalize_color([-20, 300, 27.6])).toBe('#00ff1c');
	});

	test.each([
		[null],
		[undefined],
		['not a color'],
		['#12345'],
		[[1, 2]],
		[{}],
		[42],
	])('rejects %p', (input) => {
		expect(normalize_color(input)).toBe(null);
	});
});

describe('parse_palette', () => {
	test('parses the canonical format', () => {
		const palette = parse_palette({
			name: 'Sweetie 16',
			author: 'GrafxKid',
			license: 'CC0',
			colors: ['#1a1c2c', '#5d275d'],
		});

		expect(palette).toEqual({
			name: 'Sweetie 16',
			author: 'GrafxKid',
			source: null,
			license: 'CC0',
			colors: ['#1a1c2c', '#5d275d'],
		});
	});

	test('parses a bare array', () => {
		expect(parse_palette(['1a1c2c', '5d275d']).colors).toEqual(['#1a1c2c', '#5d275d']);
	});

	test('parses a raw JSON string', () => {
		expect(parse_palette('{"colors":["#fff"]}').colors).toEqual(['#ffffff']);
	});

	test.each(['colors', 'colours', 'palette', 'swatches'])('accepts a "%s" key', (key) => {
		expect(parse_palette({[key]: ['#000000']}).colors).toEqual(['#000000']);
	});

	test('accepts per-colour objects and rgb triplets', () => {
		expect(parse_palette({colors: [{name: 'ink', hex: '#1a1c2c'}]}).colors).toEqual(['#1a1c2c']);
		expect(parse_palette({colors: [[26, 28, 44]]}).colors).toEqual(['#1a1c2c']);
	});

	test('skips unusable entries instead of failing', () => {
		expect(parse_palette(['#1a1c2c', 'nope', null, '#5d275d']).colors)
			.toEqual(['#1a1c2c', '#5d275d']);
	});

	test('removes duplicates, keeping the first occurrence', () => {
		expect(parse_palette(['#1a1c2c', '1A1C2C', '#5d275d']).colors)
			.toEqual(['#1a1c2c', '#5d275d']);
	});

	test('falls back to the supplied default name', () => {
		expect(parse_palette(['#000'], {name: 'my-file.json'}).name).toBe('my-file.json');
		expect(parse_palette(['#000']).name).toBe('Palette');
	});

	test('throws on invalid JSON', () => {
		expect(() => parse_palette('{oops')).toThrow('valid JSON');
	});

	test.each([
		[[]],
		[{colors: []}],
		[{colors: ['nope']}],
		[{}],
		[null],
	])('throws when %p has no usable colours', (input) => {
		expect(() => parse_palette(input)).toThrow('no usable colors');
	});
});

describe('stringify_palette', () => {
	test('round trips through parse_palette', () => {
		const original = parse_palette({
			name: 'Test',
			author: 'Someone',
			colors: ['#1a1c2c', '#5d275d'],
		});

		expect(parse_palette(stringify_palette(original))).toEqual(original);
	});

	test('omits empty metadata', () => {
		const json = JSON.parse(stringify_palette(parse_palette(['#000000'])));

		expect(Object.keys(json)).toEqual(['name', 'colors']);
	});
});

describe('nearest_color', () => {
	const palette = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];

	test.each([
		['#010101', '#000000'],
		['#fefefe', '#ffffff'],
		['#e00000', '#ff0000'],
		['#003300', '#000000'],
	])('maps %s to %s', (input, expected) => {
		expect(nearest_color(input, palette)).toBe(expected);
	});

	test('returns an exact match unchanged', () => {
		for (const hex of palette) {
			expect(nearest_color(hex, palette)).toBe(hex);
		}
	});

	test('returns null for unusable input', () => {
		expect(nearest_color('nope', palette)).toBe(null);
		expect(nearest_color('#000000', [])).toBe(null);
	});
});

describe('bundled palette files', () => {
	const dir = path.join(__dirname, '..', 'src', 'palettes');
	const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));

	test('there is at least one bundled palette', () => {
		expect(files.length).toBeGreaterThan(0);
	});

	test.each(files)('%s parses and has a name and colours', (file) => {
		const palette = parse_palette(fs.readFileSync(path.join(dir, file), 'utf8'));

		expect(palette.name).toBeTruthy();
		expect(palette.name).not.toBe('Palette');
		expect(palette.colors.length).toBeGreaterThan(0);
		for (const hex of palette.colors) {
			expect(hex).toMatch(/^#[0-9a-f]{6}$/);
		}
	});

	test('16w x 24h pixel art workflow: every palette colour survives a round trip', () => {
		for (const file of files) {
			const palette = parse_palette(fs.readFileSync(path.join(dir, file), 'utf8'));

			for (const hex of palette.colors) {
				expect(nearest_color(hex, palette.colors)).toBe(hex);
			}
		}
	});
});
