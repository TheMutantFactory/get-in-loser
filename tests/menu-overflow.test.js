import {
	MENU_BAR_SLACK,
	menu_bar_split,
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

describe('menu_bar_split', () => {
	/* the real bar: eleven menus, More is wider than most of them */
	const MENUS = [37, 38, 40, 44, 40, 41, 63, 41, 45, 41, 40];
	const MORE = 58;
	const ALL = MENUS.reduce((a, b) => a + b, 0); // 470

	const shown = (available) => menu_bar_split(MENUS, available, MORE);

	test('a desktop bar shows every menu and no More', () => {
		expect(shown(1180)).toBe(MENUS.length);
	});

	test('exactly wide enough, plus the slack, still shows them all', () => {
		expect(shown(ALL + MENU_BAR_SLACK)).toBe(MENUS.length);
	});

	test('one pixel short collapses rather than clipping', () => {
		expect(shown(ALL + MENU_BAR_SLACK - 1)).toBeLessThan(MENUS.length);
	});

	test('a portrait phone keeps the first few and collapses the rest', () => {
		//275px between the hamburgers, 1px of slack: the first five total 199
		//and 199 + 58 More = 257 fits inside 274; a sixth would make 240 + 58
		//= 298, which does not
		expect(shown(275)).toBe(5);
	});

	test('what it keeps always fits beside More', () => {
		for (let available = 0; available <= 1200; available += 7) {
			const count = shown(available);
			if (count === MENUS.length || count === 0) {
				//0 is the give-up case: More alone is shown and the bar scrolls
				continue;
			}
			const used = MENUS.slice(0, count).reduce((a, b) => a + b, 0) + MORE;
			expect(used).toBeLessThanOrEqual(available - MENU_BAR_SLACK);
		}
	});

	test('it never keeps fewer menus as the bar grows', () => {
		let previous = 0;
		for (let available = 0; available <= 1200; available += 3) {
			const count = shown(available);
			expect(count).toBeGreaterThanOrEqual(previous);
			previous = count;
		}
	});

	test('too narrow for even one menu leaves a bar of just More', () => {
		expect(shown(60)).toBe(0);
		expect(shown(0)).toBe(0);
	});

	test('a negative width does not go below zero', () => {
		expect(shown(-500)).toBe(0);
	});

	test('no menus at all is no menus', () => {
		expect(menu_bar_split([], 800, MORE)).toBe(0);
		expect(menu_bar_split(null, 800, MORE)).toBe(0);
	});

	test('an unmeasurable bar is left alone rather than collapsed', () => {
		//a hidden or zero-width container must not stampede everything into More
		expect(menu_bar_split(MENUS, NaN, MORE)).toBe(MENUS.length);
		expect(menu_bar_split(MENUS, Infinity, MORE)).toBe(MENUS.length);
	});

	test('a free More still splits on the menus themselves', () => {
		expect(menu_bar_split(MENUS, 200, 0)).toBe(5); // 37+38+40+44+40 = 199
	});
});
