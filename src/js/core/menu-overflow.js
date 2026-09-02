/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Pure helpers for the menu bar when it is too narrow for its menus, which on
 * a phone it always is - eleven top level menus want roughly 740px and a
 * portrait phone offers 275px between the two hamburgers. The bar scrolls
 * sideways instead of shrinking its items into unreadable slivers, and these
 * two decisions are what make that scroll usable:
 *
 *   - how many menus fit, so the rest can be collapsed under a "More" item
 *   - which edge still hides menus, so the bar can fade and point that way
 *   - how far to scroll so an opened menu clears the hamburgers overlaying
 *     the bar's padding gutters, instead of being sliced in half by one
 *
 * The last two are graceful degradation rather than the main event: once the
 * menus collapse under More the bar does not overflow, so the fading edges
 * stay hidden. They earn their keep in the window before the first split is
 * computed, and anywhere the recompute never arrives - a browser without
 * ResizeObserver that also swallows the resize event leaves the bar holding
 * every menu, and a bar that scrolls and says so beats one that clips its
 * labels into initials.
 *
 * See tests/menu-overflow.test.js. gui-menu.js supplies the measurements.
 */

/** fractional scroll positions never land exactly on 0 or on the maximum */
const SCROLL_EPSILON = 1;

/**
 * Breathing room, in pixels, kept between the menus and the edge of the bar.
 * Item widths are fractional and the browser rounds; without this a bar that
 * fits by a quarter of a pixel can still end up with a scrollbar.
 */
const MENU_BAR_SLACK = 1;

/**
 * How many leading menus to leave on the bar, with everything after them
 * collapsed under a "More" item.
 *
 * Returns widths.length when they all fit, meaning no More item at all -- and
 * 0 when not even the first menu fits beside More, meaning the bar becomes a
 * single More holding everything, which is still better than a row of clipped
 * initials.
 *
 * @param {array} widths each menu's rendered width, in order, in pixels
 * @param {number} available content width of the bar, padding already removed
 * @param {number} more_width rendered width of the More item
 * @returns {number} count of menus to show directly on the bar
 */
function menu_bar_split(widths, available, more_width) {
	if (!Array.isArray(widths) || widths.length === 0) {
		return 0;
	}
	if (!isFinite(available)) {
		//nothing measurable to fit into; leave the bar as it is
		return widths.length;
	}

	const budget = available - MENU_BAR_SLACK;
	let total = 0;
	for (let i = 0; i < widths.length; i++) {
		total += widths[i];
	}

	if (total <= budget) {
		return widths.length;
	}

	const more = isFinite(more_width) ? more_width : 0;
	let used = 0;
	for (let i = 0; i < widths.length; i++) {
		used += widths[i];
		if (used + more > budget) {
			//items 0..i-1 fit alongside More; this one does not
			return i;
		}
	}

	return widths.length;
}

/**
 * Which sides of a horizontally scrolling bar still have content off screen.
 *
 * @param {number} scroll_left current scrollLeft
 * @param {number} scroll_width full content width
 * @param {number} client_width visible width
 * @returns {object} keys: left, right - both booleans
 */
function menu_bar_overflow(scroll_left, scroll_width, client_width) {
	const max_scroll = scroll_width - client_width;

	if (!(max_scroll > SCROLL_EPSILON)) {
		//everything fits; neither edge hides anything
		return {left: false, right: false};
	}

	return {
		left: scroll_left > SCROLL_EPSILON,
		right: scroll_left < max_scroll - SCROLL_EPSILON,
	};
}

/**
 * How far to move scrollLeft so a menu sits fully inside the readable part of
 * the bar. The readable part is not the whole scroll port: the two hamburgers
 * are painted over the bar's left and right padding, so a menu tucked under
 * one of them is scrolled in but still unreadable.
 *
 * Returns a delta rather than an absolute position so the caller can apply it
 * to scrollLeft without needing to reconcile coordinate spaces; 0 means the
 * menu is already clear and nothing should move.
 *
 * @param {object} bar keys: left, right, padding_left, padding_right - viewport pixels
 * @param {object} link keys: left, right - viewport pixels
 * @returns {number} pixels to add to scrollLeft, negative to scroll left
 */
function menu_bar_scroll_correction(bar, link) {
	if (bar == null || link == null) {
		return 0;
	}

	const view_left = bar.left + (bar.padding_left || 0);
	const view_right = bar.right - (bar.padding_right || 0);

	if (view_right <= view_left) {
		//the gutters have eaten the whole bar; there is nowhere to scroll to
		return 0;
	}

	if (link.left < view_left) {
		return link.left - view_left;
	}

	if (link.right > view_right) {
		return link.right - view_right;
	}

	return 0;
}

export {SCROLL_EPSILON, MENU_BAR_SLACK, menu_bar_split, menu_bar_overflow, menu_bar_scroll_correction};
