/**
 * Coordinate arithmetic has been the most expensive kind of mistake in this app, so the conversions
 * are pinned down here rather than written inline and hoped for.
 */
import {MIN_STEP, add_point, to_screen, to_layer, stroke_to_marks} from '../src/js/core/scribble.js';

describe('add_point', () => {
	test('keeps points that are far enough apart', () => {
		const points = [];
		expect(add_point(points, 0, 0, 2)).toBe(true);
		expect(add_point(points, 10, 0, 2)).toBe(true);
		expect(points).toEqual([[0, 0], [10, 0]]);
	});

	test('drops points on top of the last one - a slow drag is not a thousand marks', () => {
		const points = [];
		add_point(points, 5, 5, 2);
		expect(add_point(points, 5.5, 5, 2)).toBe(false);
		expect(add_point(points, 6, 6, 2)).toBe(false);
		expect(points.length).toBe(1);
	});

	test('measures the gap diagonally, not per axis', () => {
		const points = [[0, 0]];
		//1.5 across and 1.5 down is 2.1 away, which clears a gap of 2
		expect(add_point(points, 1.5, 1.5, 2)).toBe(true);
	});

	test('has a default gap', () => {
		const points = [[0, 0]];
		add_point(points, MIN_STEP / 2, 0);
		expect(points.length).toBe(1);
	});

	test('refuses coordinates that are not numbers', () => {
		const points = [];
		expect(add_point(points, NaN, 0, 2)).toBe(false);
		expect(add_point(points, 0, Infinity, 2)).toBe(false);
		expect(points).toEqual([]);
	});
});

describe('to_screen', () => {
	test('the world point at the canvas corner lands at the corner', () => {
		expect(to_screen(40, 25, {origin_x: 40, origin_y: 25, zoom: 3})).toEqual({x: 0, y: 0});
	});

	test('scales by the zoom', () => {
		expect(to_screen(50, 45, {origin_x: 40, origin_y: 25, zoom: 2})).toEqual({x: 20, y: 40});
	});

	test('handles a scrolled view, where the corner is not the origin', () => {
		expect(to_screen(0, 0, {origin_x: 100, origin_y: 50, zoom: 1})).toEqual({x: -100, y: -50});
	});
});

describe('to_layer', () => {
	test('a layer at the origin drawn at its own size is one to one', () => {
		expect(to_layer(12, 30, {x: 0, y: 0, scale_x: 1, scale_y: 1})).toEqual({x: 12, y: 30});
	});

	test('subtracts where the layer sits', () => {
		expect(to_layer(112, 130, {x: 100, y: 100, scale_x: 1, scale_y: 1})).toEqual({x: 12, y: 30});
	});

	test('divides by how much the layer has been scaled', () => {
		//drawn at double size, so a 20px journey across the canvas is 10px into the image
		expect(to_layer(20, 20, {x: 0, y: 0, scale_x: 2, scale_y: 2})).toEqual({x: 10, y: 10});
	});

	test('survives a degenerate scale rather than returning infinity', () => {
		expect(to_layer(5, 5, {x: 0, y: 0, scale_x: 0, scale_y: 0})).toEqual({x: 5, y: 5});
	});
});

describe('stroke_to_marks', () => {
	const layer = {x: 10, y: 10, scale_x: 1, scale_y: 1, width: 64, height: 64};

	test('converts a whole stroke', () => {
		expect(stroke_to_marks([[10, 10], [20, 30]], layer)).toEqual([[0, 0], [10, 20]]);
	});

	test('keeps the part of a stroke that is on the image', () => {
		//dragging off the edge of the picture is normal and must not throw the whole stroke away
		const marks = stroke_to_marks([[5, 5], [20, 20], [200, 200]], layer);
		expect(marks).toEqual([[10, 10]]);
	});

	test('an entirely outside stroke yields nothing at all', () => {
		expect(stroke_to_marks([[500, 500], [600, 600]], layer)).toEqual([]);
	});

	test('an empty stroke is not an error', () => {
		expect(stroke_to_marks([], layer)).toEqual([]);
	});
});
