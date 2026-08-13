import app from './../../app.js';
import config from './../../config.js';
import Base_layers_class from './../../core/base-layers.js';
import colorThief_class from './../../libs/color-thief.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';
import Dialog_class from './../../libs/popup.js';
import Helper_class from './../../libs/helpers.js';

class Image_color_class {

	constructor() {
		this.Base_layers = new Base_layers_class();
		this.ColorThief = new colorThief_class();
		this.POP = new Dialog_class();
		this.Helper = new Helper_class();
		this.original_palette = [];
	}

	palette() {
		var _this = this;

		if (config.layer.type != 'image') {
			alertify.error('This layer must contain an image. Please convert it to raster to apply this tool.');
			return;
		}
		var palette = this.ColorThief.getPalette(config.layer.link);
		var dominant = this.ColorThief.getColor(config.layer.link);
		dominant = this.Helper.rgbToHex(dominant[0], dominant[1], dominant[2]);

		this.original_palette = [];

		var settings = {
			title: 'Palette',
			preview: true,
			on_change: function (params, canvas_preview, w, h) {
				var img = canvas_preview.getImageData(0, 0, w, h);
				var data = _this.remap_palette(img, params);
				canvas_preview.putImageData(data, 0, 0);
			},
			params: [
				{title: "Dominant color:", html: this.generate_color_box(dominant, 200)},
			],
			on_finish: function (params) {
				_this.execute(params);
			},
		};
		for (var i in palette) {
			var rgb = this.Helper.rgbToHex(palette[i][0], palette[i][1], palette[i][2]);
			i = parseInt(i);
			this.original_palette.push({r: palette[i][0], g: palette[i][1], b: palette[i][2]});
			settings.params.push(
				{name: "color_" + i, title: "Color #" + (i + 1) + ":", value: rgb, type: 'color'}
			);
		}
		this.POP.show(settings);
	}

	execute(params) {
		//get canvas from layer
		var canvas = this.Base_layers.convert_layer_to_canvas(null, true);
		var ctx = canvas.getContext("2d");

		//change data
		var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
		var data = this.remap_palette(img, params);
		ctx.putImageData(data, 0, 0);

		//save
		return app.State.do_action(
			new app.Actions.Update_layer_image_action(canvas)
		);
	}

	remap_palette(data, params) {
		var old_palette = this.original_palette;
		var p_n = old_palette.length;

		//collect deltas between original and edited colors
		var deltas = [];
		var changed = false;
		for (var m = 0; m < p_n; m++) {
			var new_rgb = this.Helper.hexToRgb(params["color_" + m]);
			deltas[m] = {
				r: new_rgb.r - old_palette[m].r,
				g: new_rgb.g - old_palette[m].g,
				b: new_rgb.b - old_palette[m].b,
			};
			if (deltas[m].r != 0 || deltas[m].g != 0 || deltas[m].b != 0)
				changed = true;
		}
		if (changed == false)
			return data;

		var imgData = data.data;
		for (var k = 0; k < imgData.length; k += 4) {
			if (imgData[k + 3] == 0)
				continue;	//transparent

			//find closest original palette color
			var index1 = 0;
			var min = 999999;
			for (var m = 0; m < p_n; m++) {
				var diff = Math.abs(old_palette[m].r - imgData[k])
					+ Math.abs(old_palette[m].g - imgData[k + 1])
					+ Math.abs(old_palette[m].b - imgData[k + 2]);
				if (diff < min) {
					min = diff;
					index1 = m;
				}
			}

			var delta = deltas[index1];
			if (delta.r == 0 && delta.g == 0 && delta.b == 0)
				continue;

			//shift by the edited color's delta, keeping shading
			imgData[k] = Math.max(0, Math.min(255, imgData[k] + delta.r));
			imgData[k + 1] = Math.max(0, Math.min(255, imgData[k + 1] + delta.g));
			imgData[k + 2] = Math.max(0, Math.min(255, imgData[k + 2] + delta.b));
		}

		return data;
	}

	generate_color_box(color, width) {
		var html = '';

		html += '<input style="width:100px;margin-right:10px;" type="text" value="' + color + '" readonly="readonly" />';
		html += '<span style="display:inline-block;width:' + width + 'px;height:21px;margin-bottom:-6px;border:1px solid black;background-color:' + color + '"></span>';

		return html;
	}

}

export default Image_color_class;
