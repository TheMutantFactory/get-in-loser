/**
 * The claim voxel mode rests on: rotating changes which way the volume is CUT, never the volume.
 * These tests are the evidence - read a slice, write it straight back, and nothing moved; and the
 * same voxel is reachable from all three axes.
 */
import {
	DEFAULT_SIZE,
	MAX_SIZE,
	AXES,
	pack,
	unpack,
	create_volume,
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
	serialize_volume,
	deserialize_volume,
} from '../src/js/core/voxel.js';

const RED = pack(255, 0, 0, 255);
const BLUE = pack(0, 0, 255, 255);

/** the size this mode is built around */
const vol16 = () => create_volume(16, 16, 24);

describe('pack / unpack', () => {
	test('round trips a colour', () => {
		expect(unpack(pack(18, 200, 77, 255))).toEqual({r: 18, g: 200, b: 77, a: 255});
	});

	test('a fully transparent voxel is no voxel at all', () => {
		//zero is the empty marker, so nothing transparent may encode to non-zero
		expect(pack(255, 128, 9, 0)).toBe(0);
		expect(pack(0, 0, 0, 0)).toBe(0);
	});

	test('opaque black is not mistaken for empty', () => {
		expect(pack(0, 0, 0, 255)).not.toBe(0);
	});
});

describe('create_volume', () => {
	test('is 16 wide, 16 deep, 24 high by default', () => {
		expect(DEFAULT_SIZE).toEqual({w: 16, d: 16, h: 24});
		const v = create_volume();
		expect([v.w, v.d, v.h]).toEqual([16, 16, 24]);
		expect(v.data.length).toBe(16 * 16 * 24);
	});

	test('starts empty', () => {
		expect(count_filled(vol16())).toBe(0);
	});

	test('refuses nonsense dimensions instead of producing a broken volume', () => {
		const v = create_volume(0, -3, 'x');
		expect([v.w, v.d, v.h]).toEqual([16, 16, 24]);
		expect(create_volume(1e6, 1e6, 1e6).w).toBe(MAX_SIZE);
	});
});

describe('get / set voxel', () => {
	test('stores and reads back', () => {
		const v = vol16();
		set_voxel(v, 3, 7, 11, RED);
		expect(get_voxel(v, 3, 7, 11)).toBe(RED);
	});

	test('every coordinate is distinct - no index collisions', () => {
		const v = create_volume(4, 5, 6);
		let n = 0;
		for (let x = 0; x < 4; x++)
			for (let y = 0; y < 6; y++)
				for (let z = 0; z < 5; z++)
					set_voxel(v, x, y, z, pack(1, 1, 1, ++n));
		//if two coordinates shared an index this would be short
		expect(count_filled(v)).toBe(4 * 5 * 6);
	});

	test('out of bounds writes are refused, not wrapped', () => {
		const v = vol16();
		expect(set_voxel(v, 16, 0, 0, RED)).toBe(false);
		expect(set_voxel(v, 0, 24, 0, RED)).toBe(false);
		expect(set_voxel(v, -1, 0, 0, RED)).toBe(false);
		expect(count_filled(v)).toBe(0);
	});

	test('out of bounds reads are empty, not an error', () => {
		expect(get_voxel(vol16(), 99, 99, 99)).toBe(0);
	});
});

describe('slice_dimensions', () => {
	test('each axis cuts the loaf a different way', () => {
		const v = vol16();
		//looking down at the top: 24 slices of 16x16
		expect(slice_dimensions(v, 'y')).toEqual({width: 16, height: 16, count: 24});
		//looking at the front: 16 slices of 16 wide by 24 high
		expect(slice_dimensions(v, 'z')).toEqual({width: 16, height: 24, count: 16});
		//looking at the side: 16 slices of 16 deep by 24 high
		expect(slice_dimensions(v, 'x')).toEqual({width: 16, height: 24, count: 16});
	});

	test('every voxel is covered exactly once, whichever way it is cut', () => {
		const v = create_volume(4, 5, 6);
		for (const axis of AXES) {
			const d = slice_dimensions(v, axis);
			expect(d.width * d.height * d.count).toBe(4 * 5 * 6);
		}
	});
});

describe('slice_to_voxel', () => {
	test('the top view is not flipped', () => {
		const v = vol16();
		expect(slice_to_voxel(v, 'y', 5, 2, 3)).toEqual({x: 2, y: 5, z: 3});
	});

	test('side-on views flip, because v counts DOWN the image and y counts UP the model', () => {
		const v = vol16();
		//row 0 of the image is the TOP of the model
		expect(slice_to_voxel(v, 'z', 4, 2, 0).y).toBe(23);
		expect(slice_to_voxel(v, 'z', 4, 2, 23).y).toBe(0);
		expect(slice_to_voxel(v, 'x', 4, 2, 0).y).toBe(23);
	});

	test('maps onto distinct voxels within a slice', () => {
		const v = create_volume(4, 5, 6);
		for (const axis of AXES) {
			const d = slice_dimensions(v, axis);
			const seen = new Set();
			for (let u = 0; u < d.width; u++)
				for (let vv = 0; vv < d.height; vv++) {
					const p = slice_to_voxel(v, axis, 1, u, vv);
					seen.add(`${p.x},${p.y},${p.z}`);
				}
			expect(seen.size).toBe(d.width * d.height);
		}
	});
});

describe('read_slice / write_slice', () => {
	test('a slice read then written back changes nothing', () => {
		const v = vol16();
		set_voxel(v, 1, 2, 3, RED);
		set_voxel(v, 15, 23, 15, BLUE);
		const before = Array.from(v.data);

		for (const axis of AXES) {
			const count = slice_dimensions(v, axis).count;
			for (let i = 0; i < count; i++) {
				write_slice(v, axis, i, read_slice(v, axis, i).data);
			}
		}

		expect(Array.from(v.data)).toEqual(before);
	});

	test('the SAME voxel is reachable from all three axes', () => {
		const v = vol16();
		set_voxel(v, 3, 7, 11, RED);

		//top view: slice y=7, pixel (x=3, z=11)
		expect(read_slice(v, 'y', 7).data[11 * 16 + 3]).toBe(RED);
		//front view: slice z=11, pixel (x=3, row = h-1-y = 16)
		expect(read_slice(v, 'z', 11).data[(24 - 1 - 7) * 16 + 3]).toBe(RED);
		//side view: slice x=3, pixel (z=11, row = 16)
		expect(read_slice(v, 'x', 3).data[(24 - 1 - 7) * 16 + 11]).toBe(RED);
	});

	test('painting on one face is visible from the others - the whole point of rotating', () => {
		const v = vol16();
		//paint a pixel while looking at the FRONT
		const front = read_slice(v, 'z', 5);
		front.data[10 * front.width + 2] = BLUE;
		write_slice(v, 'z', 5, front.data);

		//now look from the TOP and it is there
		const y = 24 - 1 - 10;
		expect(read_slice(v, 'y', y).data[5 * 16 + 2]).toBe(BLUE);
		expect(count_filled(v)).toBe(1);
	});

	test('a slice is the right size for its axis', () => {
		const v = vol16();
		expect(read_slice(v, 'y', 0).data.length).toBe(16 * 16);
		expect(read_slice(v, 'z', 0).data.length).toBe(16 * 24);
	});

	test('writing an undersized image is refused rather than half applied', () => {
		const v = vol16();
		set_voxel(v, 0, 0, 0, RED);
		expect(write_slice(v, 'y', 0, new Uint32Array(4))).toBe(0);
		expect(get_voxel(v, 0, 0, 0)).toBe(RED);
	});

	test('writing clears as well as paints', () => {
		const v = vol16();
		set_voxel(v, 1, 1, 1, RED);
		write_slice(v, 'y', 1, new Uint32Array(16 * 16));
		expect(count_filled(v)).toBe(0);
	});
});

describe('clamp_slice', () => {
	test('keeps an index inside the volume when the axis changes under it', () => {
		const v = vol16();
		//slice 20 exists looking down (24 of them) but not from the front (16)
		expect(clamp_slice(v, 'y', 20)).toBe(20);
		expect(clamp_slice(v, 'z', 20)).toBe(15);
	});

	test('handles junk without landing outside', () => {
		const v = vol16();
		expect(clamp_slice(v, 'y', -5)).toBe(0);
		expect(clamp_slice(v, 'y', 'abc')).toBe(0);
		expect(clamp_slice(v, 'y', 999)).toBe(23);
	});
});

describe('serialize_volume / deserialize_volume', () => {
	const filled = () => {
		const v = vol16();
		set_voxel(v, 0, 0, 0, RED);
		set_voxel(v, 15, 23, 15, BLUE);
		set_voxel(v, 7, 12, 3, pack(1, 2, 3, 4));
		return v;
	};

	test('a volume survives the round trip exactly', () => {
		const before = filled();
		const after = deserialize_volume(serialize_volume(before));

		expect([after.w, after.d, after.h]).toEqual([before.w, before.d, before.h]);
		expect(Array.from(after.data)).toEqual(Array.from(before.data));
	});

	test('every channel survives - not just the ones that happen to be 255', () => {
		const v = vol16();
		set_voxel(v, 1, 1, 1, pack(17, 34, 51, 68));
		const back = deserialize_volume(serialize_volume(v));
		expect(unpack(get_voxel(back, 1, 1, 1))).toEqual({r: 17, g: 34, b: 51, a: 68});
	});

	test('the encoding is declared, and byte order is not left to the machine', () => {
		//a buffer handed over raw would come back channel-rotated on a big-endian reader
		expect(serialize_volume(vol16()).encoding).toBe('base64-be');
	});

	test('is JSON safe', () => {
		const saved = serialize_volume(filled());
		const round = JSON.parse(JSON.stringify(saved));
		expect(Array.from(deserialize_volume(round).data)).toEqual(Array.from(filled().data));
	});

	test('the encoded size is CONSTANT, whatever the model contains', () => {
		//this is the reason for base64, and it is not "smaller" - an array of zeroes beats it on an
		//empty volume. Quicksave has a fixed budget, so a predictable ceiling is worth more than a
		//good best case.
		const empty = vol16();
		const full = vol16();
		for (let i = 0; i < full.data.length; i++) {
			full.data[i] = RED;
		}

		expect(serialize_volume(empty).data.length).toBe(serialize_volume(full).data.length);
	});

	test('beats a number array in the case that decides the budget - the full one', () => {
		const full = vol16();
		for (let i = 0; i < full.data.length; i++) {
			full.data[i] = RED;
		}
		const asNumbers = JSON.stringify(Array.from(full.data)).length;

		expect(serialize_volume(full).data.length).toBeLessThan(asNumbers);
	});

	test('refuses a payload that disagrees with its dimensions', () => {
		const saved = serialize_volume(vol16());
		//claim a bigger volume than the bytes describe
		expect(deserialize_volume({...saved, h: 25})).toBe(null);
	});

	test('refuses junk rather than returning a shifted volume', () => {
		expect(deserialize_volume(null)).toBe(null);
		expect(deserialize_volume({})).toBe(null);
		expect(deserialize_volume({w: 16, d: 16, h: 24, data: 'not base64 !!!'})).toBe(null);
		expect(serialize_volume(null)).toBe(null);
	});

	test('an empty volume round trips too', () => {
		expect(count_filled(deserialize_volume(serialize_volume(vol16())))).toBe(0);
	});
});

describe('flip_volume', () => {
	const RED = pack(255, 0, 0, 255);
	const BLUE = pack(0, 0, 255, 255);

	//deliberately non-cube: a flip along the wrong dimension cannot hide on a cube
	const marked = () => {
		const v = create_volume(4, 6, 9);
		set_voxel(v, 0, 0, 0, RED);
		set_voxel(v, 3, 8, 5, BLUE);
		set_voxel(v, 1, 2, 3, pack(7, 7, 7, 255));
		return v;
	};

	test('flipping x sends a voxel across the width and nowhere else', () => {
		const out = flip_volume(marked(), 'x');
		expect(get_voxel(out, 3, 0, 0)).toBe(RED);
		expect(get_voxel(out, 0, 8, 5)).toBe(BLUE);
		expect(get_voxel(out, 2, 2, 3)).toBe(pack(7, 7, 7, 255));
		//and the old positions are empty
		expect(get_voxel(out, 0, 0, 0)).toBe(0);
	});

	test('flipping y reverses height, flipping z reverses depth', () => {
		expect(get_voxel(flip_volume(marked(), 'y'), 0, 8, 0)).toBe(RED);
		expect(get_voxel(flip_volume(marked(), 'z'), 0, 0, 5)).toBe(RED);
	});

	test('a flip is its own undo - twice along any axis is the identity', () => {
		//this involution IS the undo story: flips run outside the layer undo system, like rotation
		const v = marked();
		for (const axis of ['x', 'y', 'z']) {
			const back = flip_volume(flip_volume(v, axis), axis);
			expect(Array.from(back.data)).toEqual(Array.from(v.data));
		}
	});

	test('nothing is created or destroyed, and the source is untouched', () => {
		const v = marked();
		const before = Array.from(v.data);
		const out = flip_volume(v, 'x');

		expect(count_filled(out)).toBe(count_filled(v));
		expect(out).not.toBe(v);
		expect(Array.from(v.data)).toEqual(before);
	});

	test('refuses an axis that is not one', () => {
		expect(flip_volume(marked(), 'w')).toBe(null);
		expect(flip_volume(marked(), null)).toBe(null);
	});
});

describe('flip_axis_for_view', () => {
	test('THE TABLE - horizontal and vertical are canvas words, and the canvas depends on the view', () => {
		//read off slice_to_voxel: Top draws (x, z), Front draws (x, height), Side draws (z, height)
		expect(flip_axis_for_view('y', 'horizontal')).toBe('x');
		expect(flip_axis_for_view('y', 'vertical')).toBe('z');
		expect(flip_axis_for_view('z', 'horizontal')).toBe('x');
		expect(flip_axis_for_view('z', 'vertical')).toBe('y');
		expect(flip_axis_for_view('x', 'horizontal')).toBe('z');
		expect(flip_axis_for_view('x', 'vertical')).toBe('y');
	});

	test('the table and the slice mapping cannot drift apart', () => {
		//the same fact slice_to_voxel states, asserted against it: moving one step along the
		//canvas u must move the flipped-horizontal axis, and v the flipped-vertical one
		const v = create_volume(4, 6, 9);
		for (const axis of AXES) {
			const at = (u, vv) => slice_to_voxel(v, axis, 0, u, vv);
			const h = flip_axis_for_view(axis, 'horizontal');
			const vert = flip_axis_for_view(axis, 'vertical');
			expect(at(1, 0)[h]).not.toBe(at(0, 0)[h]);
			expect(at(0, 1)[vert]).not.toBe(at(0, 0)[vert]);
		}
	});

	test('nonsense in, null out', () => {
		expect(flip_axis_for_view('q', 'horizontal')).toBe(null);
		expect(flip_axis_for_view('y', 'diagonal')).toBe(null);
	});
});
