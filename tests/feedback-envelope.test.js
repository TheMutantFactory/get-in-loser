/**
 * The envelope contract lives in the feedback-service repo (schema/envelope.v1.md). These tests
 * are this client's copy of it: if the server starts refusing our reports, one of these should
 * have failed first.
 */
import {
	ENVELOPE_VERSION,
	APP_NAME,
	TEXT_LIMIT,
	classify_response,
	detect_platform,
	element_key,
	install_id,
	build_envelope,
} from '../src/js/libs/feedback-envelope.js';

const REQUIRED = ['v', 'app', 'app_version', 'platform', 'install_id', 'ts'];

const input = (over = {}) => ({
	text: 'The pencil draws one pixel to the left at high zoom.',
	app_version: '0.1.22',
	platform: 'macOS',
	install_id: 'efd4b9d8be4252fd',
	tool: 'pencil',
	shot_attached: false,
	ts: '2026-08-22T18:00:00.000Z',
	...over,
});

describe('build_envelope', () => {
	test('produces every field the server requires, as a non-empty string', () => {
		const env = build_envelope(input());

		expect(env.v).toBe(ENVELOPE_VERSION);
		for (const key of REQUIRED) {
			if (key === 'v') continue;
			expect(typeof env[key]).toBe('string');
			expect(env[key].length).toBeGreaterThan(0);
		}
	});

	test('files under a stable app name, or reports split into two buckets', () => {
		expect(build_envelope(input()).app).toBe(APP_NAME);
	});

	test('trims the note', () => {
		expect(build_envelope(input({text: '  spaces around  '})).text).toBe('spaces around');
	});

	test('a note-less report is refused here, not at the server', () => {
		expect(build_envelope(input({text: ''}))).toBe(null);
		expect(build_envelope(input({text: '   '}))).toBe(null);
		expect(build_envelope(input({text: null}))).toBe(null);
		expect(build_envelope({})).toBe(null);
		expect(build_envelope(null)).toBe(null);
	});

	test('caps the note at the server limit rather than being 413d', () => {
		const env = build_envelope(input({text: 'x'.repeat(TEXT_LIMIT + 5000)}));

		expect(env.text.length).toBe(TEXT_LIMIT);
	});

	test('never emits an empty required field, whatever it was handed', () => {
		const env = build_envelope({text: 'note'});

		for (const key of REQUIRED) {
			if (key === 'v') continue;
			expect(env[key].length).toBeGreaterThan(0);
		}
		expect(env.app_version).toBe('unknown');
		expect(env.platform).toBe('unknown');
	});

	test('shot_attached is a real boolean, never a maybe', () => {
		expect(build_envelope(input({shot_attached: true})).shot_attached).toBe(true);
		expect(build_envelope(input({shot_attached: false})).shot_attached).toBe(false);
		//truthy is not true: the flag must mean "an image is attached", not "one was requested"
		expect(build_envelope(input({shot_attached: 'yes'})).shot_attached).toBe(false);
		expect(build_envelope(input({shot_attached: undefined})).shot_attached).toBe(false);
	});

	test('carries no canvas, file name or colour', () => {
		const json = JSON.stringify(build_envelope(input()));

		for (const leak of ['data:image', 'layer', 'filename', '#008000']) {
			expect(json.toLowerCase()).not.toContain(leak);
		}
	});
});

describe('classify_response', () => {
	test.each([
		[202, undefined, 'sent'],
		[200, undefined, 'sent'],
		[202, {discarded: true}, 'discarded'],
		[429, undefined, 'limited'],
		[400, undefined, 'rejected'],
		[413, undefined, 'rejected'],
		[415, undefined, 'rejected'],
		[404, undefined, 'rejected'],
		[500, undefined, 'retry'],
		[503, undefined, 'retry'],
		[0, undefined, 'retry'],
	])('%i -> %s', (status, body, expected) => {
		expect(classify_response(status, body)).toBe(expected);
	});

	test('a 4xx is never retried and a 5xx is never dropped', () => {
		//this is the whole reason the outbox exists
		for (let s = 400; s < 500; s++) {
			if (s === 429) continue;
			expect(classify_response(s)).toBe('rejected');
		}
		for (let s = 500; s < 600; s++) {
			expect(classify_response(s)).toBe('retry');
		}
	});

	test('an unreadable body does not change what the status means', () => {
		expect(classify_response(202, null)).toBe('sent');
		expect(classify_response(202, {})).toBe('sent');
	});

	test('an unknown status is held, not thrown away', () => {
		expect(classify_response(999)).toBe('retry');
		expect(classify_response(undefined)).toBe('retry');
	});
});

describe('detect_platform', () => {
	test('prefers the modern hint', () => {
		expect(detect_platform({userAgentData: {platform: 'macOS'}, userAgent: 'Windows'})).toBe('macOS');
	});

	test.each([
		['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'macOS'],
		['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Windows'],
		['Mozilla/5.0 (X11; Linux x86_64)', 'Linux'],
		['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iOS'],
		['Mozilla/5.0 (Linux; Android 14)', 'Android'],
		['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)', 'ChromeOS'],
	])('reads %s as %s', (ua, expected) => {
		expect(detect_platform({userAgent: ua})).toBe(expected);
	});

	test('iOS wins over Mac, and Android over Linux', () => {
		//both user agents contain the looser match too, so order matters
		expect(detect_platform({userAgent: 'iPhone; CPU iPhone OS like Mac OS X'})).toBe('iOS');
		expect(detect_platform({userAgent: 'Linux; Android 14'})).toBe('Android');
	});

	test('never returns empty, whatever it is handed', () => {
		for (const nav of [{}, null, undefined, {userAgent: ''}, {userAgent: 'Nonsense/1.0'}]) {
			expect(detect_platform(nav).length).toBeGreaterThan(0);
		}
	});
});

describe('element_key', () => {
	test('groups by the selected tool', () => {
		expect(element_key({tool: 'pencil'})).toBe('editor/tool.pencil');
		expect(element_key({tool: 'magic_erase'})).toBe('editor/tool.magic_erase');
	});

	test('a dialog wins over the tool - it is what the reporter is looking at', () => {
		expect(element_key({tool: 'pencil', dialog: 'New Pixel Canvas'})).toBe('dialog/new_pixel_canvas');
	});

	test('falls back to a coarse scope rather than nothing', () => {
		expect(element_key({})).toBe('editor');
		expect(element_key(null)).toBe('editor');
		expect(element_key({tool: '   '})).toBe('editor');
	});

	test('is content-free: same key regardless of what the user is working on', () => {
		const a = element_key({tool: 'brush'});
		const b = element_key({tool: 'brush'});

		expect(a).toBe(b);
	});

	test('cannot carry punctuation or user text through', () => {
		const key = element_key({dialog: 'My Cat.png <script>'});

		expect(key).toMatch(/^dialog\/[a-z0-9_]+$/);
		expect(key).not.toContain('<');
		expect(key).not.toContain('.');
	});
});

describe('install_id', () => {
	const store = () => {
		const data = {};
		return {
			getItem: (k) => (k in data ? data[k] : null),
			setItem: (k, v) => {
				data[k] = String(v);
			},
			data,
		};
	};

	test('mints one and reuses it', () => {
		const s = store();
		const first = install_id(s, () => 'abcdef0123456789');

		expect(first).toBe('abcdef0123456789');
		expect(install_id(s, () => 'a-different-one')).toBe(first);
	});

	test('replaces a junk value rather than sending it', () => {
		const s = store();
		s.setItem('feedback_install_id', 'not a hex id');

		expect(install_id(s, () => 'abcdef0123456789')).toBe('abcdef0123456789');
	});

	test('still returns an id when storage refuses to work', () => {
		const broken = {
			getItem: () => {
				throw new Error('private mode');
			},
			setItem: () => {
				throw new Error('private mode');
			},
		};

		expect(install_id(broken, () => 'abcdef0123456789')).toBe('abcdef0123456789');
	});
});
