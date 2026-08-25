/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Right sidebar panel manager: pinning (sticky headers), reordering with
 * buttons and drag & drop, and persistence of both.
 */

import config from './../../config.js';
import Helper_class from './../../libs/helpers.js';

var instance = null;

var controls_template = `
	<span class="panel_controls">
		<button type="button" class="panel_control panel_pin" title="Pin panel" aria-pressed="false">
			<span class="sr_only">Pin panel</span>
			<svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path d="M9.5 1a.5.5 0 0 0 0 1h.5v3.2l1.7 2.1a1 1 0 0 1 .2.6V8a.5.5 0 0 1-.5.5H8.5V14a.5.5 0 0 1-1 0V8.5H4.6A.5.5 0 0 1 4.1 8v-.1a1 1 0 0 1 .2-.6L6 5.2V2h.5a.5.5 0 0 0 0-1h-3z"/>
			</svg>
		</button>
		<button type="button" class="panel_control panel_move_up" title="Move panel up">
			<span class="sr_only">Move panel up</span>
			<svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path d="M8 4l4.5 5h-9z"/>
			</svg>
		</button>
		<button type="button" class="panel_control panel_move_down" title="Move panel down">
			<span class="sr_only">Move panel down</span>
			<svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path d="M8 12L3.5 7h9z"/>
			</svg>
		</button>
		<span class="panel_control panel_drag_handle" title="Drag to reorder" aria-hidden="true">
			<svg width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
				<circle cx="6" cy="4" r="1.3"/><circle cx="10" cy="4" r="1.3"/>
				<circle cx="6" cy="8" r="1.3"/><circle cx="10" cy="8" r="1.3"/>
				<circle cx="6" cy="12" r="1.3"/><circle cx="10" cy="12" r="1.3"/>
			</svg>
		</span>
	</span>
`;

/**
 * GUI class responsible for arranging the blocks on the right sidebar
 */
class GUI_panels_class {

	constructor(GUI_class) {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		if (GUI_class != undefined) {
			this.GUI = GUI_class;
		}

		this.Helper = new Helper_class();

		this.sidebar = null;
		this.dragged_panel = null;
	}

	render_main_panels() {
		this.sidebar = document.getElementById('sidebar_right');
		if (this.sidebar == null) {
			return;
		}

		var panels = this.get_panels();
		for (var i = 0; i < panels.length; i++) {
			this.prepare_panel(panels[i]);
		}

		this.restore_order();
		this.restore_pinned();
		this.restore_width();
		this.add_width_grip();

		this.set_events();
		this.update_layout();
	}

	/**
	 * A grab handle on the sidebar's left edge - drag it to widen the whole panel column.
	 *
	 * Field report: "we need to be able to grab and widen the right-hand panel so the voxel
	 * preview gets bigger." The page grid's third column is auto-sized, so an explicit width on
	 * the sidebar is all it takes; the canvas area reflows, and anything that sizes itself from
	 * its panel - the voxel preview does - is told to remeasure.
	 */
	add_width_grip() {
		var _this = this;
		var grip = document.createElement('div');
		grip.className = 'sidebar_width_grip';
		grip.title = 'Drag to resize the panels';
		this.sidebar.appendChild(grip);

		var drag = null;

		grip.addEventListener('pointerdown', function (e) {
			drag = {x: e.clientX, width: _this.sidebar.getBoundingClientRect().width};
			//the sidebar animates width changes, which under a drag reads as rubber-banding - and
			//anything measuring the panel mid-transition measures the old width
			_this.sidebar.style.transition = 'none';
			try {
				grip.setPointerCapture(e.pointerId);
			}
			catch (err) {
				//an untracked pointer cannot be captured; the drag still works inside the grip
			}
			e.preventDefault();
		});

		grip.addEventListener('pointermove', function (e) {
			if (drag == null) {
				return;
			}
			//the sidebar is on the right, so dragging LEFT makes it wider
			var width = Math.max(220, Math.min(600, drag.width + (drag.x - e.clientX)));
			_this.apply_width(width);
			_this.Helper.setCookie('sidebar_width', Math.round(width));
		});

		var done = function () {
			if (drag != null) {
				drag = null;
				_this.sidebar.style.transition = '';
				//one more pass now the width has settled, for anything that measured mid-drag
				_this.apply_width(_this.sidebar.getBoundingClientRect().width);
			}
		};
		grip.addEventListener('pointerup', done);
		grip.addEventListener('pointercancel', done);
	}

	apply_width(width) {
		this.sidebar.style.width = width + 'px';

		//everything that measures its container has to be told the container moved
		if (this.GUI != null) {
			if (this.GUI.GUI_voxel != null && this.GUI.GUI_voxel.ctx != null) {
				this.GUI.GUI_voxel.size_canvas();
				this.GUI.GUI_voxel.render_voxel();
			}
			this.GUI.prepare_canvas();
		}
		config.need_render = true;
	}

	restore_width() {
		var saved = parseInt(this.Helper.getCookie('sidebar_width'), 10);

		if (!isNaN(saved) && saved >= 220 && saved <= 600) {
			this.sidebar.style.width = saved + 'px';
		}
	}

	/**
	 * @returns {array} panel elements in their current display order
	 */
	get_panels() {
		if (this.sidebar == null) {
			return [];
		}

		return Array.prototype.slice.call(
			this.sidebar.querySelectorAll(':scope > .block[data-panel]')
		);
	}

	get_panel_name(panel) {
		return panel.dataset.panel;
	}

	/**
	 * adds the control buttons and drag attributes to a single panel
	 *
	 * @param {HTMLElement} panel
	 */
	prepare_panel(panel) {
		var header = panel.querySelector('h2');
		if (header == null || header.querySelector('.panel_controls') != null) {
			return;
		}

		header.classList.add('panel_header');
		header.setAttribute('draggable', 'true');
		header.insertAdjacentHTML('beforeend', controls_template);
	}

	set_events() {
		var _this = this;

		this.sidebar.addEventListener('click', function (event) {
			var button = event.target.closest ? event.target.closest('.panel_control') : null;
			if (button == null || !_this.sidebar.contains(button)) {
				return;
			}

			//never let the header collapse toggle fire as well
			event.preventDefault();
			event.stopPropagation();

			var panel = button.closest('.block[data-panel]');
			if (panel == null) {
				return;
			}

			if (button.classList.contains('panel_pin')) {
				_this.toggle_pin(panel);
			}
			else if (button.classList.contains('panel_move_up')) {
				_this.move(panel, -1);
			}
			else if (button.classList.contains('panel_move_down')) {
				_this.move(panel, +1);
			}
		}, true);

		this.sidebar.addEventListener('dragstart', function (event) {
			var header = event.target.closest ? event.target.closest('.panel_header') : null;
			if (header == null) {
				return;
			}

			_this.dragged_panel = header.closest('.block[data-panel]');
			if (_this.dragged_panel == null) {
				return;
			}

			_this.dragged_panel.classList.add('dragging');
			event.dataTransfer.effectAllowed = 'move';
			//firefox needs data to start a drag
			event.dataTransfer.setData('text/plain', _this.get_panel_name(_this.dragged_panel));
		}, false);

		this.sidebar.addEventListener('dragover', function (event) {
			if (_this.dragged_panel == null) {
				return;
			}
			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';

			var target = _this.find_drop_target(event.clientY);
			if (target == null || target == _this.dragged_panel) {
				return;
			}

			var panels = _this.get_panels();
			var dragged_index = panels.indexOf(_this.dragged_panel);
			var target_index = panels.indexOf(target);

			if (dragged_index < target_index) {
				target.after(_this.dragged_panel);
			}
			else {
				target.before(_this.dragged_panel);
			}

			_this.update_layout();
		}, false);

		this.sidebar.addEventListener('drop', function (event) {
			if (_this.dragged_panel == null) {
				return;
			}
			event.preventDefault();
		}, false);

		this.sidebar.addEventListener('dragend', function (event) {
			if (_this.dragged_panel == null) {
				return;
			}

			_this.dragged_panel.classList.remove('dragging');
			_this.dragged_panel = null;
			_this.save_order();
			_this.update_layout();
		}, false);

		//collapsing a panel changes how much room the pinned ones need
		this.sidebar.addEventListener('click', function (event) {
			if (event.target.closest && event.target.closest('.panel_header') != null) {
				window.setTimeout(function () {
					_this.update_layout();
				}, 0);
			}
		}, false);

		window.addEventListener('resize', function () {
			_this.update_layout();
		}, false);
	}

	/**
	 * finds the panel the pointer is currently over
	 *
	 * @param {number} pointer_y
	 * @returns {HTMLElement|null}
	 */
	find_drop_target(pointer_y) {
		var panels = this.get_panels();

		for (var i = 0; i < panels.length; i++) {
			var rect = panels[i].getBoundingClientRect();
			if (pointer_y >= rect.top && pointer_y <= rect.bottom) {
				return panels[i];
			}
		}

		//above the first / below the last panel
		if (panels.length > 0) {
			if (pointer_y < panels[0].getBoundingClientRect().top) {
				return panels[0];
			}
			return panels[panels.length - 1];
		}

		return null;
	}

	/**
	 * moves a panel up (-1) or down (+1)
	 *
	 * @param {HTMLElement} panel
	 * @param {number} direction
	 */
	move(panel, direction) {
		var panels = this.get_panels();
		var index = panels.indexOf(panel);
		var target_index = index + direction;

		if (index < 0 || target_index < 0 || target_index >= panels.length) {
			return false;
		}

		if (direction < 0) {
			panels[target_index].before(panel);
		}
		else {
			panels[target_index].after(panel);
		}

		this.save_order();
		this.update_layout();

		return true;
	}

	/**
	 * @param {HTMLElement} panel
	 * @param {boolean} state omit to toggle
	 */
	toggle_pin(panel, state) {
		var pinned = state != undefined ? state : !panel.classList.contains('pinned');

		panel.classList.toggle('pinned', pinned);

		var button = panel.querySelector('.panel_pin');
		if (button != null) {
			button.setAttribute('aria-pressed', pinned ? 'true' : 'false');
			button.setAttribute('title', pinned ? 'Unpin panel' : 'Pin panel');
		}

		this.save_pinned();
		this.update_layout();

		return pinned;
	}

	/**
	 * Pinned panels stick to the top of the sidebar. When more than one is
	 * pinned they stack instead of covering each other, so every pinned panel
	 * needs its own offset.
	 */
	update_layout() {
		var panels = this.get_panels();
		var offset = 0;

		for (var i = 0; i < panels.length; i++) {
			var panel = panels[i];

			//first and last panel get their move button disabled
			var up = panel.querySelector('.panel_move_up');
			var down = panel.querySelector('.panel_move_down');
			if (up != null) {
				up.disabled = (i === 0);
			}
			if (down != null) {
				down.disabled = (i === panels.length - 1);
			}

			if (panel.classList.contains('pinned')) {
				panel.style.top = offset + 'px';
				//stacking order so an earlier pinned panel stays on top
				panel.style.zIndex = 100 - i;
				offset += panel.getBoundingClientRect().height;
			}
			else {
				panel.style.top = '';
				panel.style.zIndex = '';
			}
		}
	}

	save_order() {
		var names = this.get_panels().map((panel) => this.get_panel_name(panel));

		this.Helper.setCookie('panel_order', names.join(','));
	}

	restore_order() {
		var saved = this.Helper.getCookie('panel_order');
		if (saved == null || saved === '') {
			return false;
		}

		var names = String(saved).split(',');
		var panels = this.get_panels();
		var by_name = {};
		for (var i = 0; i < panels.length; i++) {
			by_name[this.get_panel_name(panels[i])] = panels[i];
		}

		//the panels as the MARKUP orders them, before anything moves - the reference for where a
		//panel this cookie has never heard of belongs
		var markup_order = [];
		for (var m = 0; m < panels.length; m++) {
			markup_order.push(this.get_panel_name(panels[m]));
		}

		//append in saved order
		for (var j = 0; j < names.length; j++) {
			var panel = by_name[names[j]];
			if (panel != undefined) {
				this.sidebar.appendChild(panel);
				delete by_name[names[j]];
			}
		}

		//A NEW PANEL LANDS WHERE THE MARKUP PUTS IT, not at the bottom. Appending leftovers sent
		//every newly shipped panel to the end of the stack for everyone with a saved arrangement -
		//so the Sound panel, designed to sit under the preview, arrived below the layers instead.
		//Each unknown panel goes after its nearest markup predecessor that is actually present.
		for (var u = 0; u < markup_order.length; u++) {
			var name = markup_order[u];
			if (by_name[name] == undefined) {
				continue;
			}

			var placed = null;
			for (var b = u - 1; b >= 0 && placed == null; b--) {
				if (names.indexOf(markup_order[b]) > -1) {
					placed = this.sidebar.querySelector('[data-panel="' + markup_order[b] + '"]');
				}
			}

			if (placed != null && placed.nextSibling != null) {
				this.sidebar.insertBefore(by_name[name], placed.nextSibling);
			}
			else if (placed != null) {
				this.sidebar.appendChild(by_name[name]);
			}
			else {
				this.sidebar.insertBefore(by_name[name], this.sidebar.firstChild);
			}
			delete by_name[name];
		}

		return true;
	}

	save_pinned() {
		var names = this.get_panels()
			.filter((panel) => panel.classList.contains('pinned'))
			.map((panel) => this.get_panel_name(panel));

		this.Helper.setCookie('panel_pinned', names.join(','));
	}

	restore_pinned() {
		var saved = this.Helper.getCookie('panel_pinned');
		if (saved == null) {
			//preview and sound pinned by default - the two panels worth keeping in view while the
			//rest of the stack scrolls
			saved = 'preview,sound';
		}

		var names = String(saved).split(',');
		var panels = this.get_panels();

		for (var i = 0; i < panels.length; i++) {
			var is_pinned = names.indexOf(this.get_panel_name(panels[i])) > -1;
			this.toggle_pin(panels[i], is_pinned);
		}
	}

}

export default GUI_panels_class;
