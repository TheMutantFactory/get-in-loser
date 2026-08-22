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
import {AXES, AXIS_LABELS, unpack, get_voxel, slice_dimensions} from './../voxel.js';
import {draw_order, project, bounds, slice_quad, fit_scale} from './../voxel-view.js';

var instance = null;

var template = `
	<div class="voxel_preview_wrapper">
		<canvas width="176" height="176" id="canvas_voxel"></canvas>
	</div>
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
	}

	render_main_voxel() {
		var target = document.getElementById('toggle_voxel');
		if (target == null) {
			return;
		}

		target.innerHTML = template;
		this.ctx = document.getElementById('canvas_voxel').getContext('2d');
		this.ctx.imageSmoothingEnabled = false;

		document.getElementById('voxel_axes').innerHTML = AXES.map(function (axis) {
			return '<button type="button" class="ui_icon_button voxel_axis" data-axis="' + axis
				+ '" title="Slice from the ' + AXIS_LABELS[axis].toLowerCase() + '">'
				+ AXIS_LABELS[axis] + '</button>';
		}).join('');

		this.set_events();
		this.render_voxel();
	}

	set_events() {
		var _this = this;
		var voxel = function () {
			return _this.GUI.modules ? _this.GUI.modules['tools/voxel'] : null;
		};

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
		var vol = state.volume;
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
		var ctx = this.ctx;
		var order = draw_order(vol, view, get_voxel);

		for (var i = 0; i < order.length; i++) {
			var v = order[i];
			var c = unpack(v.value);

			//the eight corners this voxel needs, projected once
			var p = function (dx, dy, dz) {
				var q = project(v.x + dx, v.y + dy, v.z + dz, view);
				return [q.sx + ox, q.sy + oy];
			};

			var top = [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)];
			var left = [p(0, 0, 1), p(0, 1, 1), p(1, 1, 1), p(1, 0, 1)];
			var right = [p(1, 0, 1), p(1, 1, 1), p(1, 1, 0), p(1, 0, 0)];

			this.fill_face(top, c, 1);
			this.fill_face(left, c, 0.72);
			this.fill_face(right, c, 0.52);
		}
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
