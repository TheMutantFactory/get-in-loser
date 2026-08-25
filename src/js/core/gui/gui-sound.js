/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * The Sound panel: a drum kit, two synths and a rack of game sounds, none of it editable.
 *
 * WHY A PAINT APP HAS A DRUM MACHINE. This editor makes game sprites and voxel models, and the
 * sibling SoundGraph project makes game audio - the same 808s, basses and sfxr-style effects a
 * game jam reaches for. Auditioning the coin sound next to the coin sprite beats alt-tabbing to a
 * DAW, and a beat to draw to costs nothing once the engine is here. The instruments are fixed
 * patches: this is an instrument, not an editor - SoundGraph itself is the editor.
 *
 * Nothing loads until the panel's power button is pressed: the 344K engine is not part of the
 * page, and browsers require a user gesture before audio anyway, so the gesture pays for both.
 */

import config from './../../config.js';
import SoundGraph_engine_class from './../../libs/soundgraph-engine.js';
import {SOUND_BASE, KEY_NOTES, INSTRUMENTS, get_instrument, patch_url, action_for_key}
	from './../../libs/sound-instruments.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';

var instance = null;

var template = `
	<div class="sound_boot">
		<button type="button" class="layer_add sound_power" id="sound_power">&#9658; Start audio</button>
	</div>
	<div class="sound_rack hidden" id="sound_rack">
		<select id="sound_instrument" class="sound_instrument"></select>
		<div class="sound_surface" id="sound_surface"></div>
		<label class="sound_capture_row" title="Play with the computer keyboard. Off while drawing, so the tools keep their shortcuts.">
			<input type="checkbox" id="sound_capture"> keyboard
		</label>
	</div>
`;

class GUI_sound_class {

	constructor(GUI_class) {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		this.GUI = GUI_class;
		this.engine = null;
		this.instrument = null;
		this.loaded_patch = null;
		this.capture = false;
		this.held = new Set();
	}

	render_main_sound() {
		var target = document.getElementById('toggle_sound');
		if (target == null) {
			return;
		}

		target.innerHTML = template;
		this.set_events();
	}

	set_events() {
		var _this = this;

		document.getElementById('sound_power').addEventListener('click', function () {
			_this.power_on();
		});

		document.getElementById('sound_instrument').addEventListener('change', function () {
			_this.set_instrument(this.value);
		});

		document.getElementById('sound_capture').addEventListener('change', function () {
			_this.capture = this.checked;
		});

		//KEY CAPTURE IS OPT-IN. The editor's shortcuts own the keyboard - Z alone is a pad, a
		//piano key AND undo's neighbour - so keys only play while the checkbox says so, and never
		//from a text field.
		document.addEventListener('keydown', function (e) {
			if (!_this.capture || _this.engine == null || e.repeat) {
				return;
			}
			if (e.metaKey || e.ctrlKey || e.altKey) {
				return;
			}
			var tag = (e.target.tagName || '').toLowerCase();
			if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
				return;
			}
			var action = action_for_key(_this.instrument, e.key.toLowerCase());
			if (action != null) {
				e.preventDefault();
				e.stopPropagation();
				_this.held.add(e.key.toLowerCase());
				_this.press(action.note);
			}
		}, true);

		document.addEventListener('keyup', function (e) {
			var key = e.key.toLowerCase();
			if (!_this.held.has(key)) {
				return;
			}
			_this.held.delete(key);
			var action = action_for_key(_this.instrument, key);
			if (action != null && _this.instrument && _this.instrument.mode === 'keys') {
				_this.engine.note_off(action.note);
			}
		}, true);
	}

	async power_on() {
		var button = document.getElementById('sound_power');
		button.disabled = true;
		button.textContent = 'Loading…';

		try {
			this.engine = new SoundGraph_engine_class();
			await this.engine.load_module(SOUND_BASE + 'soundgraph.wasm');
			await this.engine.start(SOUND_BASE + 'soundgraph-worklet.js');
		}
		catch (error) {
			button.disabled = false;
			button.textContent = '▸ Start audio';
			this.engine = null;
			alertify.error('Audio engine failed to start: ' + error.message);
			return;
		}

		document.querySelector('.sound_boot').classList.add('hidden');
		document.getElementById('sound_rack').classList.remove('hidden');

		var select = document.getElementById('sound_instrument');
		select.innerHTML = INSTRUMENTS.map(function (ins) {
			return '<option value="' + ins.id + '">' + ins.name + '</option>';
		}).join('');

		this.set_instrument(INSTRUMENTS[0].id);
	}

	async set_instrument(id) {
		var instrument = get_instrument(id);
		if (instrument == null || this.engine == null) {
			return;
		}

		if (this.instrument && this.instrument.mode === 'keys') {
			this.engine.all_notes_off();
		}
		this.instrument = instrument;

		if (instrument.patch != null) {
			await this.use_patch(instrument.patch);
		}

		this.render_surface();
	}

	async use_patch(patch) {
		if (this.loaded_patch === patch) {
			return;
		}

		var response = await fetch(patch_url(patch));
		if (!response.ok) {
			alertify.error('Could not load instrument.');
			return;
		}

		this.engine.load_patch(await response.text());
		this.loaded_patch = patch;
	}

	render_surface() {
		var surface = document.getElementById('sound_surface');
		var instrument = this.instrument;
		var _this = this;

		if (instrument.mode === 'keys') {
			surface.innerHTML = '<div class="sound_keys">' + KEY_NOTES.map(function (k, i) {
				return '<button type="button" class="sound_key' + (k.black ? ' black' : '')
					+ '" data-note="' + (k.note + (instrument.octave_shift || 0))
					+ '" title="' + k.key + '"></button>';
			}).join('') + '</div>';

			surface.querySelectorAll('.sound_key').forEach(function (el) {
				var note = parseInt(el.dataset.note, 10);
				el.addEventListener('pointerdown', function (e) {
					e.preventDefault();
					_this.press(note);
				});
				var lift = function () { _this.engine.note_off(note); };
				el.addEventListener('pointerup', lift);
				el.addEventListener('pointerleave', lift);
			});
			return;
		}

		//pads - the kit's fixed eight, or one game sound per pad
		var pads = instrument.pads;
		surface.innerHTML = '<div class="sound_pads">' + pads.map(function (p, i) {
			return '<button type="button" class="sound_pad" data-index="' + i + '"'
				+ (p.key ? ' title="' + p.key + '"' : '') + '>' + p.label + '</button>';
		}).join('') + '</div>';

		surface.querySelectorAll('.sound_pad').forEach(function (el) {
			el.addEventListener('pointerdown', function (e) {
				e.preventDefault();
				var pad = pads[parseInt(el.dataset.index, 10)];
				if (instrument.mode === 'sfx') {
					_this.fire_sfx(pad.patch);
				}
				else {
					_this.press(pad.note);
				}
			});
		});
	}

	/** SFX pads each own a whole patch: load it (cached by the browser), then trigger. */
	async fire_sfx(patch) {
		await this.use_patch(patch);
		this.press(60);
	}

	press(note) {
		if (this.engine == null || note == null) {
			return;
		}
		this.engine.note_on(note, 0.9);

		if (this.instrument && this.instrument.mode !== 'keys') {
			//one-shots: release immediately, the envelope does the rest
			this.engine.note_off(note);
		}
	}

}

export default GUI_sound_class;
