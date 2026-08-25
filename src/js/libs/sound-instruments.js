/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * What the Sound panel can play. Pure - see tests/sound-instruments.test.js.
 *
 * The instruments are SoundGraph patches (see the soundgraph repo): JSON graphs played by a 344K
 * WebAssembly engine in an AudioWorklet. Nothing here is editable on purpose - this panel is for
 * noodling a beat while drawing and for auditioning game sounds next to the sprites they belong
 * to, not for patch design. The patches live in sound/patches/ and this file is the only place
 * that knows which note does what in each of them.
 */

/** Where the engine and its patches are served from, relative to the app root. */
const SOUND_BASE = 'sound/';

/**
 * The 808 kit maps trigger slots t1..t8 to notes 48..55 (NoteTriggers base 48). This order is the
 * kit patch's TriggerBus wiring, read from the patch - change the patch, change this with it.
 */
const KIT_PADS = [
	{label: 'Kick', note: 48, key: 'z'},
	{label: 'Snare', note: 49, key: 'x'},
	{label: 'Hat', note: 50, key: 'c'},
	{label: 'Open Hat', note: 51, key: 'v'},
	{label: 'Clap', note: 52, key: 'b'},
	{label: 'Cymbal', note: 53, key: 'n'},
	{label: 'Cowbell', note: 54, key: 'm'},
	{label: 'Clave', note: 55, key: ','},
];

/** One octave from middle C, the white-and-black layout the keys row draws. */
const KEY_NOTES = [
	{note: 60, key: 'z', black: false}, {note: 61, key: 's', black: true},
	{note: 62, key: 'x', black: false}, {note: 63, key: 'd', black: true},
	{note: 64, key: 'c', black: false},
	{note: 65, key: 'v', black: false}, {note: 66, key: 'g', black: true},
	{note: 67, key: 'b', black: false}, {note: 68, key: 'h', black: true},
	{note: 69, key: 'n', black: false}, {note: 70, key: 'j', black: true},
	{note: 71, key: 'm', black: false},
	{note: 72, key: ',', black: false},
];

/** Game sounds fire once per press; the note only matters as a trigger. */
const SFX_PADS = [
	{label: 'Coin', patch: 'sfx-coin'},
	{label: 'Jump', patch: 'sfx-jump'},
	{label: 'Hurt', patch: 'sfx-hurt'},
	{label: 'Explode', patch: 'sfx-explode'},
	{label: 'Power Up', patch: 'sfx-powerup'},
	{label: 'Select', patch: 'sfx-select'},
	{label: 'Shoot', patch: 'sfx-shoot'},
];

/**
 * mode 'pads': a grid of one-shot triggers. mode 'keys': a small piano, noteOn held.
 * mode 'sfx': pads where each pad is its OWN patch, loaded on demand.
 */
const INSTRUMENTS = [
	{id: 'kit-808', name: '808 Kit', mode: 'pads', patch: 'kit-808', pads: KIT_PADS},
	{id: 'acid-bass', name: 'Acid Bass', mode: 'keys', patch: 'acid-bass', octave_shift: -24},
	{id: 'poly-five', name: 'Poly Five', mode: 'keys', patch: 'poly-five', octave_shift: 0},
	{id: 'game-sfx', name: 'Game SFX', mode: 'sfx', pads: SFX_PADS},
];

/**
 * @param {string} id
 * @returns {object|null}
 */
function get_instrument(id) {
	for (var i = 0; i < INSTRUMENTS.length; i++) {
		if (INSTRUMENTS[i].id === id) {
			return INSTRUMENTS[i];
		}
	}
	return null;
}

/**
 * @param {string} patch a patch id, no extension
 * @returns {string} url to fetch
 */
function patch_url(patch) {
	return SOUND_BASE + 'patches/' + patch + '.json';
}

/**
 * What a key press means for the current instrument, or null.
 *
 * @param {object} instrument
 * @param {string} key event.key, lowercased
 * @returns {object|null} {note} for pads/keys, {patch} for sfx
 */
function action_for_key(instrument, key) {
	if (instrument == null) {
		return null;
	}

	if (instrument.mode === 'pads') {
		for (var i = 0; i < instrument.pads.length; i++) {
			if (instrument.pads[i].key === key) {
				return {note: instrument.pads[i].note};
			}
		}
		return null;
	}

	if (instrument.mode === 'keys') {
		for (var k = 0; k < KEY_NOTES.length; k++) {
			if (KEY_NOTES[k].key === key) {
				return {note: KEY_NOTES[k].note + (instrument.octave_shift || 0)};
			}
		}
		return null;
	}

	return null;
}

export {SOUND_BASE, KIT_PADS, KEY_NOTES, SFX_PADS, INSTRUMENTS, get_instrument, patch_url, action_for_key};
