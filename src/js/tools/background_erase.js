import app from './../app.js';
import config from './../config.js';
import Base_tools_class from './../core/base-tools.js';
import Base_layers_class from './../core/base-layers.js';
import { remove_background } from './../core/background-removal.js';
import alertify from './../../../node_modules/alertifyjs/build/alertify.min.js';

/**
 * Background Eraser: you say where the background is, instead of the app guessing.
 *
 * WHY THIS EXISTS ALONGSIDE Tools > Remove Background. The automatic one has to work out which
 * colours are background by reading the border, and there is a case it provably cannot do: when the
 * subject is closer to the background than the background is to itself. Measured on a test scene, a
 * pale shirt sat 18.5 from the wall beside it while the wall's own top-to-bottom spread was 23.3 -
 * there is no threshold to put between them, and every automatic run lost most of the subject. The
 * same scene, with three clicks on the wall: 0.1% of the subject lost.
 *
 * THE CONTROL THAT MATTERS HERE IS SENSITIVITY, NOT A COLOUR DISTANCE. Once somebody has pointed at
 * the background, the question is no longer "what colour is it" but "how far does that region go" -
 * and the answer is "until the colour changes abruptly". A hard edge between two SIMILAR colours is
 * invisible to a colour threshold and obvious to a step test: on that same scene the step across the
 * shirt's edge was 9.93 while the steps within the wall's gradient were 0.00. So the slider governs
 * the step, and the colour tolerance is left generous.
 */
class Background_erase_class extends Base_tools_class {

	constructor(ctx) {
		super();
		this.Base_layers = new Base_layers_class();
		this.ctx = ctx;
		this.name = 'background_erase';
		this.working = false;

		//marks accumulate, so a second click corrects the first rather than starting again
		this.seeds = [];
		this.protect = [];
		this.snapshot = null;
		this.layer_id = null;
	}

	load() {
		var _this = this;

		document.addEventListener('mousedown', function (event) {
			_this.dragStart(event);
		});
		document.addEventListener('touchstart', function (event) {
			_this.dragStart(event);
		});
	}

	dragStart(event) {
		if (config.TOOL.name != this.name) {
			return;
		}
		this.mousedown(event);
	}

	mousedown(e) {
		var mouse = this.get_mouse_info(e);
		if (mouse.click_valid == false) {
			return;
		}
		if (config.layer.rotate || 0 > 0) {
			alertify.error('Background erase on a rotated object is disabled. Please rasterize first.');
			return;
		}

		//COPY THE COORDINATES NOW. get_mouse_info hands back the live config.mouse object, not a
		//reading of it, and apply() awaits a possible rasterize before it looks at them - by which
		//time they have moved on. This is why the first click of a cutout converted the layer and
		//then appeared to do nothing at all.
		//holding shift marks the SUBJECT instead - the correction for when a click took too much
		this.apply(mouse.x, mouse.y, e.shiftKey === true || e.altKey === true);
	}

	/** Picking the tool up again starts a new cutout rather than continuing an old one. */
	on_activate() {
		this.forget();
	}

	forget() {
		this.seeds = [];
		this.protect = [];
		this.snapshot = null;
		//the tool can be picked up before any layer exists, and on_activate runs then too
		this.layer_id = config.layer != null ? config.layer.id : null;
	}

	/**
	 * Marks describe one particular layer, so moving to another one abandons them.
	 *
	 * THIS USED TO COMPARE config.layer.link AND THAT WAS WRONG. The link is replaced by anything
	 * that rewrites the layer - including this tool's own action, and including the automatic
	 * rasterize on the very first click - so "the image changed underneath us" fired on the second
	 * click of every single cutout, threw away the mark that was already there, and left shift-click
	 * with nothing to correct. The layer's identity is the thing that actually needs watching.
	 */
	reset_if_stale() {
		if (config.layer == null || config.layer.id !== this.layer_id) {
			this.forget();
		}
	}

	async apply(mouse_x, mouse_y, is_protect) {
		if (this.working == true) {
			return;
		}

		if (config.layer.type != 'image' || config.layer.is_vector == true) {
			//Convert rather than refusing - see Base_tools.rasterize_active_layer
			var ready = await this.rasterize_active_layer('erased');
			if (ready == false) {
				return;
			}
		}

		this.reset_if_stale();

		var x = Math.round(this.adaptSize(Math.round(mouse_x) - config.layer.x, 'width'));
		var y = Math.round(this.adaptSize(Math.round(mouse_y) - config.layer.y, 'height'));

		var width = config.layer.width_original;
		var height = config.layer.height_original;

		if (!(width > 0) || !(height > 0)) {
			return;
		}

		if (x < 0 || y < 0 || x >= width || y >= height) {
			return;
		}

		if (this.snapshot == null || this.snapshot.width !== width || this.snapshot.height !== height) {
			//Everything is recomputed from this every time, which is what lets a later mark undo the
			//effect of an earlier one instead of only ever taking more away.
			//
			//RETAKE IT RATHER THAN GIVE UP. A mismatch here used to return silently, and since the
			//very first click of a cutout arrives while the automatic rasterize is still settling -
			//new layer, dimensions not yet what they will be - that first click did nothing at all
			//and the tool looked broken until you clicked a second time. A stale snapshot is a
			//reason to take a fresh one.
			if (this.snapshot != null) {
				//it described a differently-sized picture, so the marks on it mean nothing now
				this.seeds = [];
				this.protect = [];
			}

			var image = config.layer.link;
			if (image != null && image.complete === false && typeof image.decode === 'function') {
				//the rasterize swaps in an image built from a data URL, which is not decoded yet
				try {
					await image.decode();
				}
				catch (e) {
					return;
				}
			}

			var keep = document.createElement('canvas');
			keep.width = width;
			keep.height = height;
			var keep_ctx = keep.getContext('2d');
			keep_ctx.drawImage(image, 0, 0, width, height);
			this.snapshot = keep_ctx.getImageData(0, 0, width, height);
		}

		(is_protect ? this.protect : this.seeds).push([x, y]);

		if (this.seeds.length === 0) {
			//a subject mark on its own has nothing to subtract from
			alertify.warning('Click the background first, then shift-click anything it took by mistake.');
			return;
		}

		this.working = true;

		var params = this.getParams();
		var sensitivity = Math.max(1, parseFloat(params.sensitivity) || 8);

		var result = remove_background(this.snapshot.data, width, height, {
			//generous on purpose: the step limit is what does the work here
			tolerance: Math.max(40, sensitivity * 6),
			step_limit: sensitivity,
			refine: Math.max(0, parseFloat(params.refine) || 0),
			brush: Math.max(1, parseFloat(params.brush) || 3),
			seeds: this.seeds,
			protect: this.protect,
		});

		this.working = false;

		if (result == null || result.removed === 0) {
			alertify.warning('Nothing removed there. Try raising Sensitivity.');
			return;
		}

		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		var ctx = canvas.getContext('2d');
		var out = ctx.createImageData(width, height);
		out.data.set(result.data);
		ctx.putImageData(out, 0, 0);

		app.State.do_action(
			new app.Actions.Bundle_action('background_erase_tool', 'Background Eraser', [
				new app.Actions.Update_layer_image_action(canvas)
			])
		);

	}

}

export default Background_erase_class;
