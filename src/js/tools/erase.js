import app from './../app.js';
import config from './../config.js';
import Base_tools_class from './../core/base-tools.js';
import Base_layers_class from './../core/base-layers.js';
import alertify from './../../../node_modules/alertifyjs/build/alertify.min.js';
import {nib_origin, stroke_nibs} from './../core/pixel-paint.js';

class Erase_class extends Base_tools_class {

	constructor(ctx) {
		super();
		this.Base_layers = new Base_layers_class();
		this.ctx = ctx;
		this.name = 'erase';
		this.tmpCanvas = null;
		this.tmpCanvasCtx = null;
		this.started = false;
		this.pointer_down = false;
	}

	load() {
		this.default_events();
	}

	default_dragMove(event, is_touch) {
		if (config.TOOL.name != this.name)
			return;
		this.mousemove(event, is_touch);

		//mouse cursor
		var mouse = this.get_mouse_info(event);
		var params = this.getParams();
		if (params.circle == true)
			this.show_mouse_cursor(mouse.x, mouse.y, params.size, 'circle');
		else
			this.show_mouse_cursor(mouse.x, mouse.y, params.size, 'rect');
	}

	on_params_update() {
		var params = this.getParams();
		var strict_element = document.querySelector('.attributes #strict');

		if (params.circle == false) {
			//hide strict controls
			strict_element.style.display = 'none';
		}
		else {
			//show strict controls
			strict_element.style.display = 'block';
		}
	}

	async mousedown(e) {
		this.started = false;
		this.pointer_down = true;
		var mouse = this.get_mouse_info(e);
		var params = this.getParams();
		if (mouse.click_valid == false) {
			return;
		}

		if (config.layer.type != 'image' || config.layer.is_vector == true) {
			//"Please convert it to raster to apply this tool" was a dead end reached at the worst
			//moment: draw a stroke, reach for the eraser, get told the thing you just drew cannot
			//be erased. Do the conversion instead of demanding it. It stays its own undo step, so
			//getting the vector stroke back is two ctrl+z - the erase, then the conversion.
			var ready = await this.rasterize_active_layer('erased');
			if (ready == false) {
				//an empty layer. Nothing to erase, and nothing worth interrupting anyone over.
				return;
			}
			if (this.pointer_down == false) {
				//released while the layer was converting: erase the click and commit it, rather
				//than leaving a stroke that silently did nothing
				this.begin_stroke(mouse, params);
				return this.mouseup(e);
			}
		}

		if (config.layer.rotate || 0 > 0) {
			alertify.error('Erase on rotate object is disabled. Please rasterize first.');
			return;
		}
		this.begin_stroke(mouse, params);
	}

	/**
	 * Take a working copy of the layer image and apply the first erase to it.
	 *
	 * @param {object} mouse
	 * @param {object} params
	 */
	begin_stroke(mouse, params) {
		this.started = true;

		//get canvas from layer
		this.tmpCanvas = document.createElement('canvas');
		this.tmpCanvasCtx = this.tmpCanvas.getContext("2d");
		this.tmpCanvas.width = config.layer.width_original;
		this.tmpCanvas.height = config.layer.height_original;
		this.tmpCanvasCtx.drawImage(config.layer.link, 0, 0);

		this.tmpCanvasCtx.scale(
			config.layer.width_original / config.layer.width,
			config.layer.height_original / config.layer.height
		);

		//do erase
		this.erase_general(this.tmpCanvasCtx, 'click', mouse, params.size, params.strict, params.circle);

		//register tmp canvas for faster redraw
		config.layer.link_canvas = this.tmpCanvas;
		config.need_render = true;
	}

	mousemove(e, is_touch) {
		var mouse = this.get_mouse_info(e);
		var params = this.getParams();
		if (mouse.is_drag == false)
			return;
		if (mouse.click_valid == false) {
			return;
		}
		if (this.started == false) {
			return;
		}
		if (mouse.click_x == mouse.x && mouse.click_y == mouse.y) {
			//same coordinates
			return;
		}

		//do erase
		this.erase_general(this.tmpCanvasCtx, 'move', mouse, params.size, params.strict, params.circle, is_touch);

		//draw draft preview
		config.need_render = true;
	}

	mouseup(e) {
		//cleared before the started check: mousedown may still be awaiting a rasterize, and it
		//needs to know the button has already been released
		this.pointer_down = false;

		if (this.started == false) {
			return;
		}
		delete config.layer.link_canvas;

		app.State.do_action(
			new app.Actions.Bundle_action('erase_tool', 'Erase Tool', [
				new app.Actions.Update_layer_image_action(this.tmpCanvas)
			])
		);

		//decrease memory
		this.tmpCanvas.width = 1;
		this.tmpCanvas.height = 1;
		this.tmpCanvas = null;
		this.tmpCanvasCtx = null;
		this.started = false;
	}

	erase_general(ctx, type, mouse, size, strict, is_circle, is_touch) {
		if (config.PIXEL_MODE) {
			//A circular nib with a soft edge subtracts PART of a pixel's alpha, which leaves a
			//ghost and reads as the eraser not working. In pixel mode a pixel is cleared or it is
			//left alone.
			return this.erase_pixel(ctx, type, mouse, size, is_touch);
		}

		var mouse_x = Math.round(mouse.x) - config.layer.x;
		var mouse_y = Math.round(mouse.y) - config.layer.y;
		var alpha = config.ALPHA;
		var mouse_last_x = parseInt(mouse.last_x) - config.layer.x;
		var mouse_last_y = parseInt(mouse.last_y) - config.layer.y;

		ctx.beginPath();
		ctx.lineWidth = size;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		if (alpha < 255)
			ctx.strokeStyle = "rgba(255, 255, 255, " + alpha / 255 / 10 + ")";
		else
			ctx.strokeStyle = "rgba(255, 255, 255, 1)";

		if (is_circle == false) {
			//rectangle
			var size_half = Math.ceil(size / 2);
			if (size == 1) {
				//single cell mode
				mouse_x = Math.floor(mouse.x) - config.layer.x;
				mouse_y = Math.floor(mouse.y) - config.layer.y;
				size_half = 0;
			}
			ctx.save();
			ctx.globalCompositeOperation = 'destination-out';
			ctx.fillStyle = "rgba(255, 255, 255, " + alpha / 255 + ")";
			ctx.fillRect(mouse_x - size_half, mouse_y - size_half, size, size);
			ctx.restore();
		}
		else {
			//circle
			ctx.save();

			if (strict == false) {
				var radgrad = ctx.createRadialGradient(
					mouse_x, mouse_y, size / 8,
					mouse_x, mouse_y, size / 2);
				if (type == 'click')
					radgrad.addColorStop(0, "rgba(255, 255, 255, " + alpha / 255 + ")");
				else if (type == 'move')
					radgrad.addColorStop(0, "rgba(255, 255, 255, " + alpha / 255 / 2 + ")");
				radgrad.addColorStop(1, "rgba(255, 255, 255, 0)");
			}

			//set Composite
			ctx.globalCompositeOperation = 'destination-out';
			if (strict == true)
				ctx.fillStyle = "rgba(255, 255, 255, " + alpha / 255 + ")";
			else
				ctx.fillStyle = radgrad;
			ctx.beginPath();
			ctx.arc(mouse_x, mouse_y, size / 2, 0, Math.PI * 2, true);
			ctx.fill();
			ctx.restore();
		}

		//extra work if mouse moving fast - fill gaps
		if (type == 'move' && is_circle == true && mouse_last_x != false && mouse_last_y != false && is_touch !== true) {
			ctx.save();
			ctx.globalCompositeOperation = 'destination-out';

			ctx.beginPath();
			ctx.moveTo(mouse_last_x, mouse_last_y);
			ctx.lineTo(mouse_x, mouse_y);
			ctx.stroke();

			ctx.restore();
		}
	}

	/**
	 * Pixel mode: clear whole pixels, all of the alpha, none of the neighbours.
	 *
	 * Square nib regardless of the circle setting, and full alpha regardless of the strict setting
	 * - both of those exist to soften the edge, which is the thing that made this look broken.
	 *
	 * @param {object} ctx
	 * @param {string} type 'click' or 'move'
	 * @param {object} mouse
	 * @param {int} size
	 * @param {boolean} is_touch
	 */
	erase_pixel(ctx, type, mouse, size, is_touch) {
		var layer = config.layer;

		//mousedown scaled this context by width_original/width so layer coordinates land on the
		//original image. That scale is a float on any resized layer, and a scaled integer is not
		//an integer - so the transform is reset and the scaling done here, where the result can be
		//snapped afterwards. On an unresized layer both factors are 1 and this changes nothing.
		var scale_x = layer.width ? layer.width_original / layer.width : 1;
		var scale_y = layer.height ? layer.height_original / layer.height : 1;
		if (!isFinite(scale_x) || scale_x <= 0) scale_x = 1;
		if (!isFinite(scale_y) || scale_y <= 0) scale_y = 1;

		var to_image_x = (v) => (v - layer.x) * scale_x;
		var to_image_y = (v) => (v - layer.y) * scale_y;

		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalCompositeOperation = 'destination-out';
		//opaque: destination-out removes as much alpha as it lays down, so anything less than 1
		//leaves the pixel partly painted - which is the ghost that read as "it does not erase"
		ctx.fillStyle = 'rgba(255, 255, 255, 1)';
		ctx.imageSmoothingEnabled = false;

		var x = to_image_x(mouse.x);
		var y = to_image_y(mouse.y);
		var nib_size = Math.max(1, Math.round(size * scale_x));
		var has_last = mouse.last_x !== false && mouse.last_x != null
			&& mouse.last_y !== false && mouse.last_y != null;

		if (type === 'move' && has_last && is_touch !== true) {
			//fill the gap a fast drag leaves between reported points
			var nibs = stroke_nibs(
				to_image_x(mouse.last_x), to_image_y(mouse.last_y), x, y, nib_size
			);
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
}

export default Erase_class;
