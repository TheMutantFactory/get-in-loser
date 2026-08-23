import app from './../../app.js';
import config from './../../config.js';
import Dialog_class from './../../libs/popup.js';
import Base_layers_class from './../../core/base-layers.js';
import { MAX_TOLERANCE, remove_background } from './../../core/background-removal.js';
import { ensure_raster_layer } from './../../libs/rasterize.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';

/**
 * Remove Background: clear whatever region reaches the edge of the layer. The flood lives in
 * core/background-removal.js; this is the dialog.
 */
class Tools_removeBackground_class {

	constructor() {
		this.POP = new Dialog_class();
		this.Base_layers = new Base_layers_class();
	}

	async remove_background() {
		var _this = this;

		if (config.layer.type != 'image' || config.layer.is_vector == true) {
			//Convert instead of demanding it - see libs/rasterize.js
			var ready = await ensure_raster_layer('edited');
			if (ready == false) {
				return;
			}
		}

		var settings = {
			title: 'Remove Background',
			preview: true,
			effects: true,
			params: [
				{name: "tolerance", title: "Tolerance:", value: 30, range: [0, MAX_TOLERANCE]},
				{name: "soften", title: "Soften edge:", value: 30, range: [0, 128]},
			],
			on_change: function (params, canvas_preview, w, h) {
				var img = canvas_preview.getImageData(0, 0, w, h);
				canvas_preview.putImageData(_this.change(img, params), 0, 0);
			},
			on_finish: function (params) {
				_this.save(params);
			},
		};
		this.POP.show(settings);
	}

	save(params) {
		var canvas = this.Base_layers.convert_layer_to_canvas(null, true);
		var ctx = canvas.getContext("2d");

		var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
		var result = remove_background(img.data, img.width, img.height, this.options(params));

		if (result == null || result.background == null) {
			//nothing along the edge to take: say so rather than pushing an empty undo step
			alertify.warning('Nothing to remove - the edges of this layer are already transparent.');
			return;
		}
		if (result.removed == 0) {
			alertify.warning('Nothing matched. Try a higher tolerance.');
			return;
		}

		img.data.set(result.data);
		ctx.putImageData(img, 0, 0);

		return app.State.do_action(
			new app.Actions.Update_layer_image_action(canvas)
		);
	}

	options(params) {
		var tolerance = parseFloat(params.tolerance);
		var soften = parseFloat(params.soften);

		return {
			tolerance: isNaN(tolerance) ? 0 : tolerance,
			soften: isNaN(soften) ? 0 : soften,
		};
	}

	/**
	 * @param {ImageData} data
	 * @param {object} params
	 * @returns {ImageData}
	 */
	change(data, params) {
		var result = remove_background(data.data, data.width, data.height, this.options(params));

		if (result != null) {
			data.data.set(result.data);
		}

		return data;
	}

}

export default Tools_removeBackground_class;
