import config from './../../config.js';
import Dialog_class from './../../libs/popup.js';

class Help_about_class {

	constructor() {
		this.POP = new Dialog_class();
	}

	//about
	about() {
		var settings = {
			title: 'About',
			params: [
				{title: "", html: '<img style="width:64px;" class="about-logo" alt="" src="images/favicon.png" />'},
				{title: "Name:", html: '<span class="about-name">Get in loser</span>'},
				{title: "Version:", value: VERSION},
				{title: "Description:", value: "A personal browser-based image editor."},
				{title: "Author:", value: 'DazzlingDukeOfLazers'},
				{title: "GitHub:", html: '<a href="https://github.com/DazzlingDukeOfLazers/get-in-loser">https://github.com/DazzlingDukeOfLazers/get-in-loser</a>'},
				{title: "Based on:", html: 'miniPaint by ViliusL &mdash; <a href="https://github.com/viliusle/miniPaint">https://github.com/viliusle/miniPaint</a>'},
			],
		};
		this.POP.show(settings);
	}

}

export default Help_about_class;
