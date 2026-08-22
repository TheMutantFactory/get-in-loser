import app from './../app.js';
import config from './../config.js';
import Base_tools_class from './../core/base-tools.js';
import Base_layers_class from './../core/base-layers.js';
import alertify from './../../../node_modules/alertifyjs/build/alertify.min.js';
import ImageFilters from './../libs/imagefilters.js';
import Helper_class from './../libs/helpers.js';

class Blur_class extends Base_tools_class {

	constructor(ctx) {
		super();
		this.Base_layers = new Base_layers_class();
		this.Helper = new Helper_class();
		this.ctx = ctx;
		this.name = 'blur';
		this.tmpCanvas = null;
		this.tmpCanvasCtx = null;
		this.started = false;
		this.pointer_down = false;
	}

	load() {
		this.default_events();
	}

	default_dragMove(event) {
		if (config.TOOL.name != this.name)
			return;
		this.mousemove(event);

		//mouse cursor
		var mouse = this.get_mouse_info(event);
		var params = this.getParams();
		this.show_mouse_cursor(mouse.x, mouse.y, params.size, 'circle');
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
			//Convert instead of demanding it - see Base_tools.rasterize_active_layer.
			var ready = await this.rasterize_active_layer('blurred');
			if (ready == false) {
				//empty layer: nothing to work on, and not worth a dialog
				return;
			}
			if (this.pointer_down == false) {
				//released while converting - apply the click and commit it, rather than leaving a
				//stroke that silently did nothing
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
	 * Take a working copy of the layer image and apply the first dab to it.
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

		//do blur
		this.blur_general('click', mouse, params.size, params.strength);

		//register tmp canvas for faster redraw
		config.layer.link_canvas = this.tmpCanvas;
		config.need_render = true;
	}

	mousemove(e) {
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

		//do blur
		this.blur_general('move', mouse, params.size, params.strength);

		//draw draft preview
		config.need_render = true;
	}

	mouseup(e) {
		//cleared before the started check: mousedown may still be awaiting a rasterize and needs
		//to know the button has already been released
		this.pointer_down = false;

		if (this.started == false) {
			return;
		}
		delete config.layer.link_canvas;

		app.State.do_action(
			new app.Actions.Bundle_action('blur_tool', 'Blur Tool', [
				new app.Actions.Update_layer_image_action(this.tmpCanvas)
			])
		);

		//decrease memory
		this.tmpCanvas.width = 1;
		this.tmpCanvas.height = 1;
		this.tmpCanvas = null;
		this.tmpCanvasCtx = null;
	}

	blur_general(type, mouse, size, strength) {
		var ctx = this.tmpCanvasCtx;
		var mouse_x = Math.round(mouse.x) - config.layer.x;
		var mouse_y = Math.round(mouse.y) - config.layer.y;

		//adapt to origin size
		mouse_x = this.adaptSize(mouse_x, 'width');
		mouse_y = this.adaptSize(mouse_y, 'height');
		var size_w = this.adaptSize(size, 'width');
		var size_h = this.adaptSize(size, 'height');

		//find center
		var center_x = mouse_x - Math.round(size_w / 2);
		var center_y = mouse_y - Math.round(size_h / 2);

		//convert float coords to integers
		center_x = Math.round(center_x);
		center_y = Math.round(center_y);
		mouse_x = Math.round(mouse_x);
		mouse_y = Math.round(mouse_y);

		if (type == 'move') {
			strength = strength / 2;
			if (strength < 1)
				strength = 1;
		}

		var imageData = ctx.getImageData(center_x, center_y, size_w, size_h);
		var filtered = ImageFilters.StackBlur(imageData, strength); //add effect
		this.Helper.image_round(this.tmpCanvasCtx, mouse_x, mouse_y, size_w, size_h, filtered);
	}

}
export default Blur_class;
