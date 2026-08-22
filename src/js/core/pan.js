/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Pure helpers for middle mouse button drag panning. See tests/pan.test.js.
 */

/** MouseEvent.button value for the scroll wheel / middle button */
const MIDDLE_BUTTON = 1;

/** MouseEvent.buttons bitmask bit for the middle button */
const MIDDLE_BUTTONS_MASK = 4;

/** elements a pan may start on - anywhere over the drawing area */
const PAN_TARGETS = ['canvas_minipaint', 'main_wrapper', 'canvas_wrapper', 'canvas_minipaint_background'];

/**
 * @param {object} event a MouseEvent, or anything with button/target
 * @param {array} targets element ids a pan may start on, defaults to PAN_TARGETS
 * @returns {boolean}
 */
function is_pan_start(event, targets) {
	targets = targets || PAN_TARGETS;

	if (event == null || event.button !== MIDDLE_BUTTON) {
		return false;
	}

	var id = event.target != null ? event.target.id : null;

	return targets.indexOf(id) > -1;
}

/**
 * The middle button can be released while the pointer is outside the window,
 * in which case no mouseup arrives. Checking the button bitmask on the next
 * move lets a stuck pan release itself.
 *
 * @param {object} event a MouseEvent, or anything with a buttons bitmask
 * @returns {boolean} true when the middle button is no longer held
 */
function is_pan_released(event) {
	if (event == null || typeof event.buttons != 'number') {
		//no information - assume still held rather than dropping the pan
		return false;
	}

	return (event.buttons & MIDDLE_BUTTONS_MASK) === 0;
}

/**
 * Movement between two pointer positions, in screen pixels.
 *
 * @param {object} from keys: x, y
 * @param {object} to keys: x, y
 * @returns {object} keys: x, y
 */
function pan_delta(from, to) {
	if (from == null || to == null) {
		return {x: 0, y: 0};
	}

	return {
		x: to.x - from.x,
		y: to.y - from.y,
	};
}

export {MIDDLE_BUTTON, MIDDLE_BUTTONS_MASK, PAN_TARGETS, is_pan_start, is_pan_released, pan_delta};
