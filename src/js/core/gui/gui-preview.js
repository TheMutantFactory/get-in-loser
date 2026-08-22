/*
 * miniPaint - https://github.com/viliusle/miniPaint
 * author: Vilius L.
 */

import config from './../../config.js';
import Base_layers_class from './../base-layers.js';
import {
	PREVIEW_BOX,
	calc_preview_size,
	calc_active_zone,
	calc_zoom_position,
} from './preview-geometry.js';
import {is_pan_start, is_pan_released, pan_delta} from './../pan.js';
import zoomView from './../../libs/zoomView.js';

var instance = null;

var template = `
	<div class="canvas_preview_wrapper">
		<div class="canvas_preview_inner" id="canvas_preview_inner">
			<div class="transparent-grid" id="canvas_preview_background"></div>
			<canvas width="176" height="176" class="transparent" id="canvas_preview"></canvas>
		</div>
	</div>
	<div class="canvas_preview_details">
		<div class="details">
			<button title="Zoom out" class="layer_add trn" id="zoom_less"">-</button>
			<button title="Reset zoom level"  class="layer_add trn" id="zoom_100">100%</button>
			<button title="Zoom in" class="layer_add trn" id="zoom_more"">+</button>
			<button title="Fit window" class="layer_add trn" id="zoom_fit">Fit</button>
		</div>
		<input id="zoom_range" type="range" value="100" min="50" max="1000" step="50" />
	</div>
`;

/**
 * GUI class responsible for rendering preview on right sidebar
 */
class GUI_preview_class {

	constructor(GUI_class) {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;
		document.getElementById('toggle_preview').innerHTML = template;

		// maximum area the preview canvas may use on the right sidebar
		this.PREVIEW_BOX = {w: PREVIEW_BOX.w, h: PREVIEW_BOX.h};

		// actual preview canvas size - always matches the canvas aspect ratio
		this.PREVIEW_SIZE = {w: PREVIEW_BOX.w, h: PREVIEW_BOX.h};

		this.canvas_offset = {x: 0, y: 0};

		this.zoom_data = {
			x: 0,
			y: 0,
			move_pos: null,
		};

		this.mouse_pressed = false;

		//middle mouse button drag panning
		this.pan_data = {
			active: false,
			last: {x: 0, y: 0},
		};

		this.canvas_preview = null;
		if (GUI_class != undefined) {
			this.GUI = GUI_class;
		}
		this.Base_layers = new Base_layers_class();
	}

	/**
	 * @returns {canvas.context} preview canvas context, recreated whenever the
	 *   preview canvas is resized
	 */
	get_context() {
		if (this.canvas_preview == null) {
			this.canvas_preview = document.getElementById('canvas_preview').getContext('2d');
		}

		return this.canvas_preview;
	}

	render_main_preview() {
		this.canvas_preview = document.getElementById("canvas_preview")
			.getContext("2d");

		this.prepare_canvas();
		config.need_render = true;
		this.set_events();
	}

	set_events() {
		var _this = this;
		var is_touch = false;

		document.addEventListener('mousedown', function (e) {
			_this.mouse_pressed = true;
		}, false);
		document.addEventListener('mouseup', function (e) {
			_this.mouse_pressed = false;
		}, false);
		document.addEventListener('touchstart', function (e) {
			_this.mouse_pressed = true;
		}, false);
		document.addEventListener('touchend', function (e) {
			_this.mouse_pressed = false;
		}, false);
		document.getElementById('zoom_range').addEventListener('input', function (e) {
			_this.set_center_zoom();
			_this.zoom(this.value);
		}, false);
		document.getElementById('zoom_range').addEventListener('change', function (e) {
			//IE11
			if (this.value != config.ZOOM * 100) {
				_this.set_center_zoom();
				_this.zoom(this.value);
			}
		}, false);
		document.getElementById('zoom_less').addEventListener('click', function (e) {
			_this.set_center_zoom();
			_this.zoom(-1);
		}, false);
		document.getElementById('zoom_100').addEventListener('click', function (e) {
			_this.zoom(100);
		}, false);
		document.getElementById('zoom_more').addEventListener('click', function (e) {
			_this.set_center_zoom();
			_this.zoom(+1);
		}, false);
		document.getElementById('zoom_fit').addEventListener('click', function (e) {
			_this.zoom_auto();
		}, false);
		document.getElementById('main_wrapper').addEventListener('wheel', function (e) {
			//zoom with mouse scroll
			e.preventDefault();
			_this.zoom_data.x = e.offsetX;
			_this.zoom_data.y = e.offsetY;
			var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail || -e.deltaY)));
			if (delta > 0)
				_this.zoom(+1, e);
			else
				_this.zoom(-1, e);
		}, false);
		window.addEventListener('resize', function (e) {
			//resize
			config.need_render = true;
		}, false);
		document.getElementById("canvas_preview").addEventListener('mousedown', function (e) {
			if(is_touch)
				return;
			_this.set_zoom_position(e);
		}, false);
		document.getElementById("canvas_preview").addEventListener('mousemove', function (e) {
			if(is_touch)
				return;
			if (_this.mouse_pressed == false)
				return;
			_this.set_zoom_position(e);
		}, false);

		document.getElementById("canvas_preview").addEventListener('touchstart', function (e) {
			is_touch = true;

			//calc canvas position offset
			var bodyRect = document.body.getBoundingClientRect();
			var canvas_el = document.getElementById("canvas_preview").getBoundingClientRect();
			_this.canvas_offset.x = canvas_el.left - bodyRect.left;
			_this.canvas_offset.y = canvas_el.top - bodyRect.top;

			//change zoom offset
			_this.set_zoom_position(e);
		});
		document.getElementById("canvas_preview").addEventListener('touchmove', function (e) {
			//change zoom offset
			if (_this.mouse_pressed == false)
				return;
			_this.set_zoom_position(e);
		});

		this.set_pan_events();
	}

	/**
	 * Hold the scroll wheel (middle mouse button) and drag to pan the image.
	 * Tools only respond to the left button, so the middle one is free.
	 */
	set_pan_events() {
		var _this = this;
		var wrapper = document.getElementById('main_wrapper');

		wrapper.addEventListener('mousedown', function (e) {
			if (is_pan_start(e) == false) {
				return;
			}

			//stop the browser's middle click autoscroll / paste
			e.preventDefault();
			_this.pan_start(e.clientX, e.clientY);
		}, false);

		//middle click otherwise opens links / pastes on some platforms
		wrapper.addEventListener('auxclick', function (e) {
			if (e.button === 1) {
				e.preventDefault();
			}
		}, false);

		document.addEventListener('mousemove', function (e) {
			if (_this.pan_data.active == false) {
				return;
			}
			if (is_pan_released(e)) {
				//button was let go outside the window
				_this.pan_stop();
				return;
			}

			e.preventDefault();
			_this.pan_move(e.clientX, e.clientY);
		}, false);

		document.addEventListener('mouseup', function (e) {
			if (_this.pan_data.active && e.button === 1) {
				_this.pan_stop();
			}
		}, false);

		//never leave the canvas stuck in panning state
		window.addEventListener('blur', function () {
			_this.pan_stop();
		}, false);
	}

	/**
	 * @param {number} x client coordinates
	 * @param {number} y
	 */
	pan_start(x, y) {
		this.pan_data.active = true;
		this.pan_data.last = {x: x, y: y};

		document.body.classList.add('panning');
	}

	/**
	 * @param {number} x client coordinates
	 * @param {number} y
	 */
	pan_move(x, y) {
		if (this.pan_data.active == false) {
			return false;
		}

		var delta = pan_delta(this.pan_data.last, {x: x, y: y});
		if (delta.x == 0 && delta.y == 0) {
			return false;
		}

		this.pan_data.last = {x: x, y: y};

		//zoomView.constrain() keeps the image from being dragged off screen
		zoomView.move(delta.x, delta.y);
		config.need_render = true;

		return true;
	}

	pan_stop() {
		if (this.pan_data.active == false) {
			return false;
		}

		this.pan_data.active = false;
		document.body.classList.remove('panning');

		return true;
	}

	prepare_canvas() {
		this.update_preview_size();

		this.canvas_preview.webkitImageSmoothingEnabled = false;
		this.canvas_preview.msImageSmoothingEnabled = false;
		this.canvas_preview.imageSmoothingEnabled = false;
		this.GUI.render_canvas_background('canvas_preview', 8);
	}

	/**
	 * Resizes the preview canvas so it has the same aspect ratio as the main
	 * canvas. Called whenever the canvas dimensions change.
	 */
	update_preview_size() {
		var size = calc_preview_size(config.WIDTH, config.HEIGHT, this.PREVIEW_BOX);

		if (size.w == this.PREVIEW_SIZE.w && size.h == this.PREVIEW_SIZE.h) {
			//nothing changed
			return false;
		}

		this.PREVIEW_SIZE.w = size.w;
		this.PREVIEW_SIZE.h = size.h;

		var canvas = document.getElementById('canvas_preview');
		if (canvas == null) {
			return false;
		}

		canvas.width = size.w;
		canvas.height = size.h;

		//keep the transparency grid behind the canvas exactly the same size
		var inner = document.getElementById('canvas_preview_inner');
		if (inner != null) {
			inner.style.width = size.w + 'px';
			inner.style.height = size.h + 'px';
		}

		//context state is lost after a canvas resize
		this.canvas_preview = canvas.getContext('2d');
		this.canvas_preview.webkitImageSmoothingEnabled = false;
		this.canvas_preview.msImageSmoothingEnabled = false;
		this.canvas_preview.imageSmoothingEnabled = false;

		config.need_render = true;

		return true;
	}

	render_preview_active_zone() {
		if (this.canvas_preview == undefined) {
			this.canvas_preview = document.getElementById("canvas_preview")
				.getContext("2d");
		}

		var start_pos = this.Base_layers.get_world_coords(0, 0);

		var zone = calc_active_zone({
			image_width: config.WIDTH,
			image_height: config.HEIGHT,
			preview_width: this.PREVIEW_SIZE.w,
			preview_height: this.PREVIEW_SIZE.h,
			visible_width: config.visible_width,
			visible_height: config.visible_height,
			zoom: config.ZOOM,
			world_x: start_pos.x,
			world_y: start_pos.y,
		});

		if (zone == null) {
			//everything is visible
			return;
		}

		//draw selected area in preview canvas
		this.canvas_preview.lineWidth = 1;
		this.canvas_preview.beginPath();
		this.canvas_preview.rect(
			Math.round(zone.x) + 0.5,
			Math.round(zone.y) + 0.5,
			zone.w,
			zone.h
			);
		this.canvas_preview.fillStyle = "rgba(0, 255, 0, 0.3)";
		this.canvas_preview.strokeStyle = "#00ff00";
		this.canvas_preview.fill();
		this.canvas_preview.stroke();
	}

	async zoom(recalc) {
		if (recalc != undefined) {
			//zoom-in or zoom-out
			if (recalc == 1 || recalc == -1) {
				//fix
				if (config.ZOOM > 1 && config.ZOOM < 1.5) {
					config.ZOOM = 1;
				}
				if (config.ZOOM > 0.9 && config.ZOOM < 1) {
					config.ZOOM = 1;
				}

				//calc step
				if (recalc < 0) {
					//down
					if (config.ZOOM > 3) {
						//infinity -> 300%
						config.ZOOM -= 1;
					}
					else if (config.ZOOM > 1) {
						//300% -> 100%
						config.ZOOM -= 0.5;
					}
					else if (config.ZOOM > 0.1) {
						//100% -> 10%
						config.ZOOM -= 0.1;
					}
					else {
						//10% -> 1%
						config.ZOOM -= 0.01;
					}
				}
				else {
					//up
					if (config.ZOOM < 0.1) {
						//1% -> 10%
						config.ZOOM += 0.01;
					}
					else if (config.ZOOM < 1) {
						//10% -> 100%
						config.ZOOM += 0.1;
					}
					else if (config.ZOOM < 3) {
						//100% -> 300%
						config.ZOOM += 0.5;
					}
					else {
						//300% -> more
						config.ZOOM += 1;
					}
				}
			}
			else {
				//zoom using exact value
				config.ZOOM = recalc / 100;
			}
			config.ZOOM = Math.round(config.ZOOM * 100) / 100;
			config.ZOOM = Math.max(config.ZOOM, 0.01);
			config.ZOOM = Math.min(config.ZOOM, 500);
		}

		document.getElementById("zoom_100").innerHTML = Math.round(config.ZOOM * 100) + '%';
		document.getElementById("zoom_range").value = (config.ZOOM * 100);

		config.need_render = true;
		this.GUI.prepare_canvas();

		//sleep after last image import, it maybe not be finished yet
		await new Promise(r => setTimeout(r, 10));

		return true;
	}

	zoom_auto(only_increase) {
		var container = document.getElementById('main_wrapper');
		var page_w = container.clientWidth;
		var page_h = container.clientHeight;

		var best_width = page_w / config.WIDTH;
		var best_height = page_h / config.HEIGHT;
		var best_zoom = null;

		best_zoom = Math.min(best_width, best_height);

		if (only_increase != undefined && best_zoom > 1) {
			return false;
		}

		this.zoom(Math.min(best_width, best_height) * 100);
	}

	set_center_zoom() {
		this.zoom_data.x = config.visible_width / 2;
		this.zoom_data.y = config.visible_height / 2;
	}

	set_zoom_position(event) {
		var mouse_x = event.offsetX;
		var mouse_y = event.offsetY;
		if (event.changedTouches) {
			//touch events
			event = event.changedTouches[0];

			mouse_x = event.pageX - this.canvas_offset.x;
			mouse_y = event.pageY - this.canvas_offset.y;
		}

		var change = calc_zoom_position({
			mouse_x: mouse_x,
			mouse_y: mouse_y,
			image_width: config.WIDTH,
			image_height: config.HEIGHT,
			preview_width: this.PREVIEW_SIZE.w,
			preview_height: this.PREVIEW_SIZE.h,
			visible_width: config.visible_width,
			visible_height: config.visible_height,
			zoom: config.ZOOM,
		});

		var zoom_data = this.zoom_data;
		zoom_data.move_pos = {};
		zoom_data.move_pos.x = change.x;
		zoom_data.move_pos.y = change.y;

		config.need_render = true;
	}
	
	/**
	 * moves visible area to new position.
	 * 
	 * @param {int} x global offset
	 * @param {int} y global offset
	 */
	zoom_to_position(x, y) {
		var zoom_data = this.zoom_data;		
		zoom_data.move_pos = {};
		zoom_data.move_pos.x = parseInt(x);
		zoom_data.move_pos.y = parseInt(y);
		
		config.need_render = true;
	}
	
}

export default GUI_preview_class;
