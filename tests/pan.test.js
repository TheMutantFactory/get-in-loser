import {
	MIDDLE_BUTTON,
	PAN_TARGETS,
	is_pan_start,
	is_pan_released,
	pan_delta,
} from '../src/js/core/pan.js';

const on = (id, button = MIDDLE_BUTTON) => ({button, target: {id}});

describe('is_pan_start', () => {
	test.each(PAN_TARGETS)('starts a pan on the middle button over #%s', (id) => {
		expect(is_pan_start(on(id))).toBe(true);
	});

	test('ignores the left and right buttons', () => {
		expect(is_pan_start(on('canvas_minipaint', 0))).toBe(false);
		expect(is_pan_start(on('canvas_minipaint', 2))).toBe(false);
	});

	test('ignores middle clicks outside the drawing area', () => {
		expect(is_pan_start(on('canvas_preview'))).toBe(false);
		expect(is_pan_start(on('color_hex'))).toBe(false);
		expect(is_pan_start(on('sidebar_right'))).toBe(false);
	});

	test('survives a missing event or target', () => {
		expect(is_pan_start(null)).toBe(false);
		expect(is_pan_start({button: MIDDLE_BUTTON, target: null})).toBe(false);
		expect(is_pan_start({})).toBe(false);
	});

	test('honours a custom target list', () => {
		expect(is_pan_start(on('somewhere_else'), ['somewhere_else'])).toBe(true);
		expect(is_pan_start(on('canvas_minipaint'), ['somewhere_else'])).toBe(false);
	});
});

describe('is_pan_released', () => {
	test('middle button still held', () => {
		expect(is_pan_released({buttons: 4})).toBe(false);
		//middle plus left
		expect(is_pan_released({buttons: 5})).toBe(false);
	});

	test('middle button let go', () => {
		expect(is_pan_released({buttons: 0})).toBe(true);
		//left button only - the middle one was released
		expect(is_pan_released({buttons: 1})).toBe(true);
	});

	test('keeps panning when the event says nothing', () => {
		expect(is_pan_released({})).toBe(false);
		expect(is_pan_released(null)).toBe(false);
	});
});

describe('pan_delta', () => {
	test('reports movement in screen pixels', () => {
		expect(pan_delta({x: 10, y: 10}, {x: 25, y: 4})).toEqual({x: 15, y: -6});
	});

	test('is zero when the pointer has not moved', () => {
		expect(pan_delta({x: 3, y: 7}, {x: 3, y: 7})).toEqual({x: 0, y: 0});
	});

	test('drag direction matches image movement', () => {
		//dragging right must move the image right, so the delta stays positive
		expect(pan_delta({x: 0, y: 0}, {x: 40, y: 0}).x).toBeGreaterThan(0);
		expect(pan_delta({x: 0, y: 0}, {x: 0, y: 40}).y).toBeGreaterThan(0);
	});

	test('survives missing positions', () => {
		expect(pan_delta(null, {x: 1, y: 1})).toEqual({x: 0, y: 0});
		expect(pan_delta({x: 1, y: 1}, null)).toEqual({x: 0, y: 0});
	});
});
