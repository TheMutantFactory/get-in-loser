import {set_clipboard} from './../../libs/clipboard-store.js';
import config from "../../config";
import Base_layers_class from './../../core/base-layers.js';
import File_save_class from './../file/save.js';
import Helper_class from './../../libs/helpers.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';

var instance = null;

class Copy_class {

	constructor() {
		//singleton
		if (instance) {
			return instance;
		}
		instance = this;

		this.Base_layers = new Base_layers_class();
		this.Helper = new Helper_class();
		this.File_save = new File_save_class();

		//events
		document.addEventListener('keydown', (event) => {
			var code = event.key.toLowerCase();
			var ctrlDown = event.ctrlKey || event.metaKey;
			if (this.Helper.is_input(event.target))
				return;

			if (code == "c" && ctrlDown == true) {
				//copy to clipboard
				this.copy_to_clipboard();
			}
		}, false);
	}

	async copy_to_clipboard(){
		var _this = this;

		//COPY NEVER FAILS ANY MORE. The old flow asked permission first and treated anything but
		//an explicit grant - including a permissions API that merely THROWS on some engines - as
		//refusal, so Copy died with nothing copied anywhere. The app's own clipboard needs no
		//permission at all; the system clipboard becomes a best effort on top.
		var canvas = this.Base_layers.convert_layer_to_canvas();
		var ctx = canvas.getContext("2d");

		if (config.TRANSPARENCY == false) {
			//add white background
			ctx.globalCompositeOperation = 'destination-over';
			this.File_save.fillCanvasBackground(ctx, '#ffffff');
			ctx.globalCompositeOperation = 'source-over';
		}

		set_clipboard(canvas);

		canvas.toBlob(async function (blob) {
			try {
				const data = [new ClipboardItem({ [blob.type]: blob })];
				await navigator.clipboard.write(data);
				alertify.success('Copied.');
			}
			catch (error) {
				//the in-app copy above already succeeded; paste inside the editor works either way
				alertify.success('Copied within the app. (The browser refused its own clipboard.)');
			}
		});
	}
}

export default Copy_class;
