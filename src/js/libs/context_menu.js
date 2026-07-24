/*
 * Get in loser - https://github.com/DazzlingDukeOfLazers/get-in-loser
 * Based on miniPaint by ViliusL.
 *
 * Shared right-click context menu. Used by the layers panel and by the hand
 * in the logo. Items are [{label, run}] with {divider: true} between groups.
 */

class Context_menu_class {

	constructor() {
		this.el = null;
		this.dismiss = null;
	}

	show(x, y, items) {
		var _this = this;
		this.hide();

		var menu = document.createElement('div');
		menu.className = 'context_menu';
		var html = '';
		for (var i = 0; i < items.length; i++) {
			if (items[i].divider) {
				html += '<div class="context_menu_divider"></div>';
			}
			else {
				html += '<button type="button" class="context_menu_item" data-index="' + i + '">'
					+ items[i].label + '</button>';
			}
		}
		menu.innerHTML = html;
		document.body.appendChild(menu);
		this.el = menu;

		//keep on screen
		var rect = menu.getBoundingClientRect();
		menu.style.left = Math.min(x, window.innerWidth - rect.width - 4) + 'px';
		menu.style.top = Math.min(y, window.innerHeight - rect.height - 4) + 'px';

		menu.addEventListener('click', function (e) {
			var idx = e.target.dataset.index;
			if (idx != null && items[idx] && items[idx].run) {
				items[idx].run();
			}
			_this.hide();
		});

		//dismiss on outside click / escape (deferred so this event doesn't close it)
		setTimeout(function () {
			_this.dismiss = function (e) {
				if (e.type === 'keydown' && e.key !== 'Escape') return;
				if (_this.el && _this.el.contains(e.target)) return;
				_this.hide();
			};
			document.addEventListener('mousedown', _this.dismiss);
			document.addEventListener('keydown', _this.dismiss);
		}, 0);
	}

	hide() {
		if (this.el) {
			this.el.remove();
			this.el = null;
		}
		if (this.dismiss) {
			document.removeEventListener('mousedown', this.dismiss);
			document.removeEventListener('keydown', this.dismiss);
			this.dismiss = null;
		}
	}

}

var instance = new Context_menu_class();
export default instance;
