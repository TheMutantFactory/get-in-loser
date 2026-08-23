/**
 * A file format is a promise to a program you will never meet. These tests hold the two halves of
 * that promise: the bytes are laid out the way MagicaVoxel says, and a model that goes out comes
 * back the same shape and the same way up.
 */
import {
	VOX_VERSION,
	MAX_COLORS,
	build_palette,
	encode_vox,
	read_chunks,
	decode_vox,
} from '../src/js/core/voxel-vox.js';
import {create_volume, set_voxel, get_voxel, pack, unpack, count_filled} from '../src/js/core/voxel.js';

const RED = pack(255, 0, 0, 255);
const BLUE = pack(0, 0, 255, 255);
const encode = (v) => encode_vox(v, unpack);
const decode = (bytes) => decode_vox(bytes, create_volume, pack);
const id_at = (bytes, o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
const int_at = (bytes, o) => new DataView(bytes.buffer).getInt32(o, true);

const model = () => {
	const v = create_volume(16, 16, 24);
	set_voxel(v, 0, 0, 0, RED);
	set_voxel(v, 15, 23, 15, BLUE);
	set_voxel(v, 4, 20, 2, RED);
	return v;
};

describe('file structure', () => {
	test('starts with the magic and the version readers expect', () => {
		const {bytes} = encode(model());
		expect(id_at(bytes, 0)).toBe('VOX ');
		expect(int_at(bytes, 4)).toBe(VOX_VERSION);
		expect(VOX_VERSION).toBe(150);
	});

	test('MAIN declares its children and holds no content itself', () => {
		const {bytes} = encode(model());
		expect(id_at(bytes, 8)).toBe('MAIN');
		expect(int_at(bytes, 12)).toBe(0);
		//children size must account for the whole rest of the file
		expect(int_at(bytes, 16)).toBe(bytes.length - 20);
	});

	test('carries SIZE, XYZI and RGBA', () => {
		const parsed = read_chunks(encode(model()).bytes);
		expect(parsed.size).toBeTruthy();
		expect(parsed.voxels.length).toBe(3);
		expect(parsed.rgba.length).toBe(256);
	});

	test('every chunk length adds up - no slack, no overrun', () => {
		const {bytes} = encode(model());
		let o = 8;
		while (o + 12 <= bytes.length) {
			const content = int_at(bytes, o + 4);
			const children = int_at(bytes, o + 8);
			expect(content).toBeGreaterThanOrEqual(0);
			expect(o + 12 + content).toBeLessThanOrEqual(bytes.length);
			o += 12 + content + (id_at(bytes, o) === 'MAIN' ? 0 : children);
		}
		expect(o).toBe(bytes.length);
	});
});

describe('Z-up conversion', () => {
	test('SIZE is written in THEIR frame - width, depth, height', () => {
		//a deliberately non-cube volume: a wrong swap is invisible on a cube
		const {bytes} = encode(create_volume(4, 6, 9));
		const parsed = read_chunks(bytes);
		expect(parsed.size).toEqual({x: 4, y: 6, z: 9});
	});

	test('a voxel high up in our model is high up in THEIR z, not their y', () => {
		const v = create_volume(4, 6, 9);
		//near the top of our model
		set_voxel(v, 1, 8, 2, RED);
		const parsed = read_chunks(encode(v).bytes);
		const [x, y, z] = parsed.voxels[0];

		expect(x).toBe(1);
		expect(y).toBe(2);  //our depth
		expect(z).toBe(8);  //our height
	});

	test('a model comes back the same way up', () => {
		const v = create_volume(4, 6, 9);
		set_voxel(v, 0, 8, 0, RED);   //top
		set_voxel(v, 3, 0, 5, BLUE);  //bottom, far corner

		const back = decode(encode(v).bytes).volume;

		expect([back.w, back.d, back.h]).toEqual([4, 6, 9]);
		expect(get_voxel(back, 0, 8, 0)).toBe(RED);
		expect(get_voxel(back, 3, 0, 5)).toBe(BLUE);
	});
});

describe('palette', () => {
	test('indices are 1-based, because entry i-1 is the colour', () => {
		const v = create_volume(4, 4, 4);
		set_voxel(v, 0, 0, 0, RED);
		const parsed = read_chunks(encode(v).bytes);

		expect(parsed.voxels[0][3]).toBe(1);
		//...and that colour sits in slot 0
		expect(parsed.rgba[0]).toEqual([255, 0, 0, 255]);
	});

	test('colours survive the round trip exactly', () => {
		const v = create_volume(4, 4, 4);
		const odd = pack(17, 200, 61, 255);
		set_voxel(v, 1, 1, 1, odd);

		expect(unpack(get_voxel(decode(encode(v).bytes).volume, 1, 1, 1)))
			.toEqual({r: 17, g: 200, b: 61, a: 255});
	});

	test('one palette entry per distinct colour, not per voxel', () => {
		const v = create_volume(8, 8, 8);
		for (let i = 0; i < 8; i++) set_voxel(v, i, i, i, RED);

		expect(encode(v).colors).toBe(1);
	});

	test('folds past 255 colours onto the nearest rather than failing', () => {
		const v = create_volume(16, 16, 24);
		let n = 0;
		//300 distinct colours - more than an index can address
		for (let i = 0; i < 300; i++) {
			set_voxel(v, i % 16, Math.floor(i / 16), 0, pack(i % 256, (i * 7) % 256, (i * 13) % 256, 255));
			n++;
		}
		const out = encode(v);

		expect(out.colors).toBeLessThanOrEqual(MAX_COLORS);
		expect(out.folded).toBeGreaterThan(0);
		//nothing is dropped - every voxel still gets an index
		expect(out.voxels).toBe(n);
		for (const [, , , index] of read_chunks(out.bytes).voxels) {
			expect(index).toBeGreaterThanOrEqual(1);
			expect(index).toBeLessThanOrEqual(MAX_COLORS);
		}
	});
});

describe('round trip', () => {
	test('an empty model is a valid file with no voxels', () => {
		const out = encode(create_volume(16, 16, 24));
		expect(out.voxels).toBe(0);
		expect(count_filled(decode(out.bytes).volume)).toBe(0);
	});

	test('a full model keeps every voxel', () => {
		const v = create_volume(6, 6, 6);
		for (let i = 0; i < v.data.length; i++) v.data[i] = RED;

		const back = decode(encode(v).bytes);
		expect(back.voxels).toBe(6 * 6 * 6);
		expect(count_filled(back.volume)).toBe(6 * 6 * 6);
	});

	test('the whole volume survives byte for byte', () => {
		const v = model();
		const back = decode(encode(v).bytes).volume;
		expect(Array.from(back.data)).toEqual(Array.from(v.data));
	});
});

describe('reading files we did not write', () => {
	test('refuses something that is not a vox file', () => {
		expect(decode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBe(null);
		expect(decode(new Uint8Array(0))).toBe(null);
		expect(read_chunks(new Uint8Array([0x50, 0x4e, 0x47, 0x20, 0, 0, 0, 0]))).toBe(null);
	});

	test('refuses a chunk that lies about its length', () => {
		const {bytes} = encode(model());
		//SIZE claims to be enormous
        new DataView(bytes.buffer).setInt32(24, 999999, true);
		expect(read_chunks(bytes)).toBe(null);
	});

	test('drops voxels outside the declared size instead of wrapping them', () => {
		const v = create_volume(4, 4, 4);
		set_voxel(v, 1, 1, 1, RED);
		const {bytes} = encode(v);
		//move the voxel outside the volume
		const parsed = read_chunks(bytes);
		const at = bytes.indexOf(parsed.voxels[0][0]);
		const xyzi = bytes.length - 256 * 4 - 12 - 4;
		bytes[xyzi] = 200;

		const back = decode(bytes);
		expect(back.skipped + back.voxels).toBe(1);
	});

	test('survives a file with no palette by giving voxels a visible colour', () => {
		const v = create_volume(4, 4, 4);
		set_voxel(v, 0, 0, 0, RED);
		const {bytes} = encode(v);
		//blank the RGBA id so the chunk is ignored
		bytes[bytes.length - 256 * 4 - 12] = 0x58;

		const back = decode(bytes);
		expect(back.voxels).toBe(1);
		expect(unpack(get_voxel(back.volume, 0, 0, 0)).a).toBe(255);
	});
});
