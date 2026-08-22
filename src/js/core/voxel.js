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
 * AXES. x is width (left to right), y is HEIGHT (bottom to top), z is depth (front to back).
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

export {
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
	count_filled,
};
