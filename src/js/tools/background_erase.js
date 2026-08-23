import app from './../app.js';
import config from './../config.js';
import Base_tools_class from './../core/base-tools.js';
import Base_layers_class from './../core/base-layers.js';
import { remove_background } from './../core/background-removal.js';
import { add_point, to_screen, stroke_to_marks } from './../core/scribble.js';
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

		//MARKS ARE KEPT AS STROKES, not one flat list of points. The algorithm only wants the points,
		//but the overlay has to draw them, and drawing a flat list as a single path joins the end of
		//one gesture to the start of the next - a stroke down the left edge and another across the
		//top came back with a diagonal line ruled between them, straight across the subject.
		this.seed_strokes = [];
		this.protect_strokes = [];

		//the gesture in progress, in WORLD coordinates - see core/scribble.js
		this.stroke = [];
		this.stroke_is_protect = false;
		this.drawing = false;
		this.snapshot = null;
		this.layer_id = null;
	}

	load() {
		var _this = this;
		var is_touch = false;

		document.addEventListener('mousedown', function (event) {
			if (is_touch) return;
			_this.dragStart(event);
		});
		document.addEventListener('mousemove', function (event) {
			if (is_touch) return;
			_this.dragMove(event);
		});
		document.addEventListener('mouseup', function (event) {
			if (is_touch) return;
			_this.dragEnd(event);
		});

		document.addEventListener('touchstart', function (event) {
			is_touch = true;
			_this.dragStart(event);
		});
		document.addEventListener('touchmove', function (event) {
			_this.dragMove(event);
		});
		document.addEventListener('touchend', function (event) {
			_this.dragEnd(event);
		});
	}

	dragStart(event) {
		if (config.TOOL.name != this.name) {
			return;
		}

		var mouse = this.get_mouse_info(event);
		if (mouse.click_valid == false) {
			return;
		}
		if (config.layer.rotate || 0 > 0) {
			alertify.error('Background erase on a rotated object is disabled. Please rasterize first.');
			return;
		}

		this.drawing = true;
		this.stroke = [];
		//shift marks the SUBJECT instead - the correction for when a stroke took too much. It is read
		//once, at the start, so a stroke cannot change its mind halfway along.
		this.stroke_is_protect = event.shiftKey === true || event.altKey === true;

		add_point(this.stroke, mouse.x, mouse.y);
	}

	dragMove(event) {
		if (config.TOOL.name != this.name || this.drawing != true) {
			return;
		}

		var mouse = this.get_mouse_info(event);

		if (add_point(this.stroke, mouse.x, mouse.y)) {
			//redraw so the mark appears under the cursor as it is being made
			config.need_render = true;
		}
	}

	dragEnd(event) {
		if (config.TOOL.name != this.name || this.drawing != true) {
			return;
		}

		this.drawing = false;

		var stroke = this.stroke;
		var is_protect = this.stroke_is_protect;
		this.stroke = [];

		if (stroke.length === 0) {
			return;
		}

		config.need_render = true;
		this.apply(stroke, is_protect);
	}

	/**
	 * The stroke being drawn, and the marks already made, painted over the canvas.
	 *
	 * Screen space with the transform reset: the ambient transform mid-render-loop is not the plain
	 * zoom matrix, which is the same reason the pixel grid draws this way.
	 */
	render_overlay(ctx) {
		if (config.layer == null) {
			return;
		}

		var origin = this.Base_layers.get_world_coords(0, 0);
		var view = {origin_x: origin.x, origin_y: origin.y, zoom: config.ZOOM};
		var params = this.getParams();
		var radius = Math.max(1, parseFloat(params.brush) || 3);
		var scale_x = config.layer.width_original > 0
			? config.layer.width / config.layer.width_original
			: 1;

		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalCompositeOperation = 'source-over';
		ctx.filter = 'none';
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		//red takes away, green keeps - the two things the tool does, and the only two it does
		for (var i = 0; i < this.seed_strokes.length; i++) {
			this.draw_marks(ctx, this.seed_strokes[i], 'rgba(255, 90, 90, 0.45)', radius, view, scale_x, true);
		}
		for (var j = 0; j < this.protect_strokes.length; j++) {
			this.draw_marks(ctx, this.protect_strokes[j], 'rgba(80, 220, 130, 0.45)', radius, view, scale_x, true);
		}

		if (this.drawing === true && this.stroke.length > 0) {
			this.draw_marks(ctx, this.stroke,
				this.stroke_is_protect ? 'rgba(80, 220, 130, 0.85)' : 'rgba(255, 90, 90, 0.85)',
				radius, view, scale_x, false);
		}

		ctx.restore();
	}

	/**
	 * @param {Array} points [x, y] pairs
	 * @param {boolean} in_layer_space whether they are layer pixels rather than world coordinates
	 */
	draw_marks(ctx, points, colour, radius, view, scale_x, in_layer_space) {
		if (points.length === 0) {
			return;
		}

		var screen = points.map(function (p) {
			var world_x = in_layer_space ? config.layer.x + p[0] * scale_x : p[0];
			var world_y = in_layer_space ? config.layer.y + p[1] * scale_x : p[1];
			return to_screen(world_x, world_y, view);
		});

		ctx.strokeStyle = colour;
		ctx.lineWidth = Math.max(2, radius * 2 * scale_x * view.zoom);
		ctx.beginPath();
		ctx.moveTo(screen[0].x, screen[0].y);

		for (var i = 1; i < screen.length; i++) {
			ctx.lineTo(screen[i].x, screen[i].y);
		}

		if (screen.length === 1) {
			//a path of one point draws nothing; a round cap needs somewhere to go
			ctx.lineTo(screen[0].x + 0.01, screen[0].y);
		}

		ctx.stroke();
	}

	/**
	 * All the points of all the strokes, which is what the algorithm wants.
	 *
	 * @param {Array} strokes
	 * @returns {Array}
	 */
	flat(strokes) {
		var out = [];
		for (var i = 0; i < strokes.length; i++) {
			for (var j = 0; j < strokes[i].length; j++) {
				out.push(strokes[i][j]);
			}
		}
		return out;
	}

	/** Picking the tool up again starts a new cutout rather than continuing an old one. */
	on_activate() {
		this.forget();
	}

	forget() {
		this.seed_strokes = [];
		this.protect_strokes = [];
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

	/**
	 * @param {Array} stroke [x, y] pairs in WORLD coordinates
	 * @param {boolean} is_protect whether the stroke marks the subject rather than the background
	 */
	async apply(stroke, is_protect) {
		if (this.working == true) {
			return;
		}

		//CLAIMED BEFORE THE FIRST await, not after it. The rasterize below yields, and a second
		//gesture arriving during that window used to sail past this check and run alongside the
		//first - two of them reading and writing the same snapshot and marks.
		this.working = true;

		try {
			await this.apply_stroke(stroke, is_protect);
		}
		finally {
			this.working = false;
		}
	}

	async apply_stroke(stroke, is_protect) {

		if (config.layer.type != 'image' || config.layer.is_vector == true) {
			//Convert rather than refusing - see Base_tools.rasterize_active_layer
			var ready = await this.rasterize_active_layer('erased');
			if (ready == false) {
				return;
			}
		}

		this.reset_if_stale();

		var width = config.layer.width_original;
		var height = config.layer.height_original;

		if (!(width > 0) || !(height > 0)) {
			return;
		}

		//CONVERT ONLY NOW. The stroke was recorded in world coordinates precisely because the
		//rasterize above can replace the layer it would otherwise have been measured against.
		var marks = stroke_to_marks(stroke, {
			x: config.layer.x,
			y: config.layer.y,
			scale_x: config.layer.width / width,
			scale_y: config.layer.height / height,
			width: width,
			height: height,
		});

		if (marks.length === 0) {
			//the whole gesture missed the picture
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
				this.seed_strokes = [];
				this.protect_strokes = [];
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

		(is_protect ? this.protect_strokes : this.seed_strokes).push(marks);

		var seeds = this.flat(this.seed_strokes);
		var protect = this.flat(this.protect_strokes);

		if (seeds.length === 0) {
			//a subject mark on its own has nothing to subtract from
			alertify.warning('Drag over the background first, then shift-drag anything it took by mistake.');
			return;
		}

		var params = this.getParams();
		var sensitivity = Math.max(1, parseFloat(params.sensitivity) || 8);

		var result = remove_background(this.snapshot.data, width, height, {
			//generous on purpose: the step limit is what does the work here
			tolerance: Math.max(40, sensitivity * 6),
			step_limit: sensitivity,
			refine: Math.max(0, parseFloat(params.refine) || 0),
			brush: Math.max(1, parseFloat(params.brush) || 3),
			seeds: seeds,
			protect: protect,
		});

		if (result == null || result.removed === 0) {
			//the marks stay - the setting was wrong, not the gesture, and making it again is a chore
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
