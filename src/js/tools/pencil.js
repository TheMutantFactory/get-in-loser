import app from './../app.js';
import config from './../config.js';
import Base_tools_class from './../core/base-tools.js';
import Base_layers_class from './../core/base-layers.js';
import {nib_origin, stroke_nibs} from './../core/pixel-paint.js';

class Pencil_class extends Base_tools_class {

	constructor(ctx) {
		super();
		this.Base_layers = new Base_layers_class();
		this.name = 'pencil';
		this.layer = {};
		this.params_hash = false;
		this.pressure_supported = false;
		this.pointer_pressure = 0; // has range [0 - 1]

		//the roll-mode paint session - one layer, one working canvas; see roll_paint_start
		this.roll_painting = false;
		this.roll_pointer_down = false;
		this.roll_queue = [];
		this.rollCanvas = null;
		this.rollCtx = null;
		this.roll_expected_link = null;

		//the right-button erase stroke - pixel mode only, see right_erase_start
		this.right_erasing = false;
		this.right_pointer_down = false;
		this.eraseCanvas = null;
		this.eraseCtx = null;
	}

	load() {
		var _this = this;

		//pointer events
		document.addEventListener('pointerdown', function (event) {
			_this.pointerdown(event);
		});
		document.addEventListener('pointermove', function (event) {
			_this.pointermove(event);
		});

		this.default_events();

		//RIGHT-CLICK ERASES, in pixel and voxel mode. Field report de4750dc asked for it, and it is
		//the pixel-art convention everywhere else. The left-button path above knows nothing about
		//this: click_valid is false for any button but the first, so these listeners carry the
		//whole gesture themselves.
		document.addEventListener('contextmenu', function (event) {
			_this.on_contextmenu(event);
		});
		document.addEventListener('mousedown', function (event) {
			_this.right_erase_start(event);
		});
		document.addEventListener('mousemove', function (event) {
			_this.right_erase_move(event);
		});
		document.addEventListener('mouseup', function (event) {
			_this.right_erase_end(event);
		});
	}

	/** roll mode on, and the layer under the pencil is the roll's one image layer */
	roll_paint_applies() {
		return config.pianoroll != null
			&& config.pianoroll.enabled === true
			&& config.layer != null
			&& config.layer.type === 'image';
	}

	/**
	 * THE SESSION CANVAS, AND WHY THERE IS ONE. The first design re-snapshotted the layer at
	 * every stroke, which meant every stroke START had to await the previous stroke's commit and
	 * the image decode behind it - and two strokes arriving fast enough overlapped those awaits,
	 * clobbered each other's state, and erased each other's work. Verified failing: three
	 * back-to-back drags kept only the first.
	 *
	 * Now the roll keeps ONE working canvas. It is built from the layer once, every stroke paints
	 * into it synchronously - no awaits anywhere on the drawing path - and each mouseup commits a
	 * CLONE as its own undo step. The session is discarded whenever the layer's image is not the
	 * one our last commit produced (an undo, another tool), and rebuilt from the layer on the
	 * next stroke; only that rare rebuild awaits anything, and moves arriving inside it queue.
	 */
	roll_session_dirty() {
		//two tells: the layer's image is not the one our last commit produced, or the undo
		//history moved without us - an undo restores the image ASYNCHRONOUSLY, so for a moment
		//the old link still hangs on the layer while history has already stepped back, and a
		//stroke in that moment would resurrect what was just undone. (A stroke within ~200ms of
		//the undo can still catch the restoration mid-air; that window is the undo's image
		//loading and is not closable from here.)
		return this.rollCanvas == null
			|| config.layer.link !== this.roll_expected_link
			|| (app.State != null && app.State.action_history_index !== this.roll_expected_index);
	}

	async roll_paint_start(mouse) {
		this.roll_painting = true;
		this.roll_pointer_down = true;

		//identity, not state: after an await, "is my stroke still the current one" must be asked
		//with a token. The first cut asked roll_painting - which mouseup ALSO clears - so any
		//stroke released before the first decode finished was read as superseded and aborted
		//whole: no pixels, no commit, and an undo stack so empty that Ctrl+Z reached back and
		//unmade the roll itself.
		var token = {};
		this.roll_token = token;

		if (this.roll_session_dirty()) {
			this.roll_queue = [];
			var image = config.layer.link;

			if (image != null && image.complete === false && typeof image.decode === 'function') {
				try { await image.decode(); } catch (e) { return; }
			}
			if (this.roll_token !== token) {
				//a genuinely NEWER stroke took over while this one waited; it owns the session now
				return;
			}

			this.rollCanvas = document.createElement('canvas');
			this.rollCanvas.width = config.layer.width_original;
			this.rollCanvas.height = config.layer.height_original;
			this.rollCtx = this.rollCanvas.getContext('2d');
			this.rollCtx.drawImage(config.layer.link, 0, 0);
			this.roll_expected_link = config.layer.link;
			this.roll_expected_index = app.State != null ? app.State.action_history_index : null;
		}

		this.roll_nibs(mouse, false);

		//replay anything the drag did while a rebuild was waiting, joined up in order
		var last = {x: mouse.x, y: mouse.y};
		for (var q = 0; q < this.roll_queue.length; q++) {
			var point = this.roll_queue[q];
			this.roll_nibs({x: point.x, y: point.y, last_x: last.x, last_y: last.y}, true);
			last = point;
		}
		this.roll_queue = [];

		config.layer.link_canvas = this.rollCanvas;
		config.need_render = true;

		if (this.roll_pointer_down === false) {
			this.roll_paint_end();
		}
	}

	roll_paint_move(mouse) {
		if (this.rollCtx == null || this.roll_session_dirty()) {
			if (this.roll_painting) {
				this.roll_queue.push({x: mouse.x, y: mouse.y});
			}
			return;
		}
		this.roll_nibs(mouse, true);
		config.need_render = true;
	}

	roll_paint_end() {
		this.roll_painting = false;
		this.roll_pointer_down = false;

		if (this.rollCanvas == null) {
			return;
		}

		delete config.layer.link_canvas;

		//a CLONE goes into the undo step: the session canvas keeps living for the next stroke,
		//and an undo must restore a frozen image, not a window onto our future edits
		var frozen = document.createElement('canvas');
		frozen.width = this.rollCanvas.width;
		frozen.height = this.rollCanvas.height;
		frozen.getContext('2d').drawImage(this.rollCanvas, 0, 0);

		var _this = this;
		app.State.do_action(
			new app.Actions.Bundle_action('roll_paint', 'Roll Paint', [
				new app.Actions.Update_layer_image_action(frozen)
			])
		).then(function () {
			//the layer's image is now the one we produced; the session stays valid
			_this.roll_expected_link = config.layer.link;
			_this.roll_expected_index = app.State.action_history_index;
		}).catch(function () {
			//the commit was refused: the session no longer matches the layer
			_this.roll_expected_link = null;
		});
	}

	/** whole pixels in the current colour, gaps filled along the drag - the eraser's nib logic */
	roll_nibs(mouse, is_move) {
		var ctx = this.rollCtx;
		var layer = config.layer;
		var size = parseInt(this.getParams().size) || 1;

		var scale_x = layer.width ? layer.width_original / layer.width : 1;
		if (!isFinite(scale_x) || scale_x <= 0) scale_x = 1;
		var scale_y = layer.height ? layer.height_original / layer.height : 1;
		if (!isFinite(scale_y) || scale_y <= 0) scale_y = 1;

		var to_x = (v) => (v - layer.x) * scale_x;
		var to_y = (v) => (v - layer.y) * scale_y;

		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.fillStyle = config.COLOR;
		ctx.imageSmoothingEnabled = false;

		var x = to_x(mouse.x);
		var y = to_y(mouse.y);
		var nib_size = Math.max(1, Math.round(size * scale_x));
		var has_last = mouse.last_x !== false && mouse.last_x != null
			&& mouse.last_y !== false && mouse.last_y != null;

		if (is_move && has_last) {
			var nibs = stroke_nibs(to_x(mouse.last_x), to_y(mouse.last_y), x, y, nib_size);
			for (var i = 0; i < nibs.length; i++) {
				ctx.fillRect(nibs[i].x, nibs[i].y, nibs[i].size, nibs[i].size);
			}
		}
		else {
			var nib = nib_origin(x, y, nib_size);
			ctx.fillRect(nib.x, nib.y, nib.size, nib.size);
		}

		ctx.restore();
	}

	/** the gesture exists only here: pencil selected, pixel mode on, cursor over the canvas */
	right_erase_applies(e) {
		return config.TOOL.name == this.name
			&& config.PIXEL_MODE == true
			&& (e.target.id == 'canvas_minipaint' || e.target.id == 'main_wrapper');
	}

	on_contextmenu(e) {
		//suppress the browser menu only where the erase gesture lives - everywhere else the
		//right button still belongs to the browser
		if (this.right_erase_applies(e)) {
			e.preventDefault();
		}
	}

	async right_erase_start(e) {
		if (e.button !== 2 || this.right_erasing || !this.right_erase_applies(e)) {
			return;
		}

		var mouse = this.get_mouse_info(e);
		this.right_erasing = true;
		this.right_pointer_down = true;

		if (config.layer.type != 'image' || config.layer.is_vector == true) {
			//Convert rather than refusing - the same decision as the eraser proper, and a pencil
			//layer is exactly the vector case: erasing from it means rasterizing it
			var ready = await this.rasterize_active_layer('erased');
			if (ready == false) {
				this.right_erasing = false;
				return;
			}
		}

		var image = config.layer.link;
		if (image != null && image.complete === false && typeof image.decode === 'function') {
			//the rasterize swaps in an image built from a data URL, and drawing it before it has
			//decoded snapshots a BLANK canvas - which the mouseup then commits, erasing the whole
			//layer. The Background Eraser hit this identical trap; the wait is the fix both times.
			try {
				await image.decode();
			}
			catch (err) {
				this.right_erasing = false;
				return;
			}
		}

		//a working copy, shown live through link_canvas - the erase tool's pattern
		this.eraseCanvas = document.createElement('canvas');
		this.eraseCanvas.width = config.layer.width_original;
		this.eraseCanvas.height = config.layer.height_original;
		this.eraseCtx = this.eraseCanvas.getContext('2d');
		this.eraseCtx.drawImage(config.layer.link, 0, 0);

		this.erase_pixels(mouse, false);

		config.layer.link_canvas = this.eraseCanvas;
		config.need_render = true;

		if (this.right_pointer_down == false) {
			//released while the layer was converting: keep the click rather than dropping it
			this.right_erase_end(e);
		}
	}

	right_erase_move(e) {
		if (this.right_erasing == false || this.eraseCtx == null) {
			return;
		}

		this.erase_pixels(this.get_mouse_info(e), true);
		config.need_render = true;
	}

	right_erase_end(e) {
		this.right_pointer_down = false;

		if (this.right_erasing == false || this.eraseCanvas == null) {
			return;
		}

		delete config.layer.link_canvas;

		app.State.do_action(
			new app.Actions.Bundle_action('pencil_erase', 'Pencil Erase', [
				new app.Actions.Update_layer_image_action(this.eraseCanvas)
			])
		);

		this.eraseCanvas = null;
		this.eraseCtx = null;
		this.right_erasing = false;
	}

	/**
	 * Clear whole pixels at the cursor - the eraser's pixel-mode semantics exactly: square nib,
	 * full alpha, gaps between fast-drag points filled along the line.
	 *
	 * @param {object} mouse
	 * @param {boolean} is_move
	 */
	erase_pixels(mouse, is_move) {
		var ctx = this.eraseCtx;
		var layer = config.layer;
		var size = parseInt(this.getParams().size) || 1;

		var scale_x = layer.width ? layer.width_original / layer.width : 1;
		var scale_y = layer.height ? layer.height_original / layer.height : 1;
		if (!isFinite(scale_x) || scale_x <= 0) scale_x = 1;
		if (!isFinite(scale_y) || scale_y <= 0) scale_y = 1;

		var to_image_x = (v) => (v - layer.x) * scale_x;
		var to_image_y = (v) => (v - layer.y) * scale_y;

		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalCompositeOperation = 'destination-out';
		//opaque: anything less leaves partial alpha, which is the ghost that reads as "not erasing"
		ctx.fillStyle = 'rgba(255, 255, 255, 1)';
		ctx.imageSmoothingEnabled = false;

		var x = to_image_x(mouse.x);
		var y = to_image_y(mouse.y);
		var nib_size = Math.max(1, Math.round(size * scale_x));
		var has_last = mouse.last_x !== false && mouse.last_x != null
			&& mouse.last_y !== false && mouse.last_y != null;

		if (is_move && has_last) {
			var nibs = stroke_nibs(to_image_x(mouse.last_x), to_image_y(mouse.last_y), x, y, nib_size);
			for (var i = 0; i < nibs.length; i++) {
				ctx.fillRect(nibs[i].x, nibs[i].y, nibs[i].size, nibs[i].size);
			}
		}
		else {
			var nib = nib_origin(x, y, nib_size);
			ctx.fillRect(nib.x, nib.y, nib.size, nib.size);
		}

		ctx.restore();
	}

	dragMove(event) {
		if (config.TOOL.name != this.name)
			return;
		if (this.roll_painting) {
			this.roll_paint_move(this.get_mouse_info(event));
			return;
		}
		if (this.roll_paint_applies()) {
			//roll mode owns the pencil entirely: a drag whose start was refused (decode failure,
			//commit still landing) must fizzle, not hand its tail to the vector path
			return;
		}
		this.mousemove(event);
	}

	pointerdown(e) {
		// Devices that don't actually support pen pressure can give 0.5 as a false reading.
		// It is highly unlikely a real pen will read exactly 0.5 at the start of a stroke.
		if (e.pressure && e.pressure !== 0 && e.pressure !== 0.5 && e.pressure <= 1) {
			this.pressure_supported = true;
			this.pointer_pressure = e.pressure;
		} else {
			this.pressure_supported = false;
		}
	}

	pointermove(e) {
		// Pressure of exactly 1 seems to be an input error, sometimes I see it when lifting the pen
		// off the screen when pressure reading should be near 0.
		if (this.pressure_supported && e.pressure < 1) {
			this.pointer_pressure = e.pressure;
		}
	}

	mousedown(e) {
		var mouse = this.get_mouse_info(e);
		if (mouse.click_valid == false)
			return;

		if (this.roll_paint_applies()) {
			//PIANO ROLL MODE PAINTS THE LAYER, NOT A STACK. The normal pencil grows a vector layer
			//per stroke, which is right for drawings and wrong for a roll - a roll is one flat
			//image whose pixels are notes, and it stays one layer however much is drawn on it.
			//Same working-copy pattern as the right-button erase below, with paint instead.
			this.roll_paint_start(mouse);
			return;
		}

		var params_hash = this.get_params_hash();
		var opacity = Math.round(config.ALPHA / 255 * 100);
		
		if (config.layer.type != this.name || params_hash != this.params_hash) {
			//register new object - current layer is not ours or params changed
			this.layer = {
				type: this.name,
				data: [],
				opacity: opacity,
				params: this.clone(this.getParams()),
				status: 'draft',
				render_function: [this.name, 'render'],
				x: 0,
				y: 0,
				width: config.WIDTH,
				height: config.HEIGHT,
				hide_selection_if_active: true,
				rotate: null,
				is_vector: true,
				color: config.COLOR
			};
			app.State.do_action(
				new app.Actions.Bundle_action('new_pencil_layer', 'New Pencil Layer', [
					new app.Actions.Insert_layer_action(this.layer)
				])
			);
			this.params_hash = params_hash;
		}
		else {
			//continue adding layer data, just register break
			const new_data = JSON.parse(JSON.stringify(config.layer.data));
			new_data.push(null);
			app.State.do_action(
				new app.Actions.Bundle_action('update_pencil_layer', 'Update Pencil Layer', [
					new app.Actions.Update_layer_action(config.layer.id, {
						data: new_data
					})
				])
			);
		}
	}

	mousemove(e) {
		var mouse = this.get_mouse_info(e);
		var params = this.getParams();
		if (mouse.is_drag == false)
			return;
		if (mouse.click_valid == false) {
			return;
		}

		//ROLL ROUTING LIVES HERE, NOT IN dragMove. The base class wires mousemove events straight
		//to THIS method (default_dragMove calls this.mousemove) - the dragMove override above it
		//is never on the mouse path, and routing placed there quietly never ran: a held drag in
		//roll mode painted only its first pixel, every later move falling through to the vector
		//code below. The field crash's stack named default_dragMove -> mousemove, which is the
		//breadcrumb that found this.
		if (this.roll_painting) {
			this.roll_paint_move(mouse);
			return;
		}
		if (this.roll_paint_applies()) {
			//a drag whose start was refused fizzles; it does not become vector strokes
			return;
		}

		//detect line size
		var size = params.size;
		var new_size = size;

		if (params.pressure == true && this.pressure_supported) {
			new_size = size * this.pointer_pressure * 2;
		}

		if (config.layer == null || config.layer.data == null
			|| typeof config.layer.data.push !== 'function') {
			//the active layer is not a pencil layer - a tool/mode switch mid-drag can do this,
			//and pushing stroke points into an image layer is a crash, not a stroke
			return;
		}

		//more data
		config.layer.data.push([
			Math.ceil(mouse.x - config.layer.x),
			Math.ceil(mouse.y - config.layer.y),
			new_size
		]);
		this.Base_layers.render();
	}

	mouseup(e) {
		if (this.roll_painting) {
			this.roll_paint_end();
			return;
		}
		var mouse = this.get_mouse_info(e);
		var params = this.getParams();
		if (mouse.click_valid == false) {
			config.layer.status = null;
			return;
		}

		//detect line size
		var size = params.size;
		var new_size = size;

		if (params.pressure == true && this.pressure_supported) {
			new_size = size * this.pointer_pressure * 2;
		}

		if (config.layer == null || config.layer.data == null
			|| typeof config.layer.data.push !== 'function') {
			//the active layer is not a pencil layer - a tool/mode switch mid-drag can do this,
			//and pushing stroke points into an image layer is a crash, not a stroke
			return;
		}

		//more data
		config.layer.data.push([
			Math.ceil(mouse.x - config.layer.x),
			Math.ceil(mouse.y - config.layer.y),
			new_size
		]);

		this.check_dimensions();

		config.layer.status = null;
		this.Base_layers.render();
	}

	render(ctx, layer) {
		this.render_aliased(ctx, layer);
	}
	
	/**
	 * draw without antialiasing, sharp, ugly mode.
	 *
	 * @param {object} ctx
	 * @param {object} layer
	 */
	render_aliased(ctx, layer) {
		if (layer.data.length == 0)
			return;

		var params = layer.params;
		var data = layer.data;
		var n = data.length;
		var size = params.size;

		//set styles
		ctx.fillStyle = layer.color;
		ctx.strokeStyle = layer.color;
		ctx.translate(layer.x, layer.y);

		//draw
		ctx.beginPath();
		ctx.moveTo(data[0][0], data[0][1]);
		for (var i = 1; i < n; i++) {
			if (data[i] === null) {
				//break
				ctx.beginPath();
			}
			else {
				//line
				size = data[i][2];
				if(size == undefined){
					size = 1;
				}

				if (data[i - 1] == null) {
					//exception - point
					ctx.fillRect(
						data[i][0] - Math.floor(size / 2) - 1,
						data[i][1] - Math.floor(size / 2) - 1,
						size,
						size
					);
				}
				else {
					//lines
					ctx.beginPath();
					this.draw_simple_line(
						ctx,
						data[i - 1][0],
						data[i - 1][1],
						data[i][0],
						data[i][1],
						size
					);
				}
			}
		}
		if (n == 1 || data[1] == null) {
			//point
			ctx.beginPath();
			ctx.fillRect(
				data[0][0] - Math.floor(size / 2) - 1,
				data[0][1] - Math.floor(size / 2) - 1,
				size,
				size
			);
		}

		ctx.translate(-layer.x, -layer.y);
	}

	/**
	 * draws line without aliasing
	 *
	 * @param {object} ctx
	 * @param {int} from_x
	 * @param {int} from_y
	 * @param {int} to_x
	 * @param {int} to_y
	 * @param {int} size
	 */
	draw_simple_line(ctx, from_x, from_y, to_x, to_y, size) {
		var dist_x = from_x - to_x;
		var dist_y = from_y - to_y;
		var distance = Math.sqrt((dist_x * dist_x) + (dist_y * dist_y));
		var radiance = Math.atan2(dist_y, dist_x);

		for (var j = 0; j < distance; j++) {
			var x_tmp = Math.round(to_x + Math.cos(radiance) * j) - Math.floor(size / 2) - 1;
			var y_tmp = Math.round(to_y + Math.sin(radiance) * j) - Math.floor(size / 2) - 1;

			ctx.fillRect(x_tmp, y_tmp, size, size);
		}
	}

	/**
	 * recalculate layer x, y, width and height values.
	 */
	check_dimensions() {
		if(config.layer.data.length == 0)
			return;

		//find bounds
		var data = JSON.parse(JSON.stringify(config.layer.data)); // Deep copy for history
		var min_x = data[0][0];
		var min_y = data[0][1];
		var max_x = data[0][0];
		var max_y = data[0][1];
		for(var i in data){
			if(data[i] === null)
				continue;
			min_x = Math.min(min_x, data[i][0]);
			min_y = Math.min(min_y, data[i][1]);
			max_x = Math.max(max_x, data[i][0]);
			max_y = Math.max(max_y, data[i][1]);
		}

		//move current data
		for(var i in data){
			if(data[i] === null)
				continue;
			data[i][0] = data[i][0] - min_x;
			data[i][1] = data[i][1] - min_y;
		}

		//change layers bounds
		app.State.do_action(
			new app.Actions.Update_layer_action(config.layer.id, {
				x: config.layer.x + min_x,
				y: config.layer.y + min_y,
				width: max_x - min_x,
				height: max_y - min_y,
				data
			}),
			{
				merge_with_history: ['new_pencil_layer', 'update_pencil_layer']
			}
		);
	}

}

export default Pencil_class;
