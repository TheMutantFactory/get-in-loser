import {
	menu_bar_overflow,
	menu_bar_scroll_correction,
} from '../src/js/core/menu-overflow.js';

/* a portrait phone: 375px of bar over 740px of menus, 50px hamburger gutters */
const PHONE = {scroll_width: 740, client_width: 375};
const MAX_SCROLL = PHONE.scroll_width - PHONE.client_width; // 365

const bar = (overrides = {}) => ({
	left: 0,
	right: 375,
	padding_left: 50,
	padding_right: 50,
	...overrides,
});

describe('menu_bar_overflow', () => {
	test('a bar that fits hides nothing on either side', () => {
		expect(menu_bar_overflow(0, 600, 1280)).toEqual({left: false, right: false});
	});

	test('at rest, only the right edge hides menus', () => {
		expect(menu_bar_overflow(0, PHONE.scroll_width, PHONE.client_width))
			.toEqual({left: false, right: true});
	});

	test('mid scroll, both edges hide menus', () => {
		expect(menu_bar_overflow(180, PHONE.scroll_width, PHONE.client_width))
			.toEqual({left: true, right: true});
	});

	test('scrolled to the end, only the left edge hides menus', () => {
		expect(menu_bar_overflow(MAX_SCROLL, PHONE.scroll_width, PHONE.client_width))
			.toEqual({left: true, right: false});
	});

	test('a fractional resting position still counts as the end', () => {
		//browsers land on 364.5 rather than 365, which must not leave a
		//"there is more this way" chevron pointing at nothing
		expect(menu_bar_overflow(MAX_SCROLL - 0.5, PHONE.scroll_width, PHONE.client_width).right)
			.toBe(false);
		expect(menu_bar_overflow(0.5, PHONE.scroll_width, PHONE.client_width).left)
			.toBe(false);
	});

	test('content exactly the width of the bar hides nothing', () => {
		expect(menu_bar_overflow(0, 375, 375)).toEqual({left: false, right: false});
	});
});

describe('menu_bar_scroll_correction', () => {
	test('a menu already clear of both gutters does not move the bar', () => {
		expect(menu_bar_scroll_correction(bar(), {left: 120, right: 180})).toBe(0);
	});

	test('a menu tucked under the right hamburger scrolls just clear of it', () => {
		//right edge at 340, readable area ends at 325
		expect(menu_bar_scroll_correction(bar(), {left: 300, right: 340})).toBe(15);
	});

	test('a menu tucked under the left hamburger scrolls back just clear of it', () => {
		//left edge at 30, readable area starts at 50
		expect(menu_bar_scroll_correction(bar(), {left: 30, right: 90})).toBe(-20);
	});

	test('a menu flush against a gutter is already clear', () => {
		expect(menu_bar_scroll_correction(bar(), {left: 50, right: 325})).toBe(0);
	});

	test('scroll port edges are not the readable edges', () => {
		//inside the scroll port (0..375) but under a hamburger, so it moves
		expect(menu_bar_scroll_correction(bar(), {left: 330, right: 370})).toBe(45);
		expect(menu_bar_scroll_correction(bar(), {left: 5, right: 45})).toBe(-45);
	});

	test('a menu wider than the readable area aligns to its left edge', () => {
		expect(menu_bar_scroll_correction(bar(), {left: 20, right: 400})).toBe(-30);
	});

	test('gutters wider than the bar leave it alone rather than thrashing', () => {
		const narrow = bar({right: 80, padding_left: 50, padding_right: 50});
		expect(menu_bar_scroll_correction(narrow, {left: 0, right: 40})).toBe(0);
	});

	test('a desktop bar with small padding still respects it', () => {
		const desktop = bar({right: 1280, padding_left: 10, padding_right: 0});
		expect(menu_bar_scroll_correction(desktop, {left: 4, right: 60})).toBe(-6);
	});

	test('survives missing measurements', () => {
		expect(menu_bar_scroll_correction(null, {left: 0, right: 10})).toBe(0);
		expect(menu_bar_scroll_correction(bar(), null)).toBe(0);
	});
});
