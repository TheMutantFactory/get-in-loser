/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * Voxel mode: edit a 3D volume one flat slice at a time.
 *
 * THE VOLUME IS THE MODEL, THE CANVAS IS A VIEW OF ONE SLICE. Every existing tool, the palette and
 * pixel mode work on the slice unchanged, because the slice really is an ordinary raster layer.
 * Moving to another slice commits what is on the canvas back into the volume and loads the next
 * one; rotating changes which way the volume is cut and never touches the data. See core/voxel.js.
 *
 * SLICE CHANGES ARE NAVIGATION, NOT EDITS, so they are applied directly rather than through the
 * action system - otherwise scrubbing through 24 slices would bury the undo history. The trade is
 * that undo does not step backwards across a slice change; it applies to the slice you are on.
 */

import app from './../../app.js';
import config from './../../config.js';
import Base_gui_class from './../../core/base-gui.js';
import Base_layers_class from './../../core/base-layers.js';
import Dialog_class from './../../libs/popup.js';
import Helper_class from './../../libs/helpers.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';
import {
	DEFAULT_SIZE,
	AXES,
	AXIS_LABELS,
	pack,
	unpack,
	create_volume,
	slice_dimensions,
	read_slice,
	write_slice,
	clamp_slice,
	flip_volume,
	flip_axis_for_view,
	apply_face_symmetry,
	count_filled,
} from './../../core/voxel.js';
import {YAWS} from './../../core/voxel-view.js';
import {encode_vox, decode_vox} from './../../core/voxel-vox.js';

var instance = null;

class Tools_voxel_class {

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

	/**
	 * @returns {object|null} the live volume, or null when voxel mode is off
	 */
	get_volume() {
		return config.voxel ? config.voxel.volume : null;
	}

	/**
	 * menu: Voxel > New Voxel Model
	 */
	new_model() {
		var _this = this;

		var settings = {
			title: 'New Voxel Model',
			params: [
				{name: 'w', title: 'Width:', value: DEFAULT_SIZE.w, comment: 'voxels'},
				{name: 'd', title: 'Depth:', value: DEFAULT_SIZE.d, comment: 'voxels'},
				{name: 'h', title: 'Height:', value: DEFAULT_SIZE.h, comment: 'voxels'},
			],
			on_finish: function (params) {
				_this.new_model_handler(params);
			},
		};

		this.POP.show(settings);
	}

	async new_model_handler(params) {
		var volume = create_volume(params.w, params.d, params.h);

		config.voxel = {
			volume: volume,
			axis: 'y',
			slice: 0,
			yaw: 0,
			enabled: true,
			//onion skinning: how many neighbours to show either way. One each way by default -
			//enough to line a shape up against what it sits on, without turning the canvas to soup
			onion: {enabled: true, before: 1, after: 1},
		};

		//a voxel model is pixel art by definition
		var pixel = this.Base_gui.modules['tools/pixel'];
		if (pixel) {
			pixel.set_pixel_mode(true, true);
		}

		await this.reset_canvas_for_slice(true);

		alertify.success('New ' + volume.w + ' x ' + volume.d + ' x ' + volume.h + ' voxel model.');
	}

	/**
	 * menu: Voxel > Voxel Mode
	 */
	async voxel_mode() {
		if (config.voxel == null) {
			//nothing to turn on yet
			return this.new_model();
		}

		config.voxel.enabled = !config.voxel.enabled;

		if (config.voxel.enabled) {
			await this.reset_canvas_for_slice(true);
		}
		else {
			//commit what is on screen before stepping out, or the last edit is lost
			this.commit_slice();
		}

		this.Base_gui.GUI_voxel.render_voxel();
		alertify.success('Voxel mode ' + (config.voxel.enabled ? 'on' : 'off') + '.');

		return config.voxel.enabled;
	}

	/**
	 * @returns {boolean} whether voxel mode is on AND has a volume
	 */
	is_active() {
		return config.voxel != null && config.voxel.enabled === true && config.voxel.volume != null;
	}

	/**
	 * The volume as it would be if the canvas were committed right now.
	 *
	 * FOR THE PREVIEW, WHICH USED TO LIE BY OMISSION. It rendered only the committed volume, so a
	 * stroke did not appear in it until a slice change forced a commit - reported as "the voxel
	 * preview doesn't update as you use the pencil". This composites the live canvas over a COPY,
	 * so navigation stays the only thing that commits; the preview just stops waiting for it.
	 * Symmetry is applied to the copy too, so all four walls move with the pencil.
	 *
	 * @returns {object|null} a temporary volume; never the real one
	 */
	live_volume() {
		if (!this.is_active()) {
			return null;
		}

		var state = config.voxel;
		var dims = slice_dimensions(state.volume, state.axis);
		var pixels = this.read_canvas(dims.width, dims.height);

		var temp = create_volume(state.volume.w, state.volume.d, state.volume.h);
		temp.data.set(state.volume.data);

		if (pixels != null) {
			write_slice(temp, state.axis, state.slice, pixels);
			if (state.symmetry === true) {
				apply_face_symmetry(temp, state.axis, state.slice);
			}
		}

		return temp;
	}

	/**
	 * Flatten what is on the canvas and store it as the current slice.
	 *
	 * @returns {boolean} whether anything was committed
	 */
	commit_slice() {
		if (!this.is_active()) {
			return false;
		}

		var state = config.voxel;
		var dims = slice_dimensions(state.volume, state.axis);
		var pixels = this.read_canvas(dims.width, dims.height);
		if (pixels == null) {
			return false;
		}

		write_slice(state.volume, state.axis, state.slice, pixels);

		if (state.symmetry === true) {
			//the edited plane becomes the truth for its three rotations - see core/voxel.js for
			//why this is the meaning of "the same on every face", and for the top-view caveat
			apply_face_symmetry(state.volume, state.axis, state.slice);
		}

		return true;
	}

	/**
	 * Flatten every visible layer into a packed pixel array.
	 *
	 * @param {number} width
	 * @param {number} height
	 * @returns {Uint32Array|null}
	 */
	read_canvas(width, height) {
		try {
			var canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			var ctx = canvas.getContext('2d');
			ctx.imageSmoothingEnabled = false;

			var layers = this.Base_layers.get_sorted_layers().slice().reverse();
			for (var i = 0; i < layers.length; i++) {
				this.Base_layers.render_object(ctx, layers[i]);
			}

			var img = ctx.getImageData(0, 0, width, height).data;
			var out = new Uint32Array(width * height);
			for (var p = 0; p < out.length; p++) {
				out[p] = pack(img[p * 4], img[p * 4 + 1], img[p * 4 + 2], img[p * 4 + 3]);
			}

			return out;
		}
		catch (e) {
			//a tainted canvas, from an image opened cross origin
			return null;
		}
	}

	/**
	 * Build a canvas holding the current slice.
	 *
	 * @returns {HTMLCanvasElement}
	 */
	slice_to_canvas() {
		var state = config.voxel;
		var slice = read_slice(state.volume, state.axis, state.slice);

		var canvas = document.createElement('canvas');
		canvas.width = slice.width;
		canvas.height = slice.height;

		var ctx = canvas.getContext('2d');
		var img = ctx.createImageData(slice.width, slice.height);
		for (var i = 0; i < slice.data.length; i++) {
			var c = unpack(slice.data[i]);
			img.data[i * 4] = c.r;
			img.data[i * 4 + 1] = c.g;
			img.data[i * 4 + 2] = c.b;
			img.data[i * 4 + 3] = c.a;
		}
		ctx.putImageData(img, 0, 0);

		return canvas;
	}

	/**
	 * Replace the editing canvas with the current slice.
	 *
	 * Goes through the action system only on the FIRST load - creating the layer - because after
	 * that this is navigation and must not fill the undo stack.
	 *
	 * @param {boolean} rebuild force a fresh layer
	 */
	async reset_canvas_for_slice(rebuild) {
		if (!this.is_active()) {
			return false;
		}

		var state = config.voxel;
		var dims = slice_dimensions(state.volume, state.axis);
		var canvas = this.slice_to_canvas();

		var needs_layer = rebuild === true
			|| config.layers.length !== 1
			|| config.layer == null
			|| config.layer.type !== 'image';

		if (needs_layer) {
			app.State.do_action(
				new app.Actions.Bundle_action('voxel_slice', 'Voxel Slice', [
					new app.Actions.Prepare_canvas_action('undo'),
					new app.Actions.Update_config_action({
						WIDTH: dims.width,
						HEIGHT: dims.height,
						TRANSPARENCY: true,
					}),
					new app.Actions.Prepare_canvas_action('do'),
					new app.Actions.Reset_layers_action(),
					new app.Actions.Init_canvas_zoom_action(),
					new app.Actions.Insert_layer_action({
						type: 'image',
						name: 'Slice',
						data: canvas.toDataURL('image/png'),
						x: 0,
						y: 0,
						width: dims.width,
						height: dims.height,
					}, false),
				])
			);

			await new Promise((r) => setTimeout(r, 20));
			this.Base_gui.GUI_preview.zoom_auto();
		}
		else {
			//NAVIGATION PATH. Direct, so scrubbing slices does not bury the undo history.
			this.apply_slice_directly(canvas, dims);
		}

		this.Base_gui.GUI_voxel.render_voxel();

		return true;
	}

	/**
	 * Swap the layer's image and the canvas size without touching undo.
	 *
	 * @param {HTMLCanvasElement} canvas
	 * @param {object} dims keys width, height
	 */
	apply_slice_directly(canvas, dims) {
		var layer = config.layer;
		var resized = config.WIDTH !== dims.width || config.HEIGHT !== dims.height;

		if (resized) {
			config.WIDTH = dims.width;
			config.HEIGHT = dims.height;
		}

		layer.x = 0;
		layer.y = 0;
		layer.width = dims.width;
		layer.height = dims.height;
		layer.width_original = dims.width;
		layer.height_original = dims.height;
		layer.rotate = 0;
		//Update_layer_image_action only swaps link.src, so the dimensions above have to be set by
		//hand - a stale width here draws the slice squashed into the old shape
		layer.link.src = canvas.toDataURL('image/png');
		delete layer.link_canvas;

		if (resized) {
			this.Base_layers.init_zoom_lib();
			this.Base_gui.prepare_canvas();
			this.Base_gui.GUI_preview.zoom_auto();
		}

		config.need_render = true;
	}

	/**
	 * Move to another slice, committing the current one on the way out.
	 *
	 * @param {number} slice
	 */
	async set_slice(slice) {
		if (!this.is_active()) {
			return false;
		}

		this.commit_slice();
		config.voxel.slice = clamp_slice(config.voxel.volume, config.voxel.axis, slice);
		await this.reset_canvas_for_slice(false);

		return config.voxel.slice;
	}

	/** menu: Voxel > Next Slice */
	next_slice() {
		return this.is_active() ? this.set_slice(config.voxel.slice + 1) : false;
	}

	/** menu: Voxel > Previous Slice */
	previous_slice() {
		return this.is_active() ? this.set_slice(config.voxel.slice - 1) : false;
	}

	/**
	 * Cut the volume a different way. The model does not move.
	 *
	 * @param {string} axis one of AXES
	 */
	async set_axis(axis) {
		if (!this.is_active() || AXES.indexOf(axis) < 0) {
			return false;
		}

		this.commit_slice();

		var state = config.voxel;
		state.axis = axis;
		//the axes have different counts, so the old index can be past the end
		state.slice = clamp_slice(state.volume, axis, state.slice);

		await this.reset_canvas_for_slice(false);
		alertify.success('Slicing from the ' + AXIS_LABELS[axis].toLowerCase() + '.');

		return axis;
	}

	/** menu: Voxel > Slice from Top / Front / Side */
	view_top() { return this.set_axis('y'); }
	view_front() { return this.set_axis('z'); }
	view_side() { return this.set_axis('x'); }

	/**
	 * Turn the preview camera a quarter turn. Editing is unaffected - this is the second view only.
	 *
	 * @param {number} direction +1 or -1
	 */
	orbit(direction) {
		if (config.voxel == null) {
			return false;
		}

		//SNAP, do not add. The preview free-rotates by dragging now, so the yaw can be anything -
		//and from 37 degrees, "turn right" means "the next quarter mark", not 127.
		var current = ((Number(config.voxel.yaw) || 0) % 360 + 360) % 360;
		var next = direction < 0
			? Math.ceil(current / 90 - 1) * 90
			: Math.floor(current / 90 + 1) * 90;

		config.voxel.yaw = ((next % 360) + 360) % 360;
		this.Base_gui.GUI_voxel.render_voxel();

		return config.voxel.yaw;
	}

	/**
	 * menu: Voxel > Onion Skin
	 */
	onion_skin() {
		if (config.voxel == null) {
			alertify.error('No voxel model yet.');
			return false;
		}
		if (config.voxel.onion == null) {
			config.voxel.onion = {enabled: false, before: 1, after: 1};
		}

		config.voxel.onion.enabled = !config.voxel.onion.enabled;
		config.need_render = true;
		this.Base_gui.GUI_voxel.render_voxel();

		alertify.success('Onion skin ' + (config.voxel.onion.enabled ? 'on' : 'off') + '.');

		return config.voxel.onion.enabled;
	}

	/**
	 * How many neighbouring slices the onion skin reaches.
	 *
	 * @param {number} before
	 * @param {number} after
	 */
	set_onion_depth(before, after) {
		if (config.voxel == null || config.voxel.onion == null) {
			return false;
		}

		var clamp = function (n) {
			var v = parseInt(n, 10);
			return isNaN(v) ? 0 : Math.max(0, Math.min(8, v));
		};

		config.voxel.onion.before = clamp(before);
		config.voxel.onion.after = clamp(after);
		config.need_render = true;
		this.Base_gui.GUI_voxel.render_voxel();

		return config.voxel.onion;
	}

	/** menu: Voxel > Orbit Left / Right */
	orbit_left() { return this.orbit(-1); }
	orbit_right() { return this.orbit(1); }

	/**
	 * Mirror the model, as seen on the face being edited.
	 *
	 * "Horizontal" and "vertical" are canvas words, so which model axis reverses depends on the
	 * view - the table lives in core/voxel.js next to the slice mapping it must agree with. The
	 * whole VOLUME flips, not the one slice: mirroring a single slice of a model is almost never
	 * what anyone means, and would quietly shear the model across its depth.
	 *
	 * Like rotation, this runs outside the layer undo system: it is lossless and self-inverse, so
	 * its undo is itself. It is also the one-step repair for a .vox exported by v0.1.24-0.1.31,
	 * which wrote mirror images.
	 *
	 * @param {string} direction 'horizontal' | 'vertical'
	 */
	async flip(direction) {
		if (!this.is_active()) {
			alertify.error('No voxel model yet.');
			return false;
		}

		var axis = flip_axis_for_view(config.voxel.axis, direction);
		if (axis == null) {
			return false;
		}

		//the live slice first, so unpainted work flips along with everything else
		this.commit_slice();

		config.voxel.volume = flip_volume(config.voxel.volume, axis);

		await this.reset_canvas_for_slice(false);
		alertify.success('Flipped ' + direction + '.');

		return axis;
	}

	/**
	 * menu: Voxel > Face Symmetry
	 *
	 * While on, committing a wall slice stamps it onto its three rotations, so the model shows the
	 * same picture from every side. Toggling it ON symmetrises immediately from the slice in hand.
	 */
	face_symmetry() {
		if (!this.is_active()) {
			alertify.error('No voxel model yet.');
			return false;
		}

		var state = config.voxel;
		state.symmetry = state.symmetry !== true;

		if (state.symmetry) {
			this.commit_slice();
			this.Base_gui.GUI_voxel.render_voxel();
			config.need_render = true;

			if (state.axis === 'y') {
				alertify.success('Face symmetry on. It applies when editing walls - the top view stays free-hand.');
			}
			else if (state.volume.w !== state.volume.d) {
				alertify.success('Face symmetry on. Footprint is not square, so front matches back and left matches right.');
			}
			else {
				alertify.success('Face symmetry on. Each wall now mirrors the one you edit.');
			}
		}
		else {
			alertify.success('Face symmetry off.');
		}

		return state.symmetry;
	}

	/** menu: Voxel > Flip Horizontal / Vertical */
	flip_horizontal() { return this.flip('horizontal'); }
	flip_vertical() { return this.flip('vertical'); }

	/**
	 * menu: Voxel > Export Slices
	 *
	 * Every slice along the current axis, side by side in one PNG. Inspectable in any image editor,
	 * and re-importable without a bespoke format.
	 */
	export_slices() {
		if (!this.is_active()) {
			alertify.error('No voxel model. Use Voxel > New Voxel Model first.');
			return false;
		}

		this.commit_slice();

		var state = config.voxel;
		var dims = slice_dimensions(state.volume, state.axis);
		var sheet = document.createElement('canvas');
		sheet.width = dims.width * dims.count;
		sheet.height = dims.height;

		var ctx = sheet.getContext('2d');
		ctx.imageSmoothingEnabled = false;

		var keep = state.slice;
		for (var i = 0; i < dims.count; i++) {
			state.slice = i;
			ctx.drawImage(this.slice_to_canvas(), i * dims.width, 0);
		}
		state.slice = keep;

		sheet.toBlob(function (blob) {
			var link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.download = 'voxel-' + state.volume.w + 'x' + state.volume.d + 'x' + state.volume.h
				+ '-' + AXIS_LABELS[state.axis].toLowerCase() + '.png';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(link.href);
		}, 'image/png');

		return true;
	}

	/**
	 * menu: Voxel > Export .vox
	 *
	 * MagicaVoxel format - what Godot, Unity, Blender and three.js importers all read. The PNG
	 * strip is for inspecting and re-importing here; this is for taking the model somewhere else.
	 */
	export_vox() {
		if (!this.is_active()) {
			alertify.error('No voxel model. Use Voxel > New Voxel Model first.');
			return false;
		}

		this.commit_slice();

		var state = config.voxel;
		var out = encode_vox(state.volume, unpack);

		if (out.voxels === 0) {
			alertify.error('Nothing to export - the model is empty.');
			return false;
		}

		var blob = new Blob([out.bytes], {type: 'application/octet-stream'});
		var link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'model-' + state.volume.w + 'x' + state.volume.d + 'x' + state.volume.h + '.vox';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);

		if (out.folded > 0) {
			//said out loud: .vox indices only reach 255, so anything past that was matched to the
			//nearest colour already in the palette
			alertify.warning('Exported ' + out.voxels + ' voxels. ' + out.folded
				+ ' colours were folded onto the nearest of the 255 the format allows.');
		}
		else {
			alertify.success('Exported ' + out.voxels + ' voxels, ' + out.colors + ' colours.');
		}

		return true;
	}

	/**
	 * menu: Voxel > Import .vox
	 */
	import_vox() {
		var _this = this;
		var input = document.createElement('input');

		input.type = 'file';
		input.accept = '.vox';
		input.addEventListener('change', function () {
			var file = this.files[0];
			if (file == undefined) {
				return;
			}

			var reader = new FileReader();
			reader.onload = function (event) {
				_this.import_vox_bytes(new Uint8Array(event.target.result));
			};
			reader.onerror = function () {
				alertify.error('Could not read that file.');
			};
			reader.readAsArrayBuffer(file);
		}, false);

		input.click();
	}

	/**
	 * @param {Uint8Array} bytes
	 */
	async import_vox_bytes(bytes) {
		var loaded = decode_vox(bytes, create_volume, pack);

		if (loaded == null) {
			alertify.error('That is not a readable .vox file.');
			return false;
		}

		//a .vox brings its own dimensions, so this replaces the model rather than filling the
		//current one - the alternative is silently cropping someone's work
		config.voxel = {
			volume: loaded.volume,
			axis: 'y',
			slice: 0,
			yaw: config.voxel ? config.voxel.yaw : 0,
			enabled: true,
			onion: config.voxel && config.voxel.onion
				? config.voxel.onion
				: {enabled: true, before: 1, after: 1},
		};

		var pixel = this.Base_gui.modules['tools/pixel'];
		if (pixel) {
			pixel.set_pixel_mode(true, true);
		}

		await this.reset_canvas_for_slice(true);

		var v = loaded.volume;
		alertify.success('Imported ' + loaded.voxels + ' voxels (' + v.w + ' x ' + v.d + ' x ' + v.h + ').'
			+ (loaded.skipped > 0 ? ' ' + loaded.skipped + ' were outside the declared size and dropped.' : ''));

		return true;
	}

	/**
	 * menu: Voxel > Import Slices
	 */
	import_slices() {
		var _this = this;
		var input = document.createElement('input');

		input.type = 'file';
		input.accept = 'image/png';
		input.addEventListener('change', function () {
			var file = this.files[0];
			if (file == undefined) {
				return;
			}

			var image = new Image();
			image.onload = function () {
				_this.import_sheet(image);
			};
			image.onerror = function () {
				alertify.error('Could not read that image.');
			};
			image.src = URL.createObjectURL(file);
		}, false);

		input.click();
	}

	/**
	 * @param {HTMLImageElement} image a strip of slices, side by side
	 */
	async import_sheet(image) {
		if (!this.is_active()) {
			alertify.error('Create a voxel model first, so the strip has something to load into.');
			return false;
		}

		var state = config.voxel;
		var dims = slice_dimensions(state.volume, state.axis);
		var expected = dims.width * dims.count;

		if (image.width !== expected || image.height !== dims.height) {
			alertify.error('Expected a ' + expected + ' x ' + dims.height + ' strip for this axis, got '
				+ image.width + ' x ' + image.height + '.');
			return false;
		}

		var canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		var ctx = canvas.getContext('2d');
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(image, 0, 0);

		for (var i = 0; i < dims.count; i++) {
			var img = ctx.getImageData(i * dims.width, 0, dims.width, dims.height).data;
			var pixels = new Uint32Array(dims.width * dims.height);
			for (var p = 0; p < pixels.length; p++) {
				pixels[p] = pack(img[p * 4], img[p * 4 + 1], img[p * 4 + 2], img[p * 4 + 3]);
			}
			write_slice(state.volume, state.axis, i, pixels);
		}

		await this.reset_canvas_for_slice(false);
		alertify.success('Imported ' + dims.count + ' slices (' + count_filled(state.volume) + ' voxels).');

		return true;
	}

}

export default Tools_voxel_class;
