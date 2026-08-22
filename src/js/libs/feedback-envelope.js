/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * The browser half of feedback-service's envelope v1. Pure, so every decision that can be made
 * without a network is tested without one - see tests/feedback-envelope.test.js.
 *
 * The contract lives in the feedback-service repo (schema/envelope.v1.md), not here. Adding a
 * field is not a version bump; `v` only moves when an existing field changes meaning.
 */

/** Envelope version this client speaks. */
const ENVELOPE_VERSION = 1;

/** Must match the `app` other Get in loser reports were filed under, or grouping splits in two. */
const APP_NAME = 'Get in loser';

/** The server refuses a longer note with a 413, so the UI stops the reporter before it does. */
const TEXT_LIMIT = 8 * 1024;

/** The server refuses a larger image with a 413. */
const IMAGE_LIMIT = 2 * 1024 * 1024;

/**
 * How a reply to POST /v1/report should be treated.
 *
 * This is the outbox's whole reason to exist: "an outbox that cannot tell those apart either loses
 * good reports or retries bad ones forever." Mirrors the Godot client's classification so both
 * clients behave the same way against the same server.
 *
 * @param {number} status HTTP status, or 0 for a transport failure
 * @param {object} body parsed JSON response, when there was one
 * @returns {string} one of:
 *   sent      - stored; drop it from the outbox
 *   discarded - a [deleteme] report, accepted and thrown away by design; drop it, never retry
 *   rejected  - malformed; keep it aside but never send it again
 *   limited   - rate limited; hold this one AND everything after it
 *   retry     - the report is fine, the world is not; keep it and try later
 */
function classify_response(status, body) {
	if (status === 429) {
		return 'limited';
	}
	if (status === 200 || status === 202) {
		//202 {discarded: true} is the server accepting a test report and storing nothing
		return (body && body.discarded === true) ? 'discarded' : 'sent';
	}
	if (status >= 400 && status < 500) {
		//4xx means this payload will never be accepted. Retrying is a loop.
		return 'rejected';
	}

	//5xx, 0, and anything unrecognised: the report is fine, try later. Defaulting the other way
	//would throw away good reports over a transient blip.
	return 'retry';
}

/**
 * Best-effort platform string. Never throws and never returns empty - the server rejects an empty
 * required field, and losing a report over a browser that hides its user agent is a bad trade.
 *
 * @param {object} nav a navigator-shaped object
 * @returns {string}
 */
function detect_platform(nav) {
	nav = nav || {};

	var data = nav.userAgentData;
	if (data && typeof data.platform === 'string' && data.platform.length > 0) {
		return data.platform;
	}

	var ua = typeof nav.userAgent === 'string' ? nav.userAgent : '';
	//MOST SPECIFIC FIRST. An iPhone's user agent says "like Mac OS X" and an Android's says
	//"Linux", so a looser pattern placed earlier swallows the platform that actually matters -
	//which is exactly what half of all UI reports being platform-specific makes expensive.
	var known = [
		[/iPhone|iPad|iPod/i, 'iOS'],
		[/CrOS/i, 'ChromeOS'],
		[/Android/i, 'Android'],
		[/Windows/i, 'Windows'],
		[/Macintosh|Mac OS X/i, 'macOS'],
		[/Linux/i, 'Linux'],
	];
	for (var i = 0; i < known.length; i++) {
		if (known[i][0].test(ua)) {
			return known[i][1];
		}
	}

	if (typeof nav.platform === 'string' && nav.platform.length > 0) {
		return nav.platform;
	}

	return 'unknown';
}

/**
 * The field reports GROUP on.
 *
 * Content-free by contract: schema may appear, player data may not. A tool name and a dialog title
 * are schema. The layer name, the file name and the colour are the user's, and any of them would
 * give every report its own bucket while leaking what the user is working on.
 *
 * @param {object} state keys: tool (string), dialog (string|null)
 * @returns {string}
 */
function element_key(state) {
	state = state || {};

	var clean = function (value) {
		return String(value || '')
			.toLowerCase()
			.replace(/[^a-z0-9_]+/g, '_')
			.replace(/^_+|_+$/g, '');
	};

	if (state.dialog) {
		var dialog = clean(state.dialog);
		if (dialog) {
			return 'dialog/' + dialog;
		}
	}

	var tool = clean(state.tool);

	return tool ? 'editor/tool.' + tool : 'editor';
}

/**
 * A stable per-browser id, so one reporter's history groups and an abuser can be dropped without
 * accounts. Random, never derived from anything about the machine - it identifies a browser
 * profile to this app and nothing else.
 *
 * @param {object} storage a localStorage-shaped object
 * @param {function} random returns a 16-char hex string
 * @returns {string}
 */
function install_id(storage, random) {
	var KEY = 'feedback_install_id';

	try {
		var existing = storage.getItem(KEY);
		if (typeof existing === 'string' && /^[0-9a-f]{8,64}$/.test(existing)) {
			return existing;
		}
	}
	catch (e) {
		//private mode can throw on read; fall through and mint a throwaway
	}

	var fresh = random();
	try {
		storage.setItem(KEY, fresh);
	}
	catch (e) {
		//storage unavailable - the report still goes, it just will not group with the next one
	}

	return fresh;
}

/**
 * Build the envelope.
 *
 * @param {object} input keys: text, app_version, platform, install_id, tool, dialog,
 *   shot_attached, ts
 * @returns {object|null} null when there is no note - a report with no note is a mis-click, and
 *   the server would 400 it anyway
 */
function build_envelope(input) {
	input = input || {};

	var text = String(input.text == null ? '' : input.text).trim();
	if (text.length === 0) {
		return null;
	}

	return {
		v: ENVELOPE_VERSION,
		app: APP_NAME,
		//an empty required field is a 400, so never let one through
		app_version: String(input.app_version || 'unknown'),
		platform: String(input.platform || 'unknown'),
		install_id: String(input.install_id || 'unknown'),
		ts: String(input.ts || new Date().toISOString()),
		text: text.slice(0, TEXT_LIMIT),
		element_key: element_key({tool: input.tool, dialog: input.dialog}),
		shot_attached: input.shot_attached === true,
	};
}

export {
	ENVELOPE_VERSION,
	APP_NAME,
	TEXT_LIMIT,
	IMAGE_LIMIT,
	classify_response,
	detect_platform,
	element_key,
	install_id,
	build_envelope,
};
