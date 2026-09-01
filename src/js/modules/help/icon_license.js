/*
 * Get in loser - https://github.com/TheMutantFactory/get-in-loser
 * Based on miniPaint by ViliusL.
 */
import Dialog_class from './../../libs/popup.js';
import context_menu from './../../libs/context_menu.js';
import icon_licenses from './../../../../assets/icon-licenses.json';

class Help_icon_license_class {

	constructor() {
		this.POP = new Dialog_class();
		//only one third-party icon so far; the data file is a list so it can grow
		this.data = icon_licenses.icons[0];
	}

	/**
	 * Right-click the hand in the logo -> licence options.
	 *
	 * The logo whimsy script rebuilds the wordmark's children on load, so bind
	 * the listener to .logo and match the hand by class rather than holding a
	 * reference to an element that gets replaced.
	 */
	init_context_menu() {
		var _this = this;
		var logo = document.querySelector('.logo');
		if (!logo) return;

		logo.addEventListener('contextmenu', function (event) {
			if (!event.target.closest || !event.target.closest('.logo_l')) return;
			event.preventDefault();
			context_menu.show(event.clientX, event.clientY, [
				{ label: 'Icon license', run: function () { _this.icon_license(); } },
				{ label: 'View on The Noun Project', run: function () { _this.open_source_page(); } }
			]);
		});
	}

	open_source_page() {
		window.open(this.data.url, '_blank', 'noopener');
	}

	icon_license() {
		var d = this.data;

		var html = ''
			+ '<div class="icon_license">'
			+ '<div class="icon_license_head">'
			+ '<img class="icon_license_art" src="images/favicon.png" alt="">'
			+ '<p class="icon_license_attribution">' + this.esc(d.attribution) + '</p>'
			+ '</div>'
			+ '<dl class="icon_license_facts">'
			+ this.fact('Icon', this.link(d.url, d.term))
			+ this.fact('Creator', this.link(d.creator.url, d.creator.name))
			+ this.fact('License', this.link(d.license.url, d.license.name)
				+ ' <span class="icon_license_muted">(' + this.esc(d.license.full_name) + ')</span>')
			+ this.fact('Source', this.esc(d.source))
			+ this.fact('Used for', this.esc(d.used_for))
			+ '</dl>'
			+ '<p class="icon_license_note">This license requires attribution to the creator, '
			+ 'which is what this dialog is. The icon is used with modifications: rotated left 90&deg; '
			+ 'and flipped horizontally so it reads as an <strong>L</strong>, then recolored per theme.</p>'
			+ '</div>';

		this.POP.show({
			title: 'Icon license',
			params: [
				{ title: '', html: html }
			],
			on_finish: function () { }
		});
	}

	fact(label, value_html) {
		return '<dt>' + this.esc(label) + '</dt><dd>' + value_html + '</dd>';
	}

	link(url, text) {
		return '<a href="' + this.esc(url) + '" target="_blank" rel="noopener">' + this.esc(text) + '</a>';
	}

	esc(s) {
		return String(s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

}

export default Help_icon_license_class;
