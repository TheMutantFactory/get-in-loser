//main config file

var config = {};

config.TRANSPARENCY = false;
config.TRANSPARENCY_TYPE = 'squares'; //squares, green, grey
config.LANG = 'en';
config.WIDTH = null;
config.HEIGHT = null;
config.visible_width = null;
config.visible_height = null;
config.COLOR = '#000000';
config.ALPHA = 255;
config.ZOOM = 1;
config.SNAP = true;
config.pixabay_key = '3ca2cd8af3fde33af218bea02-9021417';
config.safe_search_can_be_disabled = true;
config.google_webfonts_key = 'AIzaSyBES3AipG'+'YVYNLtS,Vk-hJ11bbhJ9sTpRbA'.replace(',', '');
config.layers = [];
config.layer = null;
config.need_render = false;
config.need_render_changed_params = false; // Set specifically when param change in layer details triggered render
config.mouse = {};
config.mouse_lock = null;
config.swatches = {
	// yonce theme palette (3 rows x 7). Slot 0 mirrors the current color, so it
	// leads with black (the default) to avoid overwriting a unique theme color.
	default: [
		'#000000', '#0f0b14', '#14101b', '#1b1524', '#241a30', '#281c33', '#302340',
		'#3d2d50', '#503865', '#a06fca', '#fc4384', '#ce59a7', '#37e5e7', '#ffffff',
		'#121212', '#1c1c1c', '#2f2f2f', '#3a3a3a', '#4a4a4a', '#b7b7c0', '#e6e6e6'
	]
};
config.user_fonts = {};
config.guides_enabled = true;
config.guides = [];
config.ruler_active = false;
config.enable_autoresize_by_default = true;

//requires styles in reset.css
config.themes = [
	'yonce',
	'classic',
	'dark',
	'light',
	'green',
];

//no-translate BEGIN
config.FONTS = [
	"Atkinson Hyperlegible",
	"Arial",
	"Courier",
	"Impact",
	"Helvetica",
	"Monospace",
	"Tahoma",
	"Times New Roman",
	"Verdana",
	"Amatic SC",
	"Arimo",
	"Codystar",
	"Creepster",
	"Indie Flower",
	"Lato",
	"Lora",
	"Merriweather",
	"Monoton",
	"Montserrat",
	"Mukta",
	"Muli",
	"Nosifer",
	"Nunito",
	"Oswald",
	"Orbitron",
	"Pacifico",
	"PT Sans",
	"PT Serif",
	"Playfair Display",
	"Poppins",
	"Raleway",
	"Roboto",
	"Rubik",
	"Special Elite",
	"Tangerine",
	"Titillium Web",
	"Ubuntu"
];
//no-translate END

config.TOOLS = [
	{
		name: 'select',
		title: 'Select object tool',
		attributes: {
			auto_select: true,
		},
	},
	{
		name: 'selection',
		attributes: {},
		on_leave: 'on_leave',
	},
	{
		name: 'brush',
		attributes: {
			size: 4,
			pressure: false,
		},
	},
	{
		name: 'pencil',
		attributes: {
			size: 1,
			pressure: false,
		},
	},
	{
		name: 'pick_color',
		attributes: {
			global: false,
		},
	},
	{
		name: 'erase',
		on_update: 'on_params_update',
		attributes: {
			size: 30,
			circle: true,
			strict: true,
		},
	},
	{
		name: 'magic_erase',
		title: 'Magic Eraser Tool',
		attributes: {
			power: 15,
			anti_aliasing: true,
			contiguous: false,
		},
	},
	{
		name: 'fill',
		attributes: {
			power: 5,
			anti_aliasing: false,
			contiguous: false,
		},
	},
	{
		name: 'shape',
		on_activate: 'on_activate',
		title: 'Shapes (H)',
		attributes: {
			size: 3,
			stroke: '#00aa00',
		},
	},
	{
		name: 'line',
		visible: false,
		attributes: {
			size: 4,
		},
	},
	{
		name: 'arrow',
		visible: false,
		attributes: {
			size: 4,
		},
	},
	{
		name: 'rectangle',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
			radius: {
				value: 0,
				min: 0,
			},
			square: false,
		},
	},
	{
		name: 'ellipse',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
			circle: false,
		},
	},
	{
		name: 'media',
		title: 'Search Images',
		on_activate: 'on_activate',
		attributes: {
			size: 30,
		},
	},
	{
		name: 'triangle',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'right_triangle',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'romb',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'parallelogram',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'trapezoid',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'plus',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'pentagon',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'hexagon',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'star',
		visible: false,
		attributes: {
			border_size: 4,
			corners: 5,
			inner_radius: 40,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'heart',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'cylinder',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'human',
		visible: false,
		attributes: {
			border_size: 4,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'tear',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'cog',
		visible: false,
		attributes: {
			fill_color: '#555555',
		},
	},
	{
		name: 'bezier_curve',
		visible: false,
		attributes: {
			size: 4,
		},
	},
	{
		name: 'moon',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'callout',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
	{
		name: 'text',
		on_update: 'on_params_update',
		attributes: {
			font: {
				value: 'Atkinson Hyperlegible',
				values() {
					const user_font_names = Object.keys(config.user_fonts);
					return ['', '[Add Font...]', ...Array.from(new Set([...config.FONTS, ...user_font_names].sort()))];
				}
			},
			size: 40,
			bold: {
				value: false,
				icon: `bold.svg`
			},
			italic: {
				value: false,
				icon: `italic.svg`
			},
			underline: {
				value: false,
				icon: `underline.svg`
			},
			strikethrough: {
				value: false,
				icon: `strikethrough.svg`
			},
			fill: '#000000',
			stroke: '#000000',
			stroke_size: {
				value: 0,
				min: 0,
				step: 0.1
			},
			kerning: {
				value: 0,
				min: -999,
				max: 999,
				step: 1
			},
			leading: {
				value: 0,
				min: -999,
				max: 999,
				step: 1
			}
		},
	},
	{
		name: 'gradient',
		attributes: {
			color_1: '#000000',
			color_2: '#ffffff',
			alpha: 0,
			radial: false,
			radial_power: 50,
		},
	},
	{
		name: 'clone',
		attributes: {
			size: 30,
			anti_aliasing: true,
			source_layer: {
				value: 'Current',
				values: ['Current', 'Previous'],
			},
		},
	},
	{
		name: 'crop',
		on_update: 'on_params_update',
		on_leave: 'on_leave',
		attributes: {
			crop: true,
		},
	},
	{
		name: 'blur',
		attributes: {
			size: 30,
			strength: 1,
		},
	},
	{
		name: 'sharpen',
		attributes: {
			size: 30,
		},
	},
	{
		name: 'desaturate',
		attributes: {
			size: 50,
			anti_aliasing: true,
		},
	},
	{
		name: 'bulge_pinch',
		title: 'Bulge/Pinch Tool',
		attributes: {
			radius: 80,
			power: 50,
			bulge: true,
		},
	},
	{
		name: 'animation',
		on_activate: 'on_activate',
		on_update: 'on_params_update',
		on_leave: 'on_leave',
		attributes: {
			play: false,
			delay: 400,
		},
	},
	{
		name: 'polygon',
		visible: false,
		attributes: {
			border_size: 4,
			border: true,
			fill: true,
			border_color: '#555555',
			fill_color: '#000000',
		},
	},
];

//link to active tool
config.TOOL = config.TOOLS[2];
	
export default config;