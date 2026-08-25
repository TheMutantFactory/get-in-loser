/**
 * The Sound panel's manifest: which note does what, per instrument. The mappings are the contract
 * between the UI and the patches - a pad wired to the wrong note plays the wrong drum forever.
 */
import {KIT_PADS, KEY_NOTES, SFX_PADS, INSTRUMENTS, get_instrument, patch_url, action_for_key}
	from '../src/js/libs/sound-instruments.js';

describe('the kit', () => {
	test('eight pads on consecutive notes from the NoteTriggers base', () => {
		//the 808 patch routes t1..t8 from base 48; this order IS the patch's TriggerBus wiring
		expect(KIT_PADS.map(p => p.note)).toEqual([48, 49, 50, 51, 52, 53, 54, 55]);
		expect(KIT_PADS[0].label).toBe('Kick');
	});

	test('every pad key is unique - two drums on one key is a fight', () => {
		const keys = KIT_PADS.map(p => p.key);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('the keyboard', () => {
	test('one octave, chromatic, no gaps', () => {
		const notes = KEY_NOTES.map(k => k.note);
		for (let i = 1; i < notes.length; i++) expect(notes[i]).toBe(notes[i - 1] + 1);
		expect(notes[0]).toBe(60);
		expect(notes[notes.length - 1]).toBe(72);
	});

	test('black keys sit where a piano puts them', () => {
		const blacks = KEY_NOTES.filter(k => k.black).map(k => k.note % 12);
		expect(blacks).toEqual([1, 3, 6, 8, 10]);
	});
});

describe('instruments', () => {
	test('every instrument resolves and every patch has a url', () => {
		for (const ins of INSTRUMENTS) {
			expect(get_instrument(ins.id)).toBe(ins);
			if (ins.patch) expect(patch_url(ins.patch)).toBe('sound/patches/' + ins.patch + '.json');
		}
		expect(get_instrument('nope')).toBe(null);
	});

	test('sfx pads each name their own patch', () => {
		for (const pad of SFX_PADS) expect(typeof pad.patch).toBe('string');
	});
});

describe('action_for_key', () => {
	test('kit keys hit their pads', () => {
		const kit = get_instrument('kit-808');
		expect(action_for_key(kit, 'z')).toEqual({note: 48});
		expect(action_for_key(kit, ',')).toEqual({note: 55});
		expect(action_for_key(kit, 'q')).toBe(null);
	});

	test('synth keys respect the octave shift', () => {
		//the acid bass lives two octaves down, or it is not a bass
		expect(action_for_key(get_instrument('acid-bass'), 'z')).toEqual({note: 36});
		expect(action_for_key(get_instrument('poly-five'), 'z')).toEqual({note: 60});
	});

	test('sfx mode plays from pads, not keys', () => {
		expect(action_for_key(get_instrument('game-sfx'), 'z')).toBe(null);
	});

	test('no instrument, no action', () => {
		expect(action_for_key(null, 'z')).toBe(null);
	});
});
