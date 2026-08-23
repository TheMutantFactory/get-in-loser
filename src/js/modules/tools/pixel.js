/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Pixel edit mode: small canvases measured in pixels, nearest-neighbour
 * rendering and a per-pixel grid overlay.
 */

import app from './../../app.js';
import config from './../../config.js';
import Base_gui_class from './../../core/base-gui.js';
import Base_layers_class from './../../core/base-layers.js';
import Dialog_class from './../../libs/popup.js';
import Helper_class from './../../libs/helpers.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';
import {PIXEL_PRESETS, get_preset_labels, parse_preset, resolve_size} from './../../libs/pixel-size.js';

var instance = null;

class Tools_pixel_class {

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

		this.PRESETS = PIXEL_PRESETS;

		//restore from the previous session
		config.PIXEL_MODE = this.Helper.getCookie('pixel_mode') === true;
		config.PIXEL_GRID = this.Helper.getCookie('pixel_grid') !== false;
	}

	/**
	 * @returns {array} ['Custom', '16x24 - tall sprite', ...]
	 */
	get_preset_labels() {
		return get_preset_labels(this.PRESETS);
	}

	/**
	 * @param {string} label
	 * @returns {object|null} keys: w, h
	 */
	parse_preset(label) {
		return parse_preset(label);
	}

	/**
	 * @param {object} params
	 * @returns {object|null} keys: w, h. null when the input is unusable.
	 */
	resolve_size(params) {
		return resolve_size(params);
	}

	/**
	 * menu: Pixel > New Pixel Canvas
	 */
	new_canvas() {
		var _this = this;

		var settings = {
			title: 'New Pixel Canvas',
			params: [
				{name: 'width', title: 'Width:', value: 16, comment: 'px'},
				{name: 'height', title: 'Height:', value: 24, comment: 'px'},
				{name: 'preset', title: 'Preset:', type: 'select', values: this.get_preset_labels()},
				{name: 'transparency', title: 'Transparent:', value: true},
			],
			on_finish: function (params) {
				_this.new_canvas_handler(params);
			},
		};

		this.POP.show(settings);
	}

	async new_canvas_handler(params) {
		var size = this.resolve_size(params);
		if (size == null) {
			alertify.error('Enter a width and height of at least 1 pixel.');
			return;
		}

		var transparency = !!params.transparency;

		app.State.do_action(
			new app.Actions.Bundle_action('new_pixel_canvas', 'New Pixel Canvas', [
				new app.Actions.Refresh_action_attributes_action('undo'),
				new app.Actions.Prepare_canvas_action('undo'),
				new app.Actions.Update_config_action({
					TRANSPARENCY: transparency,
					WIDTH: size.w,
					HEIGHT: size.h,
					ALPHA: 255,
					mouse: {},
					visible_width: null,
					visible_height: null,
				}),
				new app.Actions.Prepare_canvas_action('do'),
				new app.Actions.Refresh_action_attributes_action('do'),
				new app.Actions.Reset_layers_action(),
				new app.Actions.Init_canvas_zoom_action(),
				new app.Actions.Insert_layer_action({}),
			])
		);

		this.Helper.setCookie('transparency', transparency ? 1 : 0);

		//wait for the DOM to settle before measuring for the zoom
		await new Promise((r) => setTimeout(r, 10));

		this.set_pixel_mode(true, true);
		this.zoom_to_fit();

		alertify.success('New ' + size.w + ' x ' + size.h + ' px canvas.');
	}

	/**
	 * menu: Pixel > Canvas Size in Pixels
	 */
	size() {
		var _this = this;

		var settings = {
			title: 'Canvas Size (pixels)',
			params: [
				{name: 'width', title: 'Width:', value: config.WIDTH, comment: 'px'},
				{name: 'height', title: 'Height:', value: config.HEIGHT, comment: 'px'},
				{name: 'preset', title: 'Preset:', type: 'select', values: this.get_preset_labels()},
			],
			on_finish: function (params) {
				_this.size_handler(params);
			},
		};

		this.POP.show(settings);
	}

	size_handler(params) {
		var size = this.resolve_size(params);
		if (size == null) {
			alertify.error('Enter a width and height of at least 1 pixel.');
			return;
		}

		app.State.do_action(
			new app.Actions.Bundle_action('set_pixel_size', 'Set Pixel Canvas Size', [
				new app.Actions.Prepare_canvas_action('undo'),
				new app.Actions.Update_config_action({WIDTH: size.w, HEIGHT: size.h}),
				new app.Actions.Prepare_canvas_action('do'),
			])
		);

		this.zoom_to_fit();

		alertify.success('Canvas is now ' + size.w + ' x ' + size.h + ' px.');
	}

	/**
	 * menu: Pixel > Pixel Mode
	 */
	pixel_mode() {
		this.set_pixel_mode(!config.PIXEL_MODE);
	}

	/**
	 * @param {boolean} enabled
	 * @param {boolean} quiet skip the notification
	 */
	set_pixel_mode(enabled, quiet) {
		config.PIXEL_MODE = !!enabled;
		this.Helper.setCookie('pixel_mode', config.PIXEL_MODE);

		document.body.classList.toggle('pixel_mode', config.PIXEL_MODE);

		this.adjust_erase_size(config.PIXEL_MODE);

		this.Base_gui.prepare_canvas();
		config.need_render = true;

		if (quiet !== true) {
			alertify.success('Pixel mode ' + (config.PIXEL_MODE ? 'on' : 'off') + '.');
		}

		return config.PIXEL_MODE;
	}

	/**
	 * The eraser arrives in pixel mode at size 1, and gets its old size back on the way out.
	 *
	 * Field report 987f66d1. The eraser's default is 30 - a third of the default voxel slice in one
	 * touch, which on a 16-wide canvas is less an eraser than a demolition. The restore is guarded:
	 * only a size still sitting at 1 goes back, so a size the person chose themselves is kept.
	 *
	 * @param {boolean} pixel_on
	 */
	adjust_erase_size(pixel_on) {
		var erase = config.TOOLS.find(function (t) { return t.name == 'erase'; });
		if (erase == null || erase.attributes == null) {
			return;
		}

		if (pixel_on) {
			if (erase.attributes.size > 1) {
				this.erase_size_before = erase.attributes.size;
				erase.attributes.size = 1;
			}
		}
		else if (erase.attributes.size === 1 && this.erase_size_before > 1) {
			erase.attributes.size = this.erase_size_before;
			this.erase_size_before = null;
		}

		if (config.TOOL != null && config.TOOL.name == 'erase') {
			this.Base_gui.GUI_tools.show_action_attributes();
		}
	}

	/**
	 * menu: Pixel > Pixel Grid
	 */
	grid() {
		config.PIXEL_GRID = !config.PIXEL_GRID;
		this.Helper.setCookie('pixel_grid', config.PIXEL_GRID);
		config.need_render = true;

		alertify.success('Pixel grid ' + (config.PIXEL_GRID ? 'on' : 'off') + '.');

		return config.PIXEL_GRID;
	}

	/**
	 * menu: Pixel > Zoom to Fit
	 */
	zoom_to_fit() {
		this.Base_gui.GUI_preview.zoom_auto();
	}

}

export default Tools_pixel_class;
