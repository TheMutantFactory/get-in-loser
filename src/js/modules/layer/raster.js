import app from './../../app.js';
import config from './../../config.js';
import Base_layers_class from './../../core/base-layers.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';

class Layer_raster_class {

	constructor() {
		this.Base_layers = new Base_layers_class();
	}

	raster() {
		var canvas = this.Base_layers.convert_layer_to_canvas();
		var current_layer = config.layer;
		var current_id = current_layer.id;

		//show
		var params = {
			type: 'image',
			name: config.layer.name + ' + raster',
			data: canvas.toDataURL("image/png"),
			x: parseInt(canvas.dataset.x),
			y: parseInt(canvas.dataset.y),
			width: canvas.width,
			height: canvas.height,
			opacity: current_layer.opacity,
		};
		//RETURN the promise. Insert_layer_action loads the data URL asynchronously, so a caller
		//that needs the new raster layer to exist - a tool rasterizing before it paints - has to be
		//able to wait for it. Dropping it on the floor made `await raster()` resolve immediately,
		//before the layer had been swapped.
		return app.State.do_action(
			new app.Actions.Bundle_action('convert_to_raster', 'Convert to Raster', [
				new app.Actions.Insert_layer_action(params, false),
				new app.Actions.Delete_layer_action(current_id)
			])
		);
	}

}

export default Layer_raster_class;
