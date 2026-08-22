/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Colour palette management: bundled JSON palettes, runtime import/export and
 * the currently active palette.
 */

import config from './../../config.js';
import Base_gui_class from './../../core/base-gui.js';
import Dialog_class from './../../libs/popup.js';
import Helper_class from './../../libs/helpers.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';
import {parse_palette, stringify_palette, nearest_color} from './../../libs/palette-parser.js';

var instance = null;

/** used on first run, when no palette has been chosen yet */
var DEFAULT_PALETTE = 'sweetie-16';

/**
 * Loads every .json file in /src/palettes at build time.
 */
function load_bundled_palettes() {
	var palettes = [];
	var context = require.context('./../../../palettes/', false, /\.json$/);

	context.keys().sort().forEach(function (key) {
		var file = key.replace('./', '');
		try {
			var palette = parse_palette(context(key), {name: file.replace(/\.json$/, '')});
			palette.id = file.replace(/\.json$/, '');
			palette.bundled = true;
			palettes.push(palette);
		}
		catch (e) {
			console.warn('Could not load bundled palette ' + file + ': ' + e.message);
		}
	});

	return palettes;
}

class Tools_palettes_class {

	constructor() {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		this.Base_gui = new Base_gui_class();
		this.POP = new Dialog_class();
		this.Helper = new Helper_class();

		this.palettes = load_bundled_palettes();

		//restore the palette used last time, if it is still around
		var saved = this.Helper.getCookie('palette');
		var active = saved != null ? this.find(saved) : null;

		if (active == null) {
			//a compact 16 colour palette is a friendlier starting point than
			//whatever happens to sort first
			active = this.find(DEFAULT_PALETTE) || this.palettes[0] || null;
		}

		config.palette = active;
	}

	/**
	 * @returns {array} every known palette
	 */
	get_all() {
		return this.palettes;
	}

	/**
	 * @returns {object|null} the palette currently in use
	 */
	get_active() {
		return config.palette;
	}

	/**
	 * @param {string} id
	 * @returns {object|null}
	 */
	find(id) {
		for (var i = 0; i < this.palettes.length; i++) {
			if (this.palettes[i].id == id || this.palettes[i].name == id) {
				return this.palettes[i];
			}
		}

		return null;
	}

	/**
	 * @param {object} palette
	 */
	set_active(palette) {
		if (palette == null) {
			return false;
		}

		config.palette = palette;

		if (palette.bundled === true) {
			this.Helper.setCookie('palette', palette.id);
		}

		this.Base_gui.GUI_palette.render_palette();

		return true;
	}

	/**
	 * adds a palette that was imported at runtime and makes it active
	 *
	 * @param {object} palette
	 */
	add(palette) {
		palette.id = palette.name;

		//replace a previous import with the same name
		var existing = this.find(palette.id);
		if (existing != null && existing.bundled !== true) {
			this.palettes.splice(this.palettes.indexOf(existing), 1);
		}

		this.palettes.push(palette);
		this.set_active(palette);

		return palette;
	}

	/**
	 * menu: Pixel > Palette > Load Palette
	 */
	load() {
		var _this = this;
		var names = this.palettes.map((palette) => palette.name);
		var active = this.get_active();

		if (names.length == 0) {
			alertify.error('No palettes available.');
			return;
		}

		var settings = {
			title: 'Load Palette',
			params: [
				{
					name: 'palette',
					title: 'Palette:',
					type: 'select',
					value: active != null ? active.name : names[0],
					values: names,
				},
			],
			on_finish: function (params) {
				var palette = _this.find(params.palette);
				if (palette == null) {
					alertify.error('Palette not found.');
					return;
				}
				_this.set_active(palette);
				alertify.success('Palette "' + palette.name + '" loaded (' + palette.colors.length + ' colors).');
			},
		};

		this.POP.show(settings);
	}

	/**
	 * menu: Pixel > Palette > Import Palette
	 */
	import_palette() {
		var _this = this;
		var input = document.createElement('input');

		input.type = 'file';
		input.accept = '.json,application/json';
		input.addEventListener('change', function () {
			var file = this.files[0];
			if (file == undefined) {
				return;
			}

			var reader = new FileReader();
			reader.onload = function (event) {
				try {
					var palette = parse_palette(event.target.result, {
						name: file.name.replace(/\.json$/i, ''),
					});
					_this.add(palette);
					alertify.success('Palette "' + palette.name + '" imported (' + palette.colors.length + ' colors).');
				}
				catch (e) {
					alertify.error('Could not import palette: ' + e.message);
				}
			};
			reader.onerror = function () {
				alertify.error('Could not read the palette file.');
			};
			reader.readAsText(file);
		}, false);

		input.click();
	}

	/**
	 * menu: Pixel > Palette > Export Palette
	 */
	export_palette() {
		var palette = this.get_active();
		if (palette == null) {
			alertify.error('No palette is loaded.');
			return;
		}

		var blob = new Blob([stringify_palette(palette)], {type: 'application/json'});
		var link = document.createElement('a');

		link.href = URL.createObjectURL(blob);
		link.download = palette.name.replace(/[^a-z0-9\-_ ]/gi, '') + '.json';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);
	}

	/**
	 * snaps the current colour to the closest one in the active palette
	 *
	 * @param {string} hex
	 * @returns {string} unchanged when no palette is active
	 */
	snap_to_palette(hex) {
		var palette = this.get_active();
		if (palette == null) {
			return hex;
		}

		var snapped = nearest_color(hex, palette.colors);

		return snapped != null ? snapped : hex;
	}

}

export default Tools_palettes_class;
