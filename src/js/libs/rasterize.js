/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * "This layer must contain an image. Please convert it to raster to apply this tool."
 *
 * That message names the fix and then declines to apply it. Rasterizing is what it asks for, and
 * the app can do it, so every tool and effect that hits this calls in here instead of refusing.
 *
 * This is a lib rather than a method on Base_tools because effects are plain classes that do not
 * extend it, and one implementation serving both is better than two that drift. It reaches the
 * raster module through `app` rather than importing Base_gui, which would close an import cycle
 * (base-gui -> modules -> this -> base-gui).
 */

import app from './../app.js';
import config from './../config.js';
import alertify from './../../../node_modules/alertifyjs/build/alertify.min.js';

/**
 * Make the active layer a raster image, if it is not one already.
 *
 * The conversion is its OWN undo step rather than being folded into the caller's action, so it can
 * be undone on its own and a tool that converts then does nothing has still left a reversible
 * trail. Nothing here is silent - losing the ability to re-edit a stroke as vector is worth a
 * sentence.
 *
 * @param {string} reason shown to the user, completing "so it can be ___"
 * @returns {Promise<boolean>} false when there is nothing to convert, or the conversion failed
 */
async function ensure_raster_layer(reason) {
	var layer = config.layer;

	if (layer == null || layer.type == null) {
		//an empty layer. Nothing to convert and nothing to act on - and not an error either.
		return false;
	}
	if (layer.type == 'image' && layer.is_vector != true) {
		//already usable
		return true;
	}

	var raster = app.GUI && app.GUI.modules ? app.GUI.modules['layer/raster'] : null;
	if (raster == null) {
		return false;
	}

	//raster() returns the promise deliberately - Insert_layer_action loads a data URL
	//asynchronously, so the new layer does not exist until this resolves
	await raster.raster();

	//re-read rather than trusting the old reference: raster() swaps in a NEW layer
	var converted = config.layer != null && config.layer.type == 'image';
	if (converted) {
		alertify.success('Layer converted to raster so it can be ' + (reason || 'edited') + '.');
	}

	return converted;
}

export {ensure_raster_layer};
