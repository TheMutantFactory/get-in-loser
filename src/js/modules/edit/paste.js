import {get_clipboard, has_clipboard} from './../../libs/clipboard-store.js';
import app from './../../app.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';

class Edit_paste_class {

	/**
	 * Paste from a menu click. Reads the clipboard via the async Clipboard API,
	 * which prompts for the clipboard-read permission on first use (Chromium).
	 * Falls back to the Ctrl+V paste-event path where reading is unavailable or
	 * blocked (Firefox/Safari, insecure context, permission denied).
	 */
	async paste() {
		if (!navigator.clipboard || !navigator.clipboard.read) {
			if (this.paste_internal()) {
				return;
			}
			alertify.error('This browser blocks reading the clipboard from a menu. Use the Ctrl+V keyboard shortcut to paste.');
			return;
		}

		var items;
		try {
			items = await navigator.clipboard.read();
		} catch (e) {
			//the system said no; whatever Copy stored in the app still pastes
			if (this.paste_internal()) {
				return;
			}
			alertify.error('Clipboard access was blocked. Allow clipboard access, or use the Ctrl+V keyboard shortcut to paste.');
			return;
		}

		for (var i = 0; i < items.length; i++) {
			var image_type = items[i].types.find(function (t) { return t.indexOf('image/') === 0; });
			if (image_type) {
				var blob = await items[i].getType(image_type);
				var source = (window.URL || window.webkitURL).createObjectURL(blob);
				this.paste_image(source);
				return;
			}
		}

		if (this.paste_internal()) {
			return;
		}
		alertify.error('No image found on the clipboard. Copy an image first, or use Ctrl+V.');
	}

	/** whatever Edit > Copy stored in the app, pasted - no browser opinion required */
	paste_internal() {
		if (!has_clipboard()) {
			return false;
		}
		this.paste_image(get_clipboard());
		return true;
	}

	//add the pasted image as a new layer (same as the Ctrl+V paste-event path)
	paste_image(source) {
		var image = new Image();
		image.onload = function () {
			app.State.do_action(
				new app.Actions.Insert_layer_action({
					name: 'Paste',
					type: 'image',
					data: source,
				})
			);
		};
		image.src = source;
	}
}

export default Edit_paste_class;
