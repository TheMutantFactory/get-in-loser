/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * The second view: an isometric preview of the voxel model with the current slice picked out.
 *
 * The editing canvas can only ever show one flat slice, which leaves two questions unanswered -
 * what does the model actually look like, and where in it am I painting. This panel answers both,
 * and carries the controls for moving the slice and turning the model.
 */

import config from './../../config.js';
import Helper_class from './../../libs/helpers.js';
import {AXES, AXIS_LABELS, unpack, get_voxel, slice_dimensions} from './../voxel.js';
import {draw_order, project, bounds, slice_quad, fit_scale, FACE_CORNERS, visible_walls} from './../voxel-view.js';

var instance = null;

var template = `
	<div class="voxel_preview_wrapper">
		<canvas width="176" height="176" id="canvas_voxel" title="Drag to turn the model"></canvas>
	</div>
	<div class="voxel_resize_grip" id="voxel_resize_grip" title="Drag to resize the preview"></div>
	<div class="voxel_controls">
		<div class="details">
			<button type="button" title="Turn the model left" class="layer_add" id="voxel_orbit_left">&#8630;</button>
			<button type="button" title="Turn the model right" class="layer_add" id="voxel_orbit_right">&#8631;</button>
		</div>
		<div class="ui_button_group voxel_axes" id="voxel_axes"></div>
		<div class="details voxel_slice_row">
			<button type="button" title="Previous slice" class="layer_add" id="voxel_slice_down">-</button>
			<span class="voxel_slice_label" id="voxel_slice_label">-</span>
			<button type="button" title="Next slice" class="layer_add" id="voxel_slice_up">+</button>
		</div>
		<input id="voxel_slice_range" type="range" value="0" min="0" max="0" step="1" />
		<div class="details voxel_onion_row">
			<button type="button" title="Show the neighbouring slices faintly" class="layer_add" id="voxel_onion">Onion</button>
			<button type="button" title="Fewer neighbours" class="layer_add" id="voxel_onion_less">-</button>
			<span class="voxel_slice_label" id="voxel_onion_label">1</span>
			<button type="button" title="More neighbours" class="layer_add" id="voxel_onion_more">+</button>
		</div>
	</div>
`;

/**
 * GUI class responsible for the voxel block on the right sidebar
 */
class GUI_voxel_class {

	constructor(GUI_class) {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		if (GUI_class != undefined) {
			this.GUI = GUI_class;
		}
		this.ctx = null;
		this.Helper = new Helper_class();
	}

	render_main_voxel() {
		var target = document.getElementById('toggle_voxel');
		if (target == null) {
			return;
		}

		target.innerHTML = template;
		this.ctx = document.getElementById('canvas_voxel').getContext('2d');
		this.size_canvas();
		this.ctx.imageSmoothingEnabled = false;

		document.getElementById('voxel_axes').innerHTML = AXES.map(function (axis) {
			return '<button type="button" class="ui_icon_button voxel_axis" data-axis="' + axis
				+ '" title="Slice from the ' + AXIS_LABELS[axis].toLowerCase() + '">'
				+ AXIS_LABELS[axis] + '</button>';
		}).join('');

		this.set_events();
		this.render_voxel();
	}

	/**
	 * The preview fills the panel's width, and stands as tall as it was last dragged to.
	 *
	 * The backing store is sized here, not in CSS - a stretched canvas is a blurry one, and the
	 * whole point of a bigger preview is seeing the voxels more clearly.
	 */
	size_canvas() {
		var canvas = this.ctx.canvas;
		var wrapper = canvas.parentElement;
		var width = Math.max(120, (wrapper && wrapper.clientWidth) || 176);
		var height = parseInt(this.Helper.getCookie('voxel_preview_height'), 10);

		if (isNaN(height)) {
			height = 176;
		}

		canvas.width = width;
		canvas.height = Math.max(120, Math.min(600, height));
		//the context forgets this on resize
		this.ctx.imageSmoothingEnabled = false;
	}

	/**
	 * A render for the main paint loop to call: at most one per animation frame, and only while a
	 * voxel model exists. The paint loop runs on every stroke movement, and the whole point is
	 * that the preview keeps up with it.
	 */
	render_voxel_throttled() {
		var _this = this;

		if (config.voxel == null || config.voxel.volume == null || this.render_queued === true) {
			return;
		}

		this.render_queued = true;
		requestAnimationFrame(function () {
			_this.render_queued = false;
			_this.render_voxel();
		});
	}

	set_events() {
		var _this = this;
		var voxel = function () {
			return _this.GUI.modules ? _this.GUI.modules['tools/voxel'] : null;
		};

		//FREE ROTATION - drag the preview itself (field report b92e7706). The orbit buttons still
		//snap to quarter turns; dragging goes anywhere between.
		var canvas = document.getElementById('canvas_voxel');
		var drag = null;
		canvas.addEventListener('pointerdown', function (e) {
			if (config.voxel == null || config.voxel.volume == null) {
				return;
			}
			drag = {x: e.clientX, yaw: config.voxel.yaw || 0};
			try {
				canvas.setPointerCapture(e.pointerId);
			}
			catch (err) {
				//a pointer the browser is not tracking cannot be captured; the drag still works,
				//it just will not follow the cursor outside the canvas
			}
			canvas.style.cursor = 'grabbing';
		});
		canvas.addEventListener('pointermove', function (e) {
			if (drag == null) {
				return;
			}
			//0.75 degrees per pixel: a drag across the whole panel is about half a turn. The sign
			//is the grab metaphor, and the geometry says which sign that is: the projected x of
			//the nearest corner moves as -sin(yaw), so yaw must DECREASE as the cursor moves right
			//for the face under the cursor to follow it. It shipped increasing - "the horizontal
			//panning is flipped", said the field, correctly.
			config.voxel.yaw = ((drag.yaw - (e.clientX - drag.x) * 0.75) % 360 + 360) % 360;
			_this.render_voxel();
		});
		var drag_end = function () {
			drag = null;
			canvas.style.cursor = '';
		};
		canvas.addEventListener('pointerup', drag_end);
		canvas.addEventListener('pointercancel', drag_end);

		//RESIZE - drag the grip under the preview to give the model more room (same report). The
		//width already fills the panel; the height is the dimension a sidebar has to spare.
		var grip = document.getElementById('voxel_resize_grip');
		var resizing = null;
		grip.addEventListener('pointerdown', function (e) {
			resizing = {y: e.clientY, h: _this.ctx.canvas.height};
			try {
				grip.setPointerCapture(e.pointerId);
			}
			catch (err) {
				//as above
			}
			e.preventDefault();
		});
		grip.addEventListener('pointermove', function (e) {
			if (resizing == null) {
				return;
			}
			var h = Math.max(120, Math.min(600, resizing.h + (e.clientY - resizing.y)));
			_this.Helper.setCookie('voxel_preview_height', h);
			_this.size_canvas();
			_this.render_voxel();
		});
		grip.addEventListener('pointerup', function () { resizing = null; });
		grip.addEventListener('pointercancel', function () { resizing = null; });

		document.getElementById('voxel_orbit_left').addEventListener('click', function () {
			var v = voxel(); if (v) v.orbit_left();
		}, false);
		document.getElementById('voxel_orbit_right').addEventListener('click', function () {
			var v = voxel(); if (v) v.orbit_right();
		}, false);
		document.getElementById('voxel_slice_down').addEventListener('click', function () {
			var v = voxel(); if (v) v.previous_slice();
		}, false);
		document.getElementById('voxel_slice_up').addEventListener('click', function () {
			var v = voxel(); if (v) v.next_slice();
		}, false);
		document.getElementById('voxel_slice_range').addEventListener('change', function () {
			var v = voxel(); if (v) v.set_slice(parseInt(this.value, 10));
		}, false);
		document.getElementById('voxel_onion').addEventListener('click', function () {
			var v = voxel(); if (v) v.onion_skin();
		}, false);
		document.getElementById('voxel_onion_less').addEventListener('click', function () {
			var v = voxel();
			if (v && config.voxel && config.voxel.onion) {
				var n = config.voxel.onion.before - 1;
				v.set_onion_depth(n, n);
			}
		}, false);
		document.getElementById('voxel_onion_more').addEventListener('click', function () {
			var v = voxel();
			if (v && config.voxel && config.voxel.onion) {
				var n = config.voxel.onion.before + 1;
				v.set_onion_depth(n, n);
			}
		}, false);
		document.getElementById('voxel_axes').addEventListener('click', function (e) {
			var button = e.target.closest ? e.target.closest('.voxel_axis') : null;
			var v = voxel();
			if (button && v) {
				v.set_axis(button.dataset.axis);
			}
		}, false);
	}

	/**
	 * Redraw the preview and bring the controls in line with the state.
	 */
	render_voxel() {
		if (this.ctx == null) {
			return false;
		}

		var canvas = this.ctx.canvas;
		this.ctx.clearRect(0, 0, canvas.width, canvas.height);

		var state = config.voxel;
		if (state == null || state.volume == null) {
			this.render_empty();
			return false;
		}

		this.render_controls(state);
		this.render_model(state);

		return true;
	}

	render_empty() {
		var canvas = this.ctx.canvas;
		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
		this.ctx.font = '11px sans-serif';
		this.ctx.textAlign = 'center';
		this.ctx.fillText('No voxel model', canvas.width / 2, canvas.height / 2);

		var label = document.getElementById('voxel_slice_label');
		if (label) {
			label.textContent = '-';
		}
	}

	/**
	 * @param {object} state config.voxel
	 */
	render_controls(state) {
		var dims = slice_dimensions(state.volume, state.axis);

		var label = document.getElementById('voxel_slice_label');
		if (label) {
			label.textContent = (state.slice + 1) + ' / ' + dims.count;
		}

		var range = document.getElementById('voxel_slice_range');
		if (range) {
			range.max = Math.max(0, dims.count - 1);
			range.value = state.slice;
		}

		var onion = document.getElementById('voxel_onion');
		var onion_label = document.getElementById('voxel_onion_label');
		if (onion && state.onion) {
			onion.setAttribute('aria-pressed', state.onion.enabled ? 'true' : 'false');
			onion.classList.toggle('active', !!state.onion.enabled);
		}
		if (onion_label && state.onion) {
			onion_label.textContent = String(state.onion.before);
		}

		var buttons = document.querySelectorAll('.voxel_axis');
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].setAttribute('aria-pressed', buttons[i].dataset.axis === state.axis ? 'true' : 'false');
		}
	}

	/**
	 * @param {object} state config.voxel
	 */
	render_model(state) {
		var canvas = this.ctx.canvas;
		//the live slice composited in, so the preview follows the pencil instead of the commits
		var mod = this.GUI && this.GUI.modules ? this.GUI.modules['tools/voxel'] : null;
		var vol = (mod && mod.live_volume ? mod.live_volume() : null) || state.volume;
		var view = {yaw: state.yaw, w: vol.w, d: vol.d, scale: 1};

		view.scale = fit_scale(vol, view, {w: canvas.width, h: canvas.height}, 6);

		var b = bounds(vol, view);
		//centre the model in the panel, and keep the framing fixed while drawing
		var ox = canvas.width / 2 - (b.min_x + b.max_x) / 2;
		var oy = canvas.height / 2 - (b.min_y + b.max_y) / 2;

		this.draw_voxels(vol, view, ox, oy);
		this.draw_slice_plane(state, view, ox, oy);
	}

	/**
	 * Back to front, three faces each - top, left, right. Shading the sides is what makes a stack
	 * of cubes read as solid rather than as a flat blob of colour.
	 */
	draw_voxels(vol, view, ox, oy) {
		var order = draw_order(vol, view, get_voxel);
		//which walls face the camera - and how brightly - now follows the yaw continuously, so a
		//half-turned model is still a closed solid with sensible shading, not a fixed pair of faces
		var walls = visible_walls(view.yaw);

		for (var i = 0; i < order.length; i++) {
			var v = order[i];
			var c = unpack(v.value);

			this.fill_face(this.face_points(v, FACE_CORNERS.top, view, ox, oy), c, 1);
			for (var f = 0; f < walls.length; f++) {
				this.fill_face(this.face_points(v, FACE_CORNERS[walls[f].face], view, ox, oy), c, walls[f].lit);
			}
		}
	}

	/**
	 * Project one face of one voxel.
	 *
	 * @param {object} v keys x, y, z
	 * @param {array} corners offsets from FACE_CORNERS
	 * @param {object} view
	 * @param {number} ox
	 * @param {number} oy
	 * @returns {array} [[x, y], ...]
	 */
	face_points(v, corners, view, ox, oy) {
		var out = [];

		for (var i = 0; i < corners.length; i++) {
			var q = project(v.x + corners[i][0], v.y + corners[i][1], v.z + corners[i][2], view);
			out.push([q.sx + ox, q.sy + oy]);
		}

		return out;
	}

	/**
	 * @param {array} points [[x,y], ...]
	 * @param {object} colour keys r,g,b,a
	 * @param {number} shade multiplier
	 */
	fill_face(points, colour, shade) {
		var ctx = this.ctx;

		ctx.beginPath();
		ctx.moveTo(points[0][0], points[0][1]);
		for (var i = 1; i < points.length; i++) {
			ctx.lineTo(points[i][0], points[i][1]);
		}
		ctx.closePath();

		ctx.fillStyle = 'rgba(' + Math.round(colour.r * shade) + ',' + Math.round(colour.g * shade)
			+ ',' + Math.round(colour.b * shade) + ',' + (colour.a / 255) + ')';
		ctx.fill();
	}

	/**
	 * The whole reason for the second view: where the slice being painted actually sits.
	 */
	draw_slice_plane(state, view, ox, oy) {
		var ctx = this.ctx;
		var quad = slice_quad(state.volume, state.axis, state.slice, view);

		ctx.save();
		ctx.beginPath();
		ctx.moveTo(quad[0].sx + ox, quad[0].sy + oy);
		for (var i = 1; i < quad.length; i++) {
			ctx.lineTo(quad[i].sx + ox, quad[i].sy + oy);
		}
		ctx.closePath();

		//drawn OVER the model rather than into it: the point is to be findable, not realistic
		ctx.fillStyle = 'rgba(0, 255, 255, 0.18)';
		ctx.strokeStyle = '#00ffff';
		ctx.lineWidth = 1;
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

}

export default GUI_voxel_class;
