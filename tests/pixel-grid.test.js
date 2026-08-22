import {
	MIN_ZOOM,
	MAJOR_EVERY,
	should_draw_pixel_grid,
	is_major_line,
	grid_line_positions,
} from '../src/js/core/pixel-grid.js';

/** the canvas this editor is mostly used for */
const pixel_art = {pixel_mode: true, grid_enabled: true, zoom: 20, width: 16, height: 24};

describe('should_draw_pixel_grid', () => {
	test('draws for a zoomed in 16x24 canvas in pixel mode', () => {
		expect(should_draw_pixel_grid(pixel_art)).toBe(true);
	});

	test('never draws outside pixel mode', () => {
		expect(should_draw_pixel_grid({...pixel_art, pixel_mode: false})).toBe(false);
	});

	test('never draws when the grid is switched off', () => {
		expect(should_draw_pixel_grid({...pixel_art, grid_enabled: false})).toBe(false);
	});

	test('does not draw below the minimum zoom', () => {
		expect(should_draw_pixel_grid({...pixel_art, zoom: MIN_ZOOM - 0.01})).toBe(false);
		expect(should_draw_pixel_grid({...pixel_art, zoom: MIN_ZOOM})).toBe(true);
	});

	test('does not draw for canvases with too many lines', () => {
		expect(should_draw_pixel_grid({...pixel_art, width: 4000, height: 4000})).toBe(false);
		expect(should_draw_pixel_grid({...pixel_art, width: 100, height: 100, max_lines: 10})).toBe(true);
		expect(should_draw_pixel_grid({...pixel_art, width: 100, height: 100}, {max_lines: 10})).toBe(false);
	});

	test('does not draw for an unusable canvas size', () => {
		expect(should_draw_pixel_grid({...pixel_art, width: 0})).toBe(false);
		expect(should_draw_pixel_grid({...pixel_art, height: null})).toBe(false);
	});

	test('honours a custom minimum zoom', () => {
		expect(should_draw_pixel_grid({...pixel_art, zoom: 2}, {min_zoom: 2})).toBe(true);
	});
});

describe('grid_line_positions', () => {
	/** a 16x24 canvas fully visible at 20x zoom */
	const fitted = {count: 16, zoom: 20, origin: 0, screen_size: 320};

	test('puts a line between every pair of image pixels, but not on the edges', () => {
		const lines = grid_line_positions(fitted);

		expect(lines.length).toBe(15);
		expect(lines[0].index).toBe(1);
		expect(lines[lines.length - 1].index).toBe(15);
	});

	test('lines land on half pixels so they stay crisp hairlines', () => {
		for (const line of grid_line_positions(fitted)) {
			expect(line.position % 1).toBe(0.5);
		}
	});

	test('spaces lines one image pixel apart on screen', () => {
		const lines = grid_line_positions(fitted);

		for (let i = 1; i < lines.length; i++) {
			expect(lines[i].position - lines[i - 1].position).toBeCloseTo(fitted.zoom, 10);
		}
	});

	test('accounts for the scrolled origin when zoomed in', () => {
		const lines = grid_line_positions({count: 16, zoom: 20, origin: 4, screen_size: 320});

		//lines left of the visible origin are dropped, so the first one kept is
		//the boundary sitting exactly at the left edge
		expect(lines[0]).toEqual({index: 4, position: 0.5, major: false});
		expect(lines[1]).toEqual({index: 5, position: 20.5, major: false});
	});

	test('drops lines that fall outside the visible canvas', () => {
		const lines = grid_line_positions({count: 500, zoom: 20, origin: 100, screen_size: 200});

		expect(lines.length).toBeLessThan(12);
		for (const line of lines) {
			expect(line.position).toBeGreaterThanOrEqual(0);
			expect(line.position).toBeLessThanOrEqual(200);
		}
	});

	test('marks every 8th line as major', () => {
		const lines = grid_line_positions(fitted);

		expect(lines.filter((line) => line.major).map((line) => line.index)).toEqual([8]);
	});

	test('returns nothing for an unusable state', () => {
		expect(grid_line_positions({count: 0, zoom: 20, screen_size: 320})).toEqual([]);
		expect(grid_line_positions({count: 16, zoom: 0, screen_size: 320})).toEqual([]);
	});
});

describe('is_major_line', () => {
	test('marks every 8th line by default', () => {
		expect(is_major_line(8)).toBe(true);
		expect(is_major_line(16)).toBe(true);
		expect(is_major_line(7)).toBe(false);
		expect(MAJOR_EVERY).toBe(8);
	});

	test('honours a custom interval', () => {
		expect(is_major_line(4, 4)).toBe(true);
		expect(is_major_line(5, 4)).toBe(false);
	});
});
