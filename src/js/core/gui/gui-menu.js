/*
 * miniPaint - https://github.com/viliusle/miniPaint
 * author: Vilius L.
 */

import { VERSION_LABEL } from './../../libs/version.js';
import config from './../../config.js';
import menuDefinition from './../../config-menu.js';
import Tools_translate_class from './../../modules/tools/translate.js';
import { menu_bar_split, menu_bar_overflow, menu_bar_scroll_correction } from './../menu-overflow.js';

/**
 * class responsible for rendering main menu
 */
class GUI_menu_class {

	constructor() {
		this.eventSubscriptions = {};
		this.dropdownMaxHeightMargin = 15;
		this.menuContainer = null;
		this.menuBarNode = null;
		this.lastFocusedMenuBarLink = 0;
		this.dropdownStack = [];

		//the definition the bar is currently rendered from. Identical to the
		//imported one until the bar runs out of room, at which point the menus
		//that no longer fit move into the children of a synthetic More item -
		//so every walk from the root has to start here, not at the import.
		this.menuBarDefinition = menuDefinition;
		//measured once per layout, keyed by the fingerprint below
		this.menuBarItemWidths = null;
		this.menuBarMoreWidth = 0;
		this.menuBarVersionWidth = 0;
		this.menuBarMetricsFingerprint = null;
		this.menuBarVisibleCount = null;

		this.Tools_translate = new Tools_translate_class();
	}

	render_main() {
		this.menuContainer = document.getElementById('main_menu');

		//container level, so they survive the bar being re-rendered
		this.menuContainer.addEventListener('click', (event) => { return this.on_click_menu(event); }, true);
		this.menuContainer.addEventListener('keydown', (event) => { return this.on_key_down_menu(event); }, true);
		document.body.addEventListener('mousedown', (event) => { return this.on_mouse_down_body(event); }, true);
		document.body.addEventListener('touchstart', (event) => { return this.on_mouse_down_body(event); }, true);
		window.addEventListener('resize', (event) => { return this.on_resize_window(event); }, true);

		this.render_menu_bar(menuDefinition);
		this.update_menu_bar_collapse();

		//the container, not the bar: the bar is replaced on every re-render, and
		//re-rendering it must not feed the observer that triggered it. The
		//container is fixed to both viewport edges, so its width is the bar's
		//budget and it changes for any reason the budget could - a window
		//resize, an orientation change, a zoom - without depending on the
		//window resize event reaching us.
		if (typeof ResizeObserver == 'function') {
			this.menuBarObserver = new ResizeObserver(() => {
				this.update_menu_bar_collapse();
				this.update_menu_bar_overflow();
			});
			this.menuBarObserver.observe(this.menuContainer);
		}

		//a late webfont changes every label's width, so the split is recomputed
		//once the real faces are in
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(() => {
				this.menuBarMetricsFingerprint = null;
				this.update_menu_bar_collapse();
			}).catch(() => {});
		}

		document.body.classList.add('loaded');
	}

	/**
	 * Renders the bar from a definition array and rebinds everything attached
	 * to the <ul>, which this replaces. The array is not always the imported
	 * menu definition - see menuBarDefinition.
	 *
	 * @param {array} definition top level menu items to render, in order
	 */
	render_menu_bar(definition) {
		this.menuBarDefinition = definition;

		let menuTemplate = '<ul class="menu_bar" role="menubar" tabindex="0">';
		for (let i = 0; i < definition.length; i++) {
			menuTemplate += this.generate_menu_bar_item_template(definition[i], i);
		}
		menuTemplate += this.generate_version_template();
		menuTemplate += '</ul>';

		this.menuContainer.innerHTML = menuTemplate;
		this.menuBarNode = this.menuContainer.querySelector('[role="menubar"]');

		this.menuBarNode.addEventListener('focus', (event) => { return this.on_focus_menu_bar(event); });
		this.menuBarNode.addEventListener('blur', (event) => { return this.on_blur_menu_bar(event); });
		this.menuBarNode.addEventListener('scroll', () => { return this.update_menu_bar_overflow(); }, {passive: true});
		this.menuBarNode.querySelectorAll('a').forEach((link) => {
			link.addEventListener('focus', (event) => { return this.on_focus_menu_bar_link(event); });
		});

		if (config.LANG != 'en') {
			this.Tools_translate.translate(config.LANG, this.menuContainer);
		}

		this.update_menu_bar_overflow();
	}

	/**
	 * The running version, sat at the end of the menu bar.
	 *
	 * role="none" because it is a label, not a menu item: the menu bar's keyboard navigation walks
	 * its menuitems, and a thing you cannot activate has no business being one of them.
	 *
	 * @returns {string}
	 */
	generate_version_template() {
		//it comes from our own package.json, but it lands in innerHTML, so it gets the same
		//treatment anything else would
		const version = String(VERSION_LABEL).replace(/[^0-9A-Za-z.+-]/g, '');

		if (version === '') {
			return '';
		}

		return `<li role="none" class="menu_version"><span>${version}</span></li>`;
	}

	on(eventName, callback) {
		if (!this.eventSubscriptions[eventName]) {
			this.eventSubscriptions[eventName] = [];
		}
		if (!this.eventSubscriptions[eventName].includes(callback)) {
			this.eventSubscriptions[eventName].push(callback);
		}
	}

	emit(eventName, payload, object) {
		if (this.eventSubscriptions[eventName]) {
			for (let callback of this.eventSubscriptions[eventName]) {
				callback(payload, object);
			}
		}
	}

	generate_menu_bar_item_template(definition, index) {
		return `
			<li${ definition.overflow ? ' class="menu_more"' : '' }>
				<a id="main_menu_0_${index}" role="menuitem" tabindex="-1" aria-haspopup="true" aria-expanded="false"
					href="javascript:void(0)" data-level="0" data-index="${ index }"><span class="name trn">${ definition.name }</span></a>
			</li>
		`.trim();
	}

	generate_menu_dropdown_item_template(definition, level, index) {
		if (definition.divider) {
			return `
				<li role="presentation">
					<hr>
				</li>
			`.trim();
		} else {
			return `
				<li>
					<a id="main_menu_${ level }_${ index }" role="menuitem" tabindex="-1" aria-haspopup="${ (!!definition.children) + '' }"
						href="${ definition.href ? definition.href : 'javascript:void(0)' }"
						target="${ definition.href ? '_blank' : '_self' }"
						data-level="${ level }" data-index="${ index }">
						<span class="name"><span class="trn">${ definition.name }</span>${ definition.ellipsis ? ' ...' : '' }</span>
						${ !!definition.shortcut ? `
							<span class="shortcut"><span class="sr_only">Shortcut Key:</span> ${ definition.shortcut }</span>
						` : `` }
					</a>
				</li>
			`.trim();
		}
	}

	on_mouse_down_body(event) {
		const target = event.touches && event.touches.length > 0 ? event.touches[0].target : event.target;

		// Clicked outside of menu; close dropdowns.
		if (target && !this.menuContainer.contains(target)) {
			this.close_child_dropdowns(0);
		}
	}

	on_focus_menu_bar(event) {
		if (document.activeElement === this.menuBarNode) {
			let lastFocusedLink = this.menuBarNode.querySelector(`[data-index="${ this.lastFocusedMenuBarLink }"]`);
			if (!lastFocusedLink) {
				lastFocusedLink = this.menuBarNode.querySelector('a');
			}
			lastFocusedLink.focus();
		}
	}

	on_focus_menu_bar_link(event) {
		this.lastFocusedMenuBarLink = parseInt(event.target.getAttribute('data-index'), 10) || 0;
		//arrowing along a scrolled bar must bring the focused menu with it
		this.scroll_menu_bar_link_into_view(event.target);
	}

	/**
	 * The synthetic top level item that holds whatever no longer fits. Its
	 * children are the real menu definitions, untouched, so every dropdown
	 * below it behaves exactly as it does when the menu sits on the bar.
	 *
	 * @param {array} children menus that did not fit
	 * @returns {object} a menu definition node
	 */
	build_more_definition(children) {
		return {name: 'More', overflow: true, children};
	}

	/**
	 * Measures each menu at the current layout and caches the widths.
	 *
	 * Measuring means rendering: the bar is briefly rendered with every menu
	 * plus a More item so all of them can be read off, and the caller then
	 * re-renders it with the split it wants. The fingerprint is the padding
	 * and font of a real bar link, which is what actually changes these widths
	 * (the breakpoint widens the touch padding, and a theme or language can
	 * change the font) - cheaper and more honest than duplicating the
	 * breakpoint here.
	 */
	measure_menu_bar_items() {
		this.render_menu_bar(menuDefinition.concat([this.build_more_definition([])]));

		const widths = [];
		let more_width = 0;
		let version_width = 0;

		for (const item of Array.prototype.slice.call(this.menuBarNode.children)) {
			//fractional, because eleven rounded widths drift by several pixels
			const width = item.getBoundingClientRect().width;
			if (item.classList.contains('menu_version')) {
				version_width = width;
			}
			else if (item.classList.contains('menu_more')) {
				more_width = width;
			}
			else {
				widths.push(width);
			}
		}

		this.menuBarItemWidths = widths;
		this.menuBarMoreWidth = more_width;
		this.menuBarVersionWidth = version_width;
		this.menuBarMetricsFingerprint = this.menu_bar_metrics_fingerprint();
	}

	/**
	 * @returns {string} identifies the layout the cached widths were taken in
	 */
	menu_bar_metrics_fingerprint() {
		const link = this.menuBarNode ? this.menuBarNode.querySelector('a') : null;
		if (!link) {
			return null;
		}
		const style = window.getComputedStyle(link);
		return [style.paddingLeft, style.paddingRight, style.fontSize, style.fontFamily].join('|');
	}

	/**
	 * Collapses the menus that no longer fit under a More item, or brings them
	 * back out when there is room again. Driven purely by measurement, so it
	 * works the same for a narrowed desktop window as for a phone.
	 *
	 * @returns {boolean} true when the bar was re-rendered
	 */
	update_menu_bar_collapse() {
		if (!this.menuBarNode) {
			return false;
		}

		if (this.menuBarItemWidths === null
			|| this.menuBarMetricsFingerprint !== this.menu_bar_metrics_fingerprint()) {
			this.measure_menu_bar_items();
			//the probe render above is not a layout anyone should be left with
			this.menuBarVisibleCount = null;
		}

		const bar = this.menuBarNode;
		const style = window.getComputedStyle(bar);
		const available = bar.clientWidth
			- (parseFloat(style.paddingLeft) || 0)
			- (parseFloat(style.paddingRight) || 0)
			- this.menuBarVersionWidth;

		const visible = menu_bar_split(this.menuBarItemWidths, available, this.menuBarMoreWidth);
		if (visible === this.menuBarVisibleCount) {
			return false;
		}

		//the re-render destroys the openers the stack points at
		this.close_child_dropdowns(0);
		this.menuBarVisibleCount = visible;

		this.render_menu_bar(visible >= menuDefinition.length
			? menuDefinition
			: menuDefinition.slice(0, visible).concat([
				this.build_more_definition(menuDefinition.slice(visible)),
			]));

		return true;
	}

	/**
	 * Fallback for a bar too narrow even for More: it scrolls, and a scroll
	 * container says nothing about what lies past its edge, so the bar carries
	 * a fading edge on whichever side still hides menus. menu.css draws them
	 * from these two classes.
	 *
	 * Also called directly after a programmatic scroll, which must not wait on
	 * the scroll event to repaint the edges.
	 */
	update_menu_bar_overflow() {
		const bar = this.menuBarNode;
		if (!bar || !this.menuContainer) {
			return;
		}
		const overflow = menu_bar_overflow(bar.scrollLeft, bar.scrollWidth, bar.clientWidth);
		this.menuContainer.classList.toggle('can_scroll_left', overflow.left);
		this.menuContainer.classList.toggle('can_scroll_right', overflow.right);
	}

	/**
	 * Scrolls a top level menu clear of the hamburgers that overlay the bar's
	 * padding gutters, so an opened or focused menu is never sliced in half by
	 * one of them. Scrolls instantly on purpose: callers read the opener's
	 * rect immediately afterwards to place the dropdown.
	 */
	scroll_menu_bar_link_into_view(link) {
		const bar = this.menuBarNode;
		if (!bar || !link || bar.scrollWidth - bar.clientWidth <= 1) {
			return;
		}
		const bar_style = window.getComputedStyle(bar);
		const bar_rect = bar.getBoundingClientRect();
		const link_rect = link.getBoundingClientRect();

		const correction = menu_bar_scroll_correction({
			left: bar_rect.left,
			right: bar_rect.right,
			padding_left: parseFloat(bar_style.paddingLeft) || 0,
			padding_right: parseFloat(bar_style.paddingRight) || 0,
		}, {
			left: link_rect.left,
			right: link_rect.right,
		});

		if (correction === 0) {
			return;
		}

		bar.scrollLeft += correction;
		this.update_menu_bar_overflow();
	}

	on_blur_menu_bar(event) {
		// TODO
	}

	on_key_down_menu(event) {
		const key = event.key;
		const activeElement = document.activeElement;

		if (activeElement && activeElement.tagName === 'A') {
			const linkLevel = parseInt(activeElement.getAttribute('data-level'), 10) || 0;
			const linkIndex = parseInt(activeElement.getAttribute('data-index'), 10) || 0;
			const menuParent = activeElement.closest('ul');
			if (linkLevel === 0) {
				if (['Right', 'ArrowRight'].includes(event.key)) {
					let nextLink = menuParent.querySelector(`[data-index="${ linkIndex + 1 }"]`);
					if (!nextLink) {
						nextLink = menuParent.querySelector(`[data-index="0"]`);
					}
					nextLink.focus();
				}
				else if (['Left', 'ArrowLeft'].includes(event.key)) {
					let previousLink = menuParent.querySelector(`[data-index="${ linkIndex - 1 }"]`);
					if (!previousLink) {
						previousLink = menuParent.querySelector(`[data-index="${ menuParent.querySelectorAll('[data-index]').length - 1 }"]`);
					}
					previousLink.focus();
				}
				else if (['Down', 'ArrowDown'].includes(event.key)) {
					if (activeElement.getAttribute('aria-haspopup') === 'true') {
						event.preventDefault();
						activeElement.click();
					}
				}
				else if (event.key === 'Home') {
					menuParent.querySelector(`[data-index="0"]`).focus();
				}
				else if (event.key === 'End') {
					menuParent.querySelector(`[data-index="${ menuParent.querySelectorAll('[data-index]').length - 1 }"]`).focus();
				}
				else if ([' ', 'Enter'].includes(event.key)) {
					event.preventDefault();
					activeElement.click();
				}
			} else {
				if (['Up', 'ArrowUp'].includes(event.key)) {
					event.preventDefault();
					let previousLink = menuParent.querySelector(`[data-index="${ linkIndex - 1 }"]`);
					if (!previousLink) {
						previousLink = menuParent.querySelector(`[data-index="${ linkIndex - 2 }"]`); // Skip dividers
					}
					if (!previousLink) {
						previousLink = menuParent.querySelector(`[data-index="${ this.dropdownStack[linkLevel - 1].children.length - 1 }"]`);
					}
					previousLink.focus();
				}
				else if (['Down', 'ArrowDown'].includes(event.key)) {
					event.preventDefault();
					let nextLink = menuParent.querySelector(`[data-index="${ linkIndex + 1 }"]`);
					if (!nextLink) {
						nextLink = menuParent.querySelector(`[data-index="${ linkIndex + 2 }"]`); // Skip dividers
					}
					if (!nextLink) {
						nextLink = menuParent.querySelector(`[data-index="0"]`);
					}
					nextLink.focus();
				}
				else if (['Right', 'ArrowRight'].includes(event.key)) {
					if (activeElement.getAttribute('aria-haspopup') === 'true') {
						activeElement.click();
					}
					else if (this.dropdownStack.length > 1) {
						const opener = this.dropdownStack[linkLevel - 1].opener;
						opener.click();
						opener.focus();
					}
					else {
						const menuBarLinkIndex = parseInt(this.dropdownStack[0].opener.getAttribute('data-index'), 10) || 0;
						let nextLink = this.menuBarNode.querySelector(`[data-index="${ menuBarLinkIndex + 1 }"]`);
						if (!nextLink) {
							nextLink = this.menuBarNode.querySelector(`[data-index="0"]`);
						}
						nextLink.click();
					}
				}
				else if (['Left', 'ArrowLeft'].includes(event.key)) {
					if (this.dropdownStack.length > 1) {
						const opener = this.dropdownStack[linkLevel - 1].opener;
						opener.click();
						opener.focus();
					} else {
						const menuBarLinkIndex = parseInt(this.dropdownStack[0].opener.getAttribute('data-index'), 10) || 0;
						let previousLink = this.menuBarNode.querySelector(`[data-index="${ menuBarLinkIndex - 1 }"]`);
						if (!previousLink) {
							previousLink = this.menuBarNode.querySelector(`[data-index="${ this.menuBarNode.querySelectorAll('[data-index]').length - 1 }"]`);
						}
						previousLink.click();
					}
				}
				else if (event.key === 'Home') {
					menuParent.querySelector(`[data-index="0"]`).focus();
				}
				else if (event.key === 'End') {
					menuParent.querySelector(`[data-index="${ this.dropdownStack[linkLevel - 1].children.length - 1 }"]`).focus();
				}
				else if ([' ', 'Enter'].includes(event.key)) {
					event.preventDefault();
					activeElement.click();
				}
				else if (['Esc', 'Escape'].includes(event.key)) {
					const opener = this.dropdownStack[linkLevel - 1].opener;
					opener.click();
					opener.focus();
				}
				else if (event.key === 'Tab') {
					this.close_child_dropdowns(0);
				}
			}
		}
	}

	on_click_menu(event) {
		const target = event.target.closest('a');

		// Any link in the menu is clicked.
		if (target && target.tagName === 'A') {
			const hasPopup = target.getAttribute('aria-haspopup') === 'true';			
			if (hasPopup) {
				this.toggle_dropdown(target, event.isTrusted);
			} else {
				this.trigger_link(target);
			}
		} else {
			this.close_child_dropdowns(0);
		}
	}

	on_resize_window(event) {
		const rerendered = this.update_menu_bar_collapse();
		this.update_menu_bar_overflow();

		//a re-render already closed the dropdowns, and their openers are gone
		if (!rerendered && this.dropdownStack.length > 0) {
			this.position_dropdowns();
		}
	}

	toggle_dropdown(opener, isTrusted) {
		const linkLevel = parseInt(opener.getAttribute('data-level'), 10) || 0;
		const linkIndex = parseInt(opener.getAttribute('data-index'), 10) || 0;
		if (opener.getAttribute('aria-expanded') === 'true') {
			this.close_child_dropdowns(linkLevel);
		} else {
			const parentList = opener.closest('ul');
			parentList.querySelectorAll('a').forEach((item) => {
				item.setAttribute('aria-expanded', 'false');
			});
			opener.setAttribute('aria-expanded', true);
			this.create_dropdown(opener, linkLevel, linkIndex, !isTrusted);
		}
	}

	trigger_link(link) {
		const level = parseInt(link.getAttribute('data-level'), 10) || 0;
		const index = parseInt(link.getAttribute('data-index'), 10) || 0;

		// Find link definition
		let children = this.menuBarDefinition;
		for (let i = 0; i < level; i++) {
			const childIndex = this.dropdownStack[i] != null ? this.dropdownStack[i].index : index;
			children = children[childIndex].children;
		}
		let definition = children[index];

		// Close the dropdown
		this.close_child_dropdowns(0);

		// Emit callback events for triggered links
		if (definition.target) {
			this.emit('select_target', definition.target, definition);
		}
		else if (definition.href) {
			this.emit('select_href', definition.href, null);
		}
	}

	close_child_dropdowns(level) {
		for (let i = this.dropdownStack.length - 1; i >= 0; i--) {
			if (i >= level) {
				this.dropdownStack[i].element.parentNode.removeChild(this.dropdownStack[i].element);
				this.dropdownStack[i].opener.setAttribute('aria-expanded', false);
			}
		}
		this.dropdownStack = this.dropdownStack.slice(0, level);
	}

	create_dropdown(opener, level, index, focusAfterCreation) {
		this.close_child_dropdowns(level);

		// Find child list in the menu definition
		let children = this.menuBarDefinition;
		for (let i = 0; i <= level; i++) {
			const childIndex = this.dropdownStack[i] != null ? this.dropdownStack[i].index : index;
			children = children[childIndex].children;
		}

		// Create the dropdown element, place it in DOM & position it
		let dropdownElement = document.createElement('ul');
		dropdownElement.className = 'menu_dropdown';
		dropdownElement.role = 'menu';
		dropdownElement.tabIndex = 0;
		dropdownElement.setAttribute('aria-labelledby', 'main_menu_' + level + '_' + index);
		let dropdownTemplate = '';
		for (let i = 0; i < children.length; i++) {
			dropdownTemplate += this.generate_menu_dropdown_item_template(children[i], level + 1, i);
		}
		dropdownElement.innerHTML = dropdownTemplate;

		this.menuContainer.appendChild(dropdownElement);

		if (config.LANG != 'en') {
			this.Tools_translate.translate(config.LANG, this.menuContainer);
		}

		if (focusAfterCreation) {
			dropdownElement.querySelector('a').focus();
		}

		this.dropdownStack.push({
			children,
			opener,
			index,
			element: dropdownElement
		});

		//before positioning: this moves the opener, and the dropdown follows it
		if (level === 0) {
			this.scroll_menu_bar_link_into_view(opener);
		}

		this.position_dropdowns();
	}

	position_dropdowns() {
		const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
		const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

		let topNavHeight = 0;
		for (let level = 0; level < this.dropdownStack.length; level++) {
			const dropdownElement = this.dropdownStack[level].element;
			const openerRect = this.dropdownStack[level].opener.getBoundingClientRect();

			topNavHeight = openerRect.height;
			const dropdownMaxHeight = vh - topNavHeight - this.dropdownMaxHeightMargin;
			dropdownElement.style.maxHeight = dropdownMaxHeight + 'px';
			const dropdownRect = dropdownElement.getBoundingClientRect();

			if (level === 0) {
				dropdownElement.style.top = (openerRect.y + openerRect.height) + 'px';

				let left = openerRect.x;
				if (left + dropdownRect.width > vw) {
					left = openerRect.x + openerRect.width - dropdownRect.width;
				}
				if (left + dropdownRect.width > vw) {
					left = vw - dropdownRect.width;
				}
				if (left < 0) {
					left = 0;
				}
				dropdownElement.style.left = left + 'px';
			} else {
				let top = openerRect.y;
				if (top + dropdownRect.height > vh - this.dropdownMaxHeightMargin) {
					top = vh - this.dropdownMaxHeightMargin - dropdownRect.height;
				}
				dropdownElement.style.top = top + 'px';

				let left = openerRect.x + openerRect.width + 1;
				if (left + dropdownRect.width > vw) {
					left = openerRect.x - dropdownRect.width - 1;
				}
				if (left < 0) {
					if (openerRect.x + (openerRect.width / 2) > vw / 2) {
						left = 1;
					} else {
						left = vw - dropdownRect.width - 1;
						if (left < 0) {
							left = 1;
						}
					}
				}
				dropdownElement.style.left = left + 'px';
			}
		}
	}

}

export default GUI_menu_class;
