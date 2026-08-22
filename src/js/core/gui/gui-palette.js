/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Renders the Palette block on the right sidebar.
 */

import config from './../../config.js';
import Tools_palettes_class from './../../modules/tools/palettes.js';

var instance = null;

var template = `
	<div class="block_section">
		<div class="ui_input_group">
			<select id="palette_select" aria-label="Palette"></select>
		</div>
	</div>
	<div class="block_section">
		<div class="palette_colors" id="palette_colors"></div>
	</div>
	<div class="block_section palette_meta" id="palette_meta"></div>
	<div class="block_section">
		<div class="details">
			<button type="button" class="layer_add trn" id="palette_import" title="Import a palette from a JSON file">Import</button>
			<button type="button" class="layer_add trn" id="palette_export" title="Save the current palette as a JSON file">Export</button>
		</div>
	</div>
`;

/**
 * GUI class responsible for rendering the palette block on right sidebar
 */
class GUI_palette_class {

	constructor(GUI_class) {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		if (GUI_class != undefined) {
			this.GUI = GUI_class;
		}

		this.Tools_palettes = new Tools_palettes_class();
	}

	render_main_palette() {
		var target = document.getElementById('toggle_palette');
		if (target == null) {
			return;
		}

		target.innerHTML = template;

		this.set_events();
		this.render_palette();
	}

	set_events() {
		var _this = this;

		document.getElementById('palette_select').addEventListener('change', function () {
			var palette = _this.Tools_palettes.find(this.value);
			if (palette != null) {
				_this.Tools_palettes.set_active(palette);
			}
		}, false);

		document.getElementById('palette_import').addEventListener('click', function () {
			_this.Tools_palettes.import_palette();
		}, false);

		document.getElementById('palette_export').addEventListener('click', function () {
			_this.Tools_palettes.export_palette();
		}, false);

		document.getElementById('palette_colors').addEventListener('click', function (event) {
			var swatch = event.target.closest('.palette_color');
			if (swatch == null) {
				return;
			}
			_this.select_color(swatch.dataset.hex);
		}, false);

		document.getElementById('palette_colors').addEventListener('keydown', function (event) {
			if (event.key != 'Enter' && event.key != ' ') {
				return;
			}
			var swatch = event.target.closest('.palette_color');
			if (swatch == null) {
				return;
			}
			event.preventDefault();
			_this.select_color(swatch.dataset.hex);
		}, false);
	}

	/**
	 * @param {string} hex
	 */
	select_color(hex) {
		if (hex == undefined) {
			return;
		}

		this.GUI.GUI_colors.set_color({hex: hex});
		this.render_active_color();
	}

	render_palette() {
		var select = document.getElementById('palette_select');
		if (select == null) {
			//panel not rendered yet
			return;
		}

		var palettes = this.Tools_palettes.get_all();
		var active = this.Tools_palettes.get_active();

		select.innerHTML = palettes
			.map((palette) => '<option value="' + palette.name.replace(/"/g, '&quot;') + '">'
				+ palette.name + ' (' + palette.colors.length + ')</option>')
			.join('');

		if (active != null) {
			select.value = active.name;
		}

		var container = document.getElementById('palette_colors');
		if (active == null) {
			container.innerHTML = '<span class="text_muted trn">No palette loaded.</span>';
			document.getElementById('palette_meta').innerHTML = '';
			return;
		}

		container.innerHTML = active.colors
			.map((hex) => '<button type="button" class="palette_color" data-hex="' + hex
				+ '" title="' + hex + '" style="background-color:' + hex + '">'
				+ '<span class="sr_only">' + hex + '</span></button>')
			.join('');

		var meta = [];
		if (active.author) meta.push(active.author);
		if (active.license) meta.push(active.license);
		document.getElementById('palette_meta').innerHTML = meta.length > 0
			? '<span class="text_muted">' + meta.join(' &middot; ') + '</span>'
			: '';

		this.render_active_color();
	}

	/**
	 * highlights the palette entry matching the current colour
	 */
	render_active_color() {
		var container = document.getElementById('palette_colors');
		if (container == null) {
			return;
		}

		var current = String(config.COLOR).toLowerCase();
		var swatches = container.querySelectorAll('.palette_color');

		for (var i = 0; i < swatches.length; i++) {
			swatches[i].classList.toggle('active', swatches[i].dataset.hex === current);
		}
	}

}

export default GUI_palette_class;
