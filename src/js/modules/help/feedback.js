/*
 * Get in loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * Send feedback from inside the app, to feedback-service (envelope v1).
 *
 * Replaces the old Help > Report Issues link to GitHub issues. That link asked a reporter to leave
 * the app, hold a GitHub account, and reassemble by hand the build and state this sends for them.
 *
 * WHAT THIS SENDS is stated in the dialog, because the reporter is the one who should decide. The
 * screenshot is the whole privacy surface here: in a paint app the canvas is the reporter's own
 * artwork, and may be someone else's if they opened it. So it is OFF by default, labelled for what
 * it is, and never taken unless the box is ticked.
 */

import config from './../../config.js';
import Dialog_class from './../../libs/popup.js';
import Helper_class from './../../libs/helpers.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';
import {
	TEXT_LIMIT,
	IMAGE_LIMIT,
	classify_response,
	detect_platform,
	install_id,
	build_envelope,
} from './../../libs/feedback-envelope.js';
import {enqueue, pending_count, drain} from './../../libs/feedback-outbox.js';

/** No trailing slash. */
const ENDPOINT = 'https://feedback.mutantfactory.net';

/** Longest edge of the screenshot. Keeps a 4K canvas under the server's 2 MB image limit. */
const SHOT_MAX_EDGE = 1280;

var instance = null;

class Help_feedback_class {

	constructor() {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		this.POP = new Dialog_class();
		this.Helper = new Helper_class();
		this.draining = false;

		//an instance property, not the constant, so a staging service can be pointed at from the
		//console. Deliberately NOT read from a URL parameter - a link that redirects someone's
		//feedback to another server is not a feature.
		this.endpoint = ENDPOINT;

		//anything held from a previous session goes out as soon as there is a network again
		this.flush_later();
		window.addEventListener('online', () => this.flush_later(), false);
	}

	/**
	 * menu: Help > Send Feedback
	 */
	feedback() {
		var _this = this;
		var waiting = pending_count(window.localStorage);

		var settings = {
			title: 'Send Feedback',
			params: [
				{
					name: 'text',
					title: 'What happened?',
					type: 'textarea',
					value: '',
					placeholder: 'What you did, what you expected, what happened instead.',
				},
				{
					name: 'include_shot',
					title: 'Include a picture of the canvas:',
					value: false,
				},
				{title: '', html: this.explain(waiting)},
			],
			on_finish: function (params) {
				_this.submit(params);
			},
		};

		this.POP.show(settings);
	}

	/**
	 * The reporter is told what leaves their machine before they send it, not after.
	 *
	 * @param {number} waiting reports still queued from earlier
	 * @returns {string} html
	 */
	explain(waiting) {
		var held = waiting > 0
			? '<br><br><b>' + waiting + ' earlier report' + (waiting === 1 ? '' : 's')
				+ '</b> could not be sent yet and will go with this one.'
			: '';

		return '<span class="text_muted">'
			+ 'Sent with your note: the app version, your browser platform, the tool you have '
			+ 'selected, and a random id for this browser so replies can be grouped. '
			+ '<b>No account, no email, no canvas</b> &mdash; unless you tick the box, which sends '
			+ 'a picture of the visible canvas. <b>That is your artwork</b>, so it is off unless '
			+ 'you say otherwise. Reports are read by a person; nothing is published automatically.'
			+ held
			+ '</span>';
	}

	/**
	 * @param {object} params from the dialog
	 */
	async submit(params) {
		var text = String(params.text || '').trim();

		if (text.length === 0) {
			//the server would 400 this; saying so here costs the reporter nothing
			alertify.error('Add a note first - a report with no note cannot be acted on.');
			return;
		}
		if (text.length > TEXT_LIMIT) {
			alertify.error('That note is too long (limit ' + Math.floor(TEXT_LIMIT / 1024) + ' KB).');
			return;
		}

		var image = null;
		if (params.include_shot === true) {
			image = this.capture_canvas();
		}

		var envelope = build_envelope({
			text: text,
			app_version: typeof VERSION !== 'undefined' ? VERSION : 'unknown',
			platform: detect_platform(window.navigator),
			install_id: install_id(window.localStorage, () => this.random_id()),
			tool: config.TOOL ? config.TOOL.name : null,
			//ONE FACT, ONE FIELD. The flag says what is actually attached, not what was asked for:
			//if the capture failed there is no image, and claiming one nobody can produce is worse
			//than a plain no.
			shot_attached: image !== null,
		});

		if (envelope === null) {
			alertify.error('Add a note first.');
			return;
		}

		if (params.include_shot === true && image === null) {
			alertify.warning('The canvas picture could not be captured; sending the note without it.');
		}

		enqueue(window.localStorage, {envelope: envelope, image: image});

		var result = await this.flush();

		if (result.sent > 0) {
			alertify.success('Thanks - your feedback was sent.');
		}
		else if (result.rejected > 0) {
			alertify.error('The server refused that report. It has been kept, not sent again.');
		}
		else {
			//held: offline, rate limited or the service is down. The report is safe.
			alertify.warning('Saved. Your feedback will be sent next time you are online.');
		}
	}

	/**
	 * A PNG of the visible canvas, scaled down to stay under the server's image limit.
	 *
	 * @returns {string|null} data URL, or null when there is nothing to send or it did not work
	 */
	capture_canvas() {
		try {
			var source = document.getElementById('canvas_minipaint');
			if (source == null || source.width === 0 || source.height === 0) {
				return null;
			}

			var scale = Math.min(1, SHOT_MAX_EDGE / Math.max(source.width, source.height));
			var w = Math.max(1, Math.round(source.width * scale));
			var h = Math.max(1, Math.round(source.height * scale));

			var target = document.createElement('canvas');
			target.width = w;
			target.height = h;

			var ctx = target.getContext('2d');
			ctx.drawImage(source, 0, 0, w, h);

			var url = target.toDataURL('image/png');

			//a data URL is ~4/3 of the bytes it encodes; refuse rather than have the server 413 it
			if (url.length * 0.75 > IMAGE_LIMIT) {
				return null;
			}

			return url;
		}
		catch (e) {
			//a tainted canvas (an image opened from another origin) throws here. The note still goes.
			return null;
		}
	}

	/**
	 * @returns {string} 16 hex characters
	 */
	random_id() {
		var bytes = new Uint8Array(8);
		window.crypto.getRandomValues(bytes);

		return [...bytes].map((b) => ('0' + b.toString(16)).slice(-2)).join('');
	}

	/**
	 * Drain the outbox. Safe to call at any time; concurrent drains are refused rather than queued,
	 * because two drains racing over one queue is how duplicates are born.
	 *
	 * @returns {object} keys: sent, discarded, rejected, held
	 */
	async flush() {
		if (this.draining) {
			return {sent: 0, discarded: 0, rejected: 0, held: 0};
		}
		this.draining = true;

		try {
			return await drain(window.localStorage, (entry) => this.send(entry));
		}
		finally {
			this.draining = false;
		}
	}

	/**
	 * Try once, on the next tick, and never let it surface an error - a background flush that pops
	 * a dialog on app start would be worse than a report arriving a session late.
	 */
	flush_later() {
		window.setTimeout(() => {
			this.flush().catch(() => {});
		}, 2000);
	}

	/**
	 * Send one queued report: the note, then the image.
	 *
	 * @param {object} entry keys: envelope, image
	 * @returns {string} outcome for the outbox
	 */
	async send(entry) {
		var response;
		try {
			response = await fetch(this.endpoint + '/v1/report', {
				method: 'POST',
				headers: {'content-type': 'application/json'},
				body: JSON.stringify(entry.envelope),
			});
		}
		catch (e) {
			//offline, DNS, blocked by an extension. The report is fine; the world is not.
			return 'retry';
		}

		var body = null;
		try {
			body = await response.json();
		}
		catch (e) {
			//a body we cannot read does not change what the status means
		}

		var outcome = classify_response(response.status, body);

		if (outcome === 'sent' && entry.image && body && body.id && body.image_accepted) {
			//the image is a separate step on purpose: a refused image must never cost the report,
			//so its failure is swallowed and the report still counts as sent.
			await this.send_image(body.id, entry.image);
		}

		return outcome;
	}

	/**
	 * @param {string} id report id from the server
	 * @param {string} data_url the PNG
	 */
	async send_image(id, data_url) {
		try {
			var blob = await (await fetch(data_url)).blob();

			await fetch(this.endpoint + '/v1/report/' + encodeURIComponent(id) + '/image', {
				method: 'PUT',
				headers: {'content-type': 'image/png'},
				body: blob,
			});
		}
		catch (e) {
			//the note is the part that matters and it is already stored
		}
	}

}

export default Help_feedback_class;
