/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * The voxel volume. Pure - see tests/voxel.test.js.
 *
 * THE VOLUME IS THE SOURCE OF TRUTH, NOT THE SLICES. A slice is a VIEW: reading one produces a
 * flat image the editor can paint on, writing one puts those pixels back. Rotating to work on a
 * different face changes which way the volume is cut, never the volume itself - so it is instant,
 * lossless, and repeatable. Storing 24 stacked layers instead would make every rotation a rebuild
 * of the whole stack, and a non-cube volume (16 x 16 x 24) would not survive the round trip.
 *
 * AXES. x is width (left to right), y is HEIGHT (bottom to top), z is depth - and the FRONT FACE
 * IS z = d-1, not z = 0. This comment used to say "front to back", and believing it cost a real
 * bug: the Front slice view draws x rightward and y upward, which places its viewer on the +z
 * side (screen-out = x-cross-y = +z), so the face that viewer sees is the LARGEST z. The .vox
 * exporter was written against the wrong reading and mirrored every model it saved.
 * "16w x 16d x 24h" is therefore w:16, d:16, h:24.
 */

/** The size this mode is built around. */
const DEFAULT_SIZE = {w: 16, d: 16, h: 24};

/** Bigger than this is not pixel art any more, and the isometric preview stops being readable. */
const MAX_SIZE = 256;

/**
 * Which axis the volume is cut along. The slice plane is the other two.
 *
 *   y - looking down at the top. 24 slices of 16w x 16d
 *   z - looking at the front.    16 slices of 16w x 24h
 *   x - looking at the side.     16 slices of 16d x 24h
 */
const AXES = ['y', 'z', 'x'];

/** Human labels, in the order a person would think of them. */
const AXIS_LABELS = {y: 'Top', z: 'Front', x: 'Side'};

/**
 * @param {number} r 0-255
 * @param {number} g
 * @param {number} b
 * @param {number} a
 * @returns {number} 0xAARRGGBB. Zero means empty - a fully transparent voxel is no voxel.
 */
function pack(r, g, b, a) {
	if (a === 0) {
		return 0;
	}

	return (((a & 255) << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) >>> 0;
}

/**
 * @param {number} value 0xAARRGGBB
 * @returns {object} keys r, g, b, a
 */
function unpack(value) {
	return {
		r: (value >>> 16) & 255,
		g: (value >>> 8) & 255,
		b: value & 255,
		a: (value >>> 24) & 255,
	};
}

/**
 * @param {number} w
 * @param {number} d
 * @param {number} h
 * @returns {object} keys: w, d, h, data (Uint32Array)
 */
function create_volume(w, d, h) {
	var size = {
		w: clamp_dimension(w, DEFAULT_SIZE.w),
		d: clamp_dimension(d, DEFAULT_SIZE.d),
		h: clamp_dimension(h, DEFAULT_SIZE.h),
	};

	return {
		w: size.w,
		d: size.d,
		h: size.h,
		data: new Uint32Array(size.w * size.d * size.h),
	};
}

/**
 * @param {*} value
 * @param {number} fallback
 * @returns {number} a whole number of voxels, at least 1
 */
function clamp_dimension(value, fallback) {
	var n = parseInt(value, 10);
	if (isNaN(n) || n < 1) {
		return fallback;
	}

	return Math.min(n, MAX_SIZE);
}

/**
 * @param {object} vol
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {number} index into vol.data, or -1 when outside
 */
function index_of(vol, x, y, z) {
	if (x < 0 || y < 0 || z < 0 || x >= vol.w || y >= vol.h || z >= vol.d) {
		return -1;
	}

	return (y * vol.d + z) * vol.w + x;
}

/**
 * @returns {number} 0xAARRGGBB, 0 for empty or out of bounds
 */
function get_voxel(vol, x, y, z) {
	var i = index_of(vol, x, y, z);

	return i < 0 ? 0 : vol.data[i];
}

/**
 * @returns {boolean} whether anything was written
 */
function set_voxel(vol, x, y, z, value) {
	var i = index_of(vol, x, y, z);
	if (i < 0) {
		return false;
	}
	vol.data[i] = value >>> 0;

	return true;
}

/**
 * Size of a slice taken along the given axis, and how many there are.
 *
 * @param {object} vol
 * @param {string} axis one of AXES
 * @returns {object} keys: width, height, count
 */
function slice_dimensions(vol, axis) {
	if (axis === 'z') {
		return {width: vol.w, height: vol.h, count: vol.d};
	}
	if (axis === 'x') {
		return {width: vol.d, height: vol.h, count: vol.w};
	}

	//'y', the default: looking down at the top
	return {width: vol.w, height: vol.d, count: vol.h};
}

/**
 * Where a pixel of a slice lives in the volume.
 *
 * v is measured DOWNWARD from the top of the slice image, because that is how a canvas is
 * addressed. For the side-on views that means flipping against y, which counts upward - get this
 * backwards and the model is drawn upside down.
 *
 * @param {object} vol
 * @param {string} axis
 * @param {number} slice index along the axis
 * @param {number} u column in the slice image
 * @param {number} v row in the slice image, from the top
 * @returns {object} keys x, y, z
 */
function slice_to_voxel(vol, axis, slice, u, v) {
	if (axis === 'z') {
		return {x: u, y: vol.h - 1 - v, z: slice};
	}
	if (axis === 'x') {
		return {x: slice, y: vol.h - 1 - v, z: u};
	}

	return {x: u, y: slice, z: v};
}

/**
 * Read one slice out as a flat image.
 *
 * @param {object} vol
 * @param {string} axis
 * @param {number} slice
 * @returns {object} keys: width, height, data (Uint32Array, row major)
 */
function read_slice(vol, axis, slice) {
	var dims = slice_dimensions(vol, axis);
	var out = new Uint32Array(dims.width * dims.height);

	for (var v = 0; v < dims.height; v++) {
		for (var u = 0; u < dims.width; u++) {
			var p = slice_to_voxel(vol, axis, slice, u, v);
			out[v * dims.width + u] = get_voxel(vol, p.x, p.y, p.z);
		}
	}

	return {width: dims.width, height: dims.height, data: out};
}

/**
 * Put a flat image back into the volume as one slice.
 *
 * @param {object} vol
 * @param {string} axis
 * @param {number} slice
 * @param {Uint32Array} pixels row major, length width*height for this axis
 * @returns {number} how many voxels were written
 */
function write_slice(vol, axis, slice, pixels) {
	var dims = slice_dimensions(vol, axis);
	var written = 0;

	if (!pixels || pixels.length < dims.width * dims.height) {
		return 0;
	}

	for (var v = 0; v < dims.height; v++) {
		for (var u = 0; u < dims.width; u++) {
			var p = slice_to_voxel(vol, axis, slice, u, v);
			if (set_voxel(vol, p.x, p.y, p.z, pixels[v * dims.width + u])) {
				written++;
			}
		}
	}

	return written;
}

/**
 * Keep a slice index inside the volume when the axis changes under it - the axes have different
 * counts (24 slices from the top, 16 from the front), so the old index can be past the end.
 *
 * @param {object} vol
 * @param {string} axis
 * @param {number} slice
 * @returns {number}
 */
/**
 * A new volume, mirrored along one model axis.
 *
 * THIS IS A REFLECTION, ON PURPOSE. The model's chirality flips - which is sometimes exactly the
 * ask (a design facing the wrong way), and is also the one-step repair for a .vox exported by
 * v0.1.24-0.1.31, which wrote mirror images. Flipping twice is the identity, which is also the
 * undo story: this runs outside the layer undo system, like rotation, and reverses itself.
 *
 * @param {object} vol
 * @param {string} axis 'x' | 'y' | 'z' - the MODEL axis to reverse
 * @returns {object|null} a new volume, or null for an axis that is not one
 */
function flip_volume(vol, axis) {
	if (axis !== 'x' && axis !== 'y' && axis !== 'z') {
		return null;
	}

	var out = create_volume(vol.w, vol.d, vol.h);

	for (var y = 0; y < vol.h; y++) {
		for (var z = 0; z < vol.d; z++) {
			for (var x = 0; x < vol.w; x++) {
				var sx = axis === 'x' ? (vol.w - 1) - x : x;
				var sy = axis === 'y' ? (vol.h - 1) - y : y;
				var sz = axis === 'z' ? (vol.d - 1) - z : z;

				out.data[(y * vol.d + z) * vol.w + x] =
					vol.data[(sy * vol.d + sz) * vol.w + sx];
			}
		}
	}

	return out;
}

/**
 * Which model axis "flip horizontal" or "flip vertical" means, for the face being edited.
 *
 * The words describe the CANVAS, so the answer depends on the view: horizontal is whatever axis
 * runs along the canvas u, vertical along v. This is slice_to_voxel's mapping, read backwards -
 * and the u/v mapping is what makes it right, not intuition. Intuition about these axes is what
 * shipped a mirrored exporter.
 *
 * @param {string} view_axis the slicing axis - one of AXES
 * @param {string} direction 'horizontal' | 'vertical'
 * @returns {string|null} a model axis, or null for nonsense
 */
function flip_axis_for_view(view_axis, direction) {
	var table = {
		y: {horizontal: 'x', vertical: 'z'},  //Top:   u is x, v is z
		z: {horizontal: 'x', vertical: 'y'},  //Front: u is x, v is height
		x: {horizontal: 'z', vertical: 'y'},  //Side:  u is z, v is height
	};

	return (table[view_axis] && table[view_axis][direction]) || null;
}

function clamp_slice(vol, axis, slice) {
	var count = slice_dimensions(vol, axis).count;
	var n = parseInt(slice, 10);

	if (isNaN(n)) {
		return 0;
	}

	return Math.max(0, Math.min(count - 1, n));
}

/**
 * @param {object} vol
 * @returns {number} how many voxels are not empty
 */
function count_filled(vol) {
	var n = 0;
	for (var i = 0; i < vol.data.length; i++) {
		if (vol.data[i] !== 0) {
			n++;
		}
	}

	return n;
}


/**
 * Pack a volume into something JSON can carry.
 *
 * Base64 of the raw voxels rather than an array of numbers. NOT because it is always smaller - for
 * a mostly empty 16x16x24 an array of zeroes is 12 KB against base64's 33 KB - but because it is
 * CONSTANT. A number array runs from 12 KB empty to 66 KB full, and quicksave has a fixed budget it
 * shares with the image data, so the worst case is the number that matters and base64 halves it.
 *
 * BYTES ARE WRITTEN BIG-ENDIAN BY HAND rather than handing over the Uint32Array's own buffer. That
 * buffer's byte order is the machine's, so a model saved on one and opened on another would come
 * back with every colour channel rotated. Doing it explicitly costs nothing at this size and means
 * the format says what it means.
 *
 * @param {object} vol
 * @returns {object|null} plain JSON-safe object
 */
function serialize_volume(vol) {
	if (vol == null || vol.data == null) {
		return null;
	}

	var bytes = new Uint8Array(vol.data.length * 4);
	for (var i = 0; i < vol.data.length; i++) {
		var value = vol.data[i] >>> 0;
		bytes[i * 4] = (value >>> 24) & 255;
		bytes[i * 4 + 1] = (value >>> 16) & 255;
		bytes[i * 4 + 2] = (value >>> 8) & 255;
		bytes[i * 4 + 3] = value & 255;
	}

	var binary = '';
	//chunked: String.fromCharCode.apply on a 24 KB array blows the argument limit in some browsers
	var CHUNK = 8192;
	for (var o = 0; o < bytes.length; o += CHUNK) {
		binary += String.fromCharCode.apply(null, bytes.subarray(o, o + CHUNK));
	}

	return {w: vol.w, d: vol.d, h: vol.h, encoding: 'base64-be', data: btoa(binary)};
}

/**
 * @param {object} saved from serialize_volume
 * @returns {object|null} a volume, or null when the data is unusable
 */
function deserialize_volume(saved) {
	if (saved == null || typeof saved.data !== 'string') {
		return null;
	}

	var vol = create_volume(saved.w, saved.d, saved.h);

	try {
		var binary = atob(saved.data);
		var expected = vol.data.length * 4;
		if (binary.length !== expected) {
			//dimensions and payload disagree - keep the empty volume rather than a shifted one
			return null;
		}

		for (var i = 0; i < vol.data.length; i++) {
			vol.data[i] = (
				(binary.charCodeAt(i * 4) << 24) |
				(binary.charCodeAt(i * 4 + 1) << 16) |
				(binary.charCodeAt(i * 4 + 2) << 8) |
				binary.charCodeAt(i * 4 + 3)
			) >>> 0;
		}
	}
	catch (e) {
		return null;
	}

	return vol;
}

export {
	serialize_volume,
	deserialize_volume,
	DEFAULT_SIZE,
	MAX_SIZE,
	AXES,
	AXIS_LABELS,
	pack,
	unpack,
	create_volume,
	index_of,
	get_voxel,
	set_voxel,
	slice_dimensions,
	slice_to_voxel,
	read_slice,
	write_slice,
	clamp_slice,
	flip_volume,
	flip_axis_for_view,
	count_filled,
};
