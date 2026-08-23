/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * MagicaVoxel .vox, read and write. Pure - see tests/voxel-vox.test.js.
 *
 * WHY THIS FORMAT. It is what everything else reads: Godot, Unity, Blender and three.js all have
 * importers, and it is palette-indexed, which is the same shape as working from a palette here.
 * The PNG slice strip is inspectable but nothing else understands it as a model.
 *
 * THE TWO THINGS THAT GO WRONG, both handled below and both tested:
 *
 *   Z-UP. MagicaVoxel's z is height; ours is y. A file written without the swap imports lying on
 *   its side, which looks like a modelling mistake rather than a format one.
 *
 *   1-BASED INDICES INTO A 0-BASED TABLE. A voxel's colour index i refers to RGBA entry i-1. Off
 *   by one here shifts every colour in the model by one palette slot - subtle enough to ship.
 *
 * Layout, all little-endian:
 *   'VOX ' int32 version
 *   MAIN chunk, whose children are SIZE, XYZI and RGBA
 *   chunk = 4 byte id, int32 content bytes, int32 children bytes, content, children
 */

/** The version every reader in the wild expects. */
const VOX_VERSION = 150;

/** Indices run 1..255; 0 means empty, so 255 colours is the ceiling. */
const MAX_COLORS = 255;

/** .vox addresses each axis with a single byte. */
const MAX_DIMENSION = 256;

/**
 * Distinct colours used by a volume, and a lookup from packed colour to palette index.
 *
 * Past 255 colours the extras are folded onto the nearest already in the palette rather than the
 * export failing. Losing an exact shade beats losing the model, and a palette-driven picture will
 * never get here anyway.
 *
 * @param {object} vol
 * @param {function} unpack
 * @returns {object} keys: colors (array of {r,g,b,a}), index (Map packed -> 1..255), folded (int)
 */
function build_palette(vol, unpack) {
	var index = new Map();
	var colors = [];
	var folded = 0;

	for (var i = 0; i < vol.data.length; i++) {
		var value = vol.data[i];
		if (value === 0 || index.has(value)) {
			continue;
		}

		if (colors.length < MAX_COLORS) {
			colors.push(unpack(value));
			index.set(value, colors.length);
		}
		else {
			index.set(value, nearest_index(unpack(value), colors));
			folded++;
		}
	}

	return {colors: colors, index: index, folded: folded};
}

/**
 * @param {object} colour keys r,g,b,a
 * @param {array} colors
 * @returns {number} 1-based index of the closest entry
 */
function nearest_index(colour, colors) {
	var best = 1;
	var best_distance = Infinity;

	for (var i = 0; i < colors.length; i++) {
		var dr = colour.r - colors[i].r;
		var dg = colour.g - colors[i].g;
		var db = colour.b - colors[i].b;
		//weights approximate how the eye judges "close", same as the palette matcher
		var distance = 2 * dr * dr + 4 * dg * dg + 3 * db * db;

		if (distance < best_distance) {
			best_distance = distance;
			best = i + 1;
		}
	}

	return best;
}

/**
 * @param {DataView} view
 * @param {number} offset
 * @param {string} id four characters
 */
function write_id(bytes, offset, id) {
	for (var i = 0; i < 4; i++) {
		bytes[offset + i] = id.charCodeAt(i);
	}
}

/**
 * Encode a volume as a .vox file.
 *
 * @param {object} vol
 * @param {function} unpack from core/voxel.js
 * @returns {object} keys: bytes (Uint8Array), voxels (int), colors (int), folded (int)
 */
function encode_vox(vol, unpack) {
	var palette = build_palette(vol, unpack);

	//collect the filled voxels, converting to MagicaVoxel's Z-up frame as we go
	var voxels = [];
	for (var y = 0; y < vol.h; y++) {
		for (var z = 0; z < vol.d; z++) {
			for (var x = 0; x < vol.w; x++) {
				var value = vol.data[(y * vol.d + z) * vol.w + x];
				if (value === 0) {
					continue;
				}
				//ours (x, y=up, z=depth) -> theirs (x, y=depth, z=up)
				voxels.push([x, z, y, palette.index.get(value)]);
			}
		}
	}

	var size_content = 12;
	var xyzi_content = 4 + voxels.length * 4;
	var rgba_content = 256 * 4;
	var main_children = (12 + size_content) + (12 + xyzi_content) + (12 + rgba_content);
	var total = 8 + (12 + main_children);

	var bytes = new Uint8Array(total);
	var view = new DataView(bytes.buffer);
	var o = 0;

	write_id(bytes, o, 'VOX ');
	o += 4;
	view.setInt32(o, VOX_VERSION, true);
	o += 4;

	//MAIN carries no content of its own, only children
	write_id(bytes, o, 'MAIN');
	o += 4;
	view.setInt32(o, 0, true);
	o += 4;
	view.setInt32(o, main_children, true);
	o += 4;

	write_id(bytes, o, 'SIZE');
	o += 4;
	view.setInt32(o, size_content, true);
	o += 4;
	view.setInt32(o, 0, true);
	o += 4;
	//SIZE is in their frame too: x, depth, height
	view.setInt32(o, vol.w, true);
	o += 4;
	view.setInt32(o, vol.d, true);
	o += 4;
	view.setInt32(o, vol.h, true);
	o += 4;

	write_id(bytes, o, 'XYZI');
	o += 4;
	view.setInt32(o, xyzi_content, true);
	o += 4;
	view.setInt32(o, 0, true);
	o += 4;
	view.setInt32(o, voxels.length, true);
	o += 4;
	for (var v = 0; v < voxels.length; v++) {
		bytes[o++] = voxels[v][0];
		bytes[o++] = voxels[v][1];
		bytes[o++] = voxels[v][2];
		bytes[o++] = voxels[v][3];
	}

	write_id(bytes, o, 'RGBA');
	o += 4;
	view.setInt32(o, rgba_content, true);
	o += 4;
	view.setInt32(o, 0, true);
	o += 4;
	for (var c = 0; c < 256; c++) {
		//INDEX i REFERS TO ENTRY i-1, so the palette starts at slot 0 and the last slot is unused
		var colour = palette.colors[c];
		bytes[o++] = colour ? colour.r : 0;
		bytes[o++] = colour ? colour.g : 0;
		bytes[o++] = colour ? colour.b : 0;
		bytes[o++] = colour ? colour.a : 0;
	}

	return {bytes: bytes, voxels: voxels.length, colors: palette.colors.length, folded: palette.folded};
}

/**
 * Walk the chunks of a .vox file.
 *
 * @param {Uint8Array} bytes
 * @returns {object|null} keys: size {x,y,z}, voxels [[x,y,z,i]], rgba [[r,g,b,a]]
 */
function read_chunks(bytes) {
	if (bytes.length < 8) {
		return null;
	}

	var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	var magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
	if (magic !== 'VOX ') {
		return null;
	}

	var found = {size: null, voxels: [], rgba: null};
	var o = 8;

	//flat walk. Only MAIN has children, and its children are what we want, so descending into it
	//is the same as carrying straight on
	while (o + 12 <= bytes.length) {
		var id = String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
		var content = view.getInt32(o + 4, true);
		o += 12;

		if (content < 0 || o + content > bytes.length) {
			//truncated or lying about its length
			return null;
		}

		if (id === 'SIZE' && content >= 12) {
			found.size = {
				x: view.getInt32(o, true),
				y: view.getInt32(o + 4, true),
				z: view.getInt32(o + 8, true),
			};
		}
		else if (id === 'XYZI' && content >= 4) {
			var n = view.getInt32(o, true);
			var max = Math.min(n, Math.floor((content - 4) / 4));
			for (var i = 0; i < max; i++) {
				var p = o + 4 + i * 4;
				found.voxels.push([bytes[p], bytes[p + 1], bytes[p + 2], bytes[p + 3]]);
			}
		}
		else if (id === 'RGBA' && content >= 256 * 4) {
			found.rgba = [];
			for (var c = 0; c < 256; c++) {
				found.rgba.push([bytes[o + c * 4], bytes[o + c * 4 + 1], bytes[o + c * 4 + 2], bytes[o + c * 4 + 3]]);
			}
		}

		//MAIN's content is empty and its children follow inline, so this walks them next
		o += content;
	}

	return found.size == null ? null : found;
}

/**
 * Decode a .vox file into a volume.
 *
 * @param {Uint8Array} bytes
 * @param {function} create_volume from core/voxel.js
 * @param {function} pack from core/voxel.js
 * @returns {object|null} keys: volume, voxels, skipped
 */
function decode_vox(bytes, create_volume, pack) {
	var parsed = read_chunks(bytes);
	if (parsed == null) {
		return null;
	}

	//back out of their frame: theirs (x, y=depth, z=up) -> ours (x, y=up, z=depth)
	var w = parsed.size.x;
	var d = parsed.size.y;
	var h = parsed.size.z;

	if (!(w > 0) || !(d > 0) || !(h > 0) || w > MAX_DIMENSION || d > MAX_DIMENSION || h > MAX_DIMENSION) {
		return null;
	}

	var volume = create_volume(w, d, h);
	var written = 0;
	var skipped = 0;

	for (var i = 0; i < parsed.voxels.length; i++) {
		var v = parsed.voxels[i];
		var x = v[0];
		var z = v[1];
		var y = v[2];

		if (x >= w || y >= h || z >= d) {
			//a voxel outside the declared size; drop it rather than wrapping it somewhere wrong
			skipped++;
			continue;
		}

		var entry = parsed.rgba ? parsed.rgba[v[3] - 1] : null;
		var colour = entry
			? pack(entry[0], entry[1], entry[2], entry[3] === 0 ? 255 : entry[3])
			: pack(200, 200, 200, 255);

		volume.data[(y * d + z) * w + x] = colour;
		written++;
	}

	return {volume: volume, voxels: written, skipped: skipped};
}

export {VOX_VERSION, MAX_COLORS, MAX_DIMENSION, build_palette, encode_vox, read_chunks, decode_vox};
