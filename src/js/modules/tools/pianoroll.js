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
import {DEFAULT_ROLL, roll_dimensions, rotate_pixels, resolve_roll} from './../../core/piano-roll.js';

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
	}

	/** menu: Piano Roll > New Piano Roll */
	new_roll() {
		var _this = this;

		this.POP.show({
			title: 'New Piano Roll',
			params: [
				{name: 'steps', title: 'Steps (time):', value: DEFAULT_ROLL.steps},
				{name: 'pitches', title: 'Pitches:', value: DEFAULT_ROLL.pitches},
				{name: 'orientation', title: 'Orientation:', type: 'select',
					values: ['horizontal', 'vertical']},
			],
			on_finish: function (params) {
				_this.new_roll_handler(params);
			},
		});
	}

	async new_roll_handler(params) {
		var roll = resolve_roll(params.steps, params.pitches);
		if (roll == null) {
			alertify.error('Steps and pitches must both be at least 1.');
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

		alertify.success('New ' + roll.steps + '-step, ' + roll.pitches + '-pitch roll.');
	}

	/** menu: Piano Roll > Roll Mode - the one-layer painting behaviour, on or off */
	roll_mode() {
		if (config.pianoroll == null) {
			alertify.error('No piano roll yet. Piano Roll > New Piano Roll first.');
			return false;
		}

		config.pianoroll.enabled = !config.pianoroll.enabled;
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

}

export default Tools_pianoroll_class;
