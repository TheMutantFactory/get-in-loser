/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * The Piano Roll menu. The roll itself - what its pixels mean - lives in core/piano-roll.js;
 * this is the document plumbing: make one, rotate one, switch the mode on and off.
 *
 * A roll is ONE image layer, and roll mode holds it to that: the pencil paints straight into the
 * layer instead of growing a vector stack (see tools/pencil.js). One roll per file, by design -
 * a person who wants two rolls saves two files, and every file tool this app has already works.
 */

import app from './../../app.js';
import config from './../../config.js';
import Base_gui_class from './../../core/base-gui.js';
import Base_layers_class from './../../core/base-layers.js';
import Dialog_class from './../../libs/popup.js';
import Helper_class from './../../libs/helpers.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';
import {BAR_CHOICES, roll_dimensions, rotate_pixels, roll_from_bars, step_seconds, notes_at_step}
	from './../../core/piano-roll.js';

var instance = null;

class Tools_pianoroll_class {

	constructor() {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		this.Base_gui = new Base_gui_class();
		this.Base_layers = new Base_layers_class();
		this.POP = new Dialog_class();
		this.Helper = new Helper_class();

		this.playing = false;
		this.play_timer = null;
		this.play_step = 0;
		this.play_pixels = null;
		this.sounding = [];

		var _this = this;
		var play = document.getElementById('roll_play');
		if (play != null) {
			play.addEventListener('click', function () {
				_this.play_toggle();
			});
		}
	}

	/** menu: Piano Roll > New Piano Roll - sized in the units people think in */
	new_roll() {
		var _this = this;

		this.POP.show({
			title: 'New Piano Roll',
			params: [
				{name: 'bars', title: 'Bars:', type: 'select', value: '4',
					values: BAR_CHOICES.map(String)},
				{name: 'octaves', title: 'Octaves:', type: 'select', value: '2',
					values: ['1', '2', '3', '4', '5', '6', '7', '8']},
				{name: 'orientation', title: 'Orientation:', type: 'select',
					values: ['horizontal', 'vertical']},
			],
			on_finish: function (params) {
				_this.new_roll_handler(params);
			},
		});
	}

	async new_roll_handler(params) {
		var roll = roll_from_bars(params.bars, params.octaves);
		if (roll == null) {
			alertify.error('Pick a bar count and an octave count.');
			return;
		}

		var orientation = params.orientation === 'vertical' ? 'vertical' : 'horizontal';
		var dims = roll_dimensions(roll, orientation);

		//blank, fully transparent roll layer
		var canvas = document.createElement('canvas');
		canvas.width = dims.width;
		canvas.height = dims.height;

		config.pianoroll = {
			enabled: true,
			roll: roll,
			orientation: orientation,
		};

		app.State.do_action(
			new app.Actions.Bundle_action('new_piano_roll', 'New Piano Roll', [
				new app.Actions.Prepare_canvas_action('undo'),
				new app.Actions.Update_config_action({
					WIDTH: dims.width,
					HEIGHT: dims.height,
					TRANSPARENCY: true,
					ALPHA: 255,
					mouse: {},
					visible_width: null,
					visible_height: null,
				}),
				new app.Actions.Prepare_canvas_action('do'),
				new app.Actions.Reset_layers_action(),
				new app.Actions.Init_canvas_zoom_action(),
				new app.Actions.Insert_layer_action({
					type: 'image',
					name: 'Roll',
					data: canvas.toDataURL('image/png'),
					x: 0,
					y: 0,
					width: dims.width,
					height: dims.height,
				}, false),
			])
		);

		await new Promise(function (r) { setTimeout(r, 20); });

		//a roll is pixels; pixel mode is what makes pixels drawable
		var pixel = this.Base_gui.modules ? this.Base_gui.modules['tools/pixel'] : null;
		if (pixel != null) {
			pixel.set_pixel_mode(true, true);
		}
		this.Base_gui.GUI_preview.zoom_auto();

		this.set_mode_side_effects(true);
		alertify.success('New roll: ' + (roll.steps / 16) + ' bars, ' + (roll.pitches / 12) + ' octaves.');
	}

	/** menu: Piano Roll > Roll Mode - the one-layer painting behaviour, on or off */
	roll_mode() {
		if (config.pianoroll == null) {
			alertify.error('No piano roll yet. Piano Roll > New Piano Roll first.');
			return false;
		}

		config.pianoroll.enabled = !config.pianoroll.enabled;
		this.set_mode_side_effects(config.pianoroll.enabled);
		alertify.success('Roll mode ' + (config.pianoroll.enabled ? 'on' : 'off') + '.');

		return config.pianoroll.enabled;
	}

	/** menu: Piano Roll > Rotate Roll - horizontal <-> vertical, a quarter turn, never a mirror */
	async rotate() {
		var state = config.pianoroll;

		if (state == null || config.layer == null || config.layer.type !== 'image') {
			alertify.error('No piano roll to rotate.');
			return false;
		}

		var canvas = this.Base_layers.convert_layer_to_canvas(null, true);
		var ctx = canvas.getContext('2d');
		var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

		//horizontal -> vertical is a clockwise turn (time was rightward, becomes downward);
		//vertical -> horizontal turns back counter-clockwise, so flipping twice is the identity
		var direction = state.orientation === 'horizontal' ? 'cw' : 'ccw';
		var turned = rotate_pixels(pixels.data, pixels.width, pixels.height, direction);

		var out = document.createElement('canvas');
		out.width = turned.width;
		out.height = turned.height;
		var out_img = out.getContext('2d').createImageData(turned.width, turned.height);
		out_img.data.set(turned.data);
		out.getContext('2d').putImageData(out_img, 0, 0);

		state.orientation = state.orientation === 'horizontal' ? 'vertical' : 'horizontal';

		app.State.do_action(
			new app.Actions.Bundle_action('rotate_roll', 'Rotate Roll', [
				new app.Actions.Prepare_canvas_action('undo'),
				new app.Actions.Update_config_action({
					WIDTH: turned.width,
					HEIGHT: turned.height,
				}),
				new app.Actions.Prepare_canvas_action('do'),
				new app.Actions.Reset_layers_action(),
				new app.Actions.Init_canvas_zoom_action(),
				new app.Actions.Insert_layer_action({
					type: 'image',
					name: 'Roll',
					data: out.toDataURL('image/png'),
					x: 0,
					y: 0,
					width: turned.width,
					height: turned.height,
				}, false),
			])
		);

		await new Promise(function (r) { setTimeout(r, 20); });
		this.Base_gui.GUI_preview.zoom_auto();

		alertify.success('Roll is now ' + state.orientation + '.');

		return state.orientation;
	}

	/**
	 * What roll mode does to the rest of the app, on and off again.
	 *
	 * THE TOOLBAR SHRINKS TO WHAT A ROLL CAN USE. Brushes, shapes, gradients and text on a piano
	 * roll produce pixels that LOOK like music and play like an accident; hiding them is kinder
	 * than letting them disappoint. Point, select, pencil, erase stay - the CSS does the hiding,
	 * this just flips the class and rescues anyone holding a tool that is about to vanish.
	 */
	set_mode_side_effects(on) {
		document.body.classList.toggle('pianoroll_mode', on === true);
		this.sync_transport();

		var kept = ['select', 'selection', 'pencil', 'erase'];
		if (on === true && config.TOOL != null && kept.indexOf(config.TOOL.name) < 0) {
			this.Base_gui.GUI_tools.activate_tool('pencil');
		}

		if (on !== true) {
			this.stop();
		}

		config.need_render = true;
	}

	/** the play button and tempo box in the top bar exist only while a roll does */
	sync_transport() {
		var bar = document.getElementById('roll_transport');
		if (bar != null) {
			bar.classList.toggle('hidden', config.pianoroll == null);
		}
	}

	/**
	 * menu-less: the top bar's play button. How a roll is played: the playhead walks the time
	 * axis at the tempo, and every painted pixel sounds on its row's pitch through the Sound
	 * engine - a run of pixels holds as one note, because the player only retriggers on a rising
	 * edge. The roll loops, and re-reads the image every pass, so painting while it plays works.
	 */
	async play_toggle() {
		if (this.playing) {
			this.stop();
			return false;
		}

		var state = config.pianoroll;
		if (state == null) {
			alertify.error('No piano roll yet. Piano Roll > New Piano Roll first.');
			return false;
		}

		var sound = this.Base_gui.GUI_sound;
		var engine = await sound.ensure_engine();
		if (engine == null) {
			alertify.error('The audio engine did not start.');
			return false;
		}

		//a kit or a one-shot sfx patch cannot hold a melody; anything with keys can
		if (sound.instrument == null || sound.instrument.mode !== 'keys') {
			await sound.set_instrument('poly-five');
		}

		this.playing = true;
		this.play_step = 0;
		this.sounding = [];
		this.play_pixels = this.read_roll();
		this.sync_play_button();

		var _this = this;
		var next_at = performance.now();

		var tick = function () {
			if (!_this.playing) {
				return;
			}

			var roll = config.pianoroll.roll;
			var pixels = _this.play_pixels;
			var notes = pixels == null ? []
				: notes_at_step(pixels, roll, config.pianoroll.orientation, _this.play_step);

			//diff against what is sounding: held pixels sustain, edges trigger and release
			for (var i = 0; i < _this.sounding.length; i++) {
				if (notes.indexOf(_this.sounding[i]) < 0) {
					engine.note_off(_this.sounding[i]);
				}
			}
			for (var j = 0; j < notes.length; j++) {
				if (_this.sounding.indexOf(notes[j]) < 0) {
					engine.note_on(notes[j], 0.9);
				}
			}
			_this.sounding = notes;

			_this.play_step += 1;
			if (_this.play_step >= roll.steps) {
				_this.play_step = 0;
				//a fresh read each loop, so edits made while it plays join in next pass
				_this.play_pixels = _this.read_roll();
			}

			//drift-corrected: scheduled against the clock, not stacked on setTimeout's slippage
			var bpm = parseFloat((document.getElementById('roll_tempo') || {}).value) || 120;
			next_at += step_seconds(bpm) * 1000;
			_this.play_timer = setTimeout(tick, Math.max(0, next_at - performance.now()));
		};

		tick();
		return true;
	}

	stop() {
		if (!this.playing) {
			return;
		}

		this.playing = false;
		clearTimeout(this.play_timer);

		var sound = this.Base_gui.GUI_sound;
		if (sound != null && sound.engine != null) {
			sound.engine.all_notes_off();
		}
		this.sounding = [];
		this.sync_play_button();
	}

	sync_play_button() {
		var button = document.getElementById('roll_play');
		if (button != null) {
			button.textContent = this.playing ? '⏸' : '▶';
			button.title = this.playing ? 'Pause the roll' : 'Play the roll';
		}
	}

	/** the roll as the ear should hear it: every visible layer, flattened */
	read_roll() {
		try {
			var canvas = document.createElement('canvas');
			canvas.width = config.WIDTH;
			canvas.height = config.HEIGHT;
			var ctx = canvas.getContext('2d');
			ctx.imageSmoothingEnabled = false;

			var layers = this.Base_layers.get_sorted_layers().slice().reverse();
			for (var i = 0; i < layers.length; i++) {
				this.Base_layers.render_object(ctx, layers[i]);
			}

			return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
		}
		catch (e) {
			return null;
		}
	}

}

export default Tools_pianoroll_class;
