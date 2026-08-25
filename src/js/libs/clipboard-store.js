/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * The in-app clipboard: where Copy always lands, whatever the browser thinks of us.
 *
 * The system clipboard needs permissions the browser may refuse - a query that THROWS on some
 * engines was being read as "denied", and Copy failed outright with nothing copied anywhere
 * ("Missing permissions to write to Clipboard.cc", typo inherited from upstream). Copying INSIDE
 * the app never needed the system's blessing: the pixels are already ours. So Copy stores here
 * first, unconditionally, then offers the blob to the system as a courtesy; Paste reaches here
 * whenever the system clipboard is refused, empty, or absent.
 */

var stored = null;

/** @param {HTMLCanvasElement} canvas kept as a data URL, so later mutations cannot reach it */
function set_clipboard(canvas) {
	try {
		stored = canvas.toDataURL('image/png');
	}
	catch (e) {
		//a tainted canvas cannot be serialized; better an empty clipboard than a poisoned one
		stored = null;
	}
}

/** @returns {string|null} a data URL, or null when nothing has been copied this session */
function get_clipboard() {
	return stored;
}

function has_clipboard() {
	return stored != null;
}

export {set_clipboard, get_clipboard, has_clipboard};
