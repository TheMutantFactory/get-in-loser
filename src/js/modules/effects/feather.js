import app from './../../app.js';
import config from './../../config.js';
import Dialog_class from './../../libs/popup.js';
import Base_layers_class from './../../core/base-layers.js';
import { MAX_RADIUS, feather_pixels } from './../../core/feather.js';
import { ensure_raster_layer } from './../../libs/rasterize.js';

/**
 * Feather: soften a layer's alpha edge. The maths lives in core/feather.js; this is the dialog.
 */
class Effects_feather_class {

	constructor() {
		this.POP = new Dialog_class();
		this.Base_layers = new Base_layers_class();
	}

	async feather() {
		var _this = this;

		if (config.layer.type != 'image' || config.layer.is_vector == true) {
			//Convert instead of demanding it - see libs/rasterize.js
			var ready = await ensure_raster_layer('edited');
			if (ready == false) {
				return;
			}
		}

		var settings = {
			title: 'Feather Edges',
			preview: true,
			effects: true,
			params: [
				{name: "radius", title: "Radius:", value: 4, range: [1, MAX_RADIUS]},
				{name: "inside_only", title: "Fade inward only:", value: false},
			],
			on_change: function (params, canvas_preview, w, h) {
				var img = canvas_preview.getImageData(0, 0, w, h);
				//SCALE THE RADIUS TO THE PREVIEW. The preview is the layer shrunk to fit the box, so
				//a radius applied at full strength there looks several times softer than the result.
				var scale = config.layer.width > 0 ? w / config.layer.width : 1;
				var out = _this.change(img, params, scale);
				canvas_preview.putImageData(out, 0, 0);
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
		ctx.putImageData(this.change(img, params, 1), 0, 0);

		return app.State.do_action(
			new app.Actions.Update_layer_image_action(canvas)
		);
	}

	/**
	 * @param {ImageData} data
	 * @param {object} params
	 * @param {number} scale how much smaller than the layer this data is
	 * @returns {ImageData}
	 */
	change(data, params, scale) {
		var radius = Math.max(1, Math.round(parseFloat(params.radius) * (scale || 1)));

		data.data.set(feather_pixels(data.data, data.width, data.height, {
			radius: radius,
			inside_only: params.inside_only === true,
		}));

		return data;
	}

	demo(canvas_id, canvas_thumb) {
		var canvas = document.getElementById(canvas_id);
		var ctx = canvas.getContext("2d");
		ctx.drawImage(canvas_thumb, 0, 0);

		var img = ctx.getImageData(0, 0, canvas_thumb.width, canvas_thumb.height);
		ctx.putImageData(this.change(img, {radius: 6, inside_only: false}, 1), 0, 0);
	}

}

export default Effects_feather_class;
