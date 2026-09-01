import config from './../../config.js';
import Dialog_class from './../../libs/popup.js';

/**
 * The About dialog is the app's only piece of marketing copy, so it is built as
 * one block of markup rather than the popup's default title/value table: the
 * feature grid and the imprint line need a layout the table cannot express.
 * Styles live in popup.css under `.get-in-loser-about`.
 */
class Help_about_class {

	constructor() {
		this.POP = new Dialog_class();
	}

	//about
	about() {
		var html = [
			'<div class="get-in-loser-about">',
				'<p class="about-intro"><strong>Pixels, voxels, and sound. One local workspace.</strong><br>A free browser-based image editor where pixel art, tiny voxel models, background removal, and playable SoundGraph instruments collide. Your work stays on your device.</p>',
				'<p class="about-promise">Free to use / No upload required / Runs in your browser</p>',
				'<div class="about-grid">',
					'<div class="about-feature"><strong>Paint exact pixels</strong><span>Whole-pixel brushes, editable JSON palettes, exact palette replacement, and tools that rasterize when needed.</span></div>',
					'<div class="about-feature"><strong>Turn sprites into objects</strong><span>Edit slices on three axes, use onion skinning, preview the result, and import or export MagicaVoxel files.</span></div>',
					'<div class="about-feature"><strong>Work the edges</strong><span>A matting pipeline, feathering, and a scribble-friendly background eraser replace the usual mystery button.</span></div>',
					'<div class="about-feature"><strong>Play the canvas</strong><span>SoundGraph instruments, a piano roll, and a playable keyboard live beside the image tools.</span></div>',
				'</div>',
				'<p class="about-meta">',
					'<strong>Published by:</strong> <a href="https://mutantfactory.net/" target="_blank" rel="noopener noreferrer">Mutant Factory</a><br>',
					'<strong>Version:</strong> ' + VERSION + '<br>',
					'<strong>Author:</strong> DazzlingDukeOfLazers<br>',
					'<strong>Source:</strong> <a href="https://github.com/TheMutantFactory/get-in-loser">github.com/TheMutantFactory/get-in-loser</a><br>',
					'<strong>Based on:</strong> miniPaint by ViliusL &mdash; <a href="https://github.com/viliusle/miniPaint">github.com/viliusle/miniPaint</a>',
				'</p>',
			'</div>'
		].join('');

		var settings = {
			title: 'About',
			params: [
				{html: html},
			],
		};
		this.POP.show(settings);
	}

}

export default Help_about_class;
