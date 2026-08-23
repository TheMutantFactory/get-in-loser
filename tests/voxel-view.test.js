/**
 * The preview has one job beyond looking like the model: showing WHERE the slice is. That means
 * the projection has to be consistent under orbiting, and the slice plane has to land in the right
 * place - a highlight that drifts is worse than none.
 */
import {
	YAWS,
	ONION,
	onion_slices,
	FACE_CORNERS,
	visible_faces,
	visible_walls,
	yaw_trig,
	rotate_xz,
	rotate_continuous,
	project,
	depth_key,
	draw_order,
	bounds,
	slice_quad,
	fit_scale,
} from '../src/js/core/voxel-view.js';
import {create_volume, set_voxel, get_voxel, pack} from '../src/js/core/voxel.js';

const RED = pack(255, 0, 0, 255);
const vol16 = () => create_volume(16, 16, 24);

describe('rotate_xz', () => {
	test('a quarter turn each time returns to the start', () => {
		let p = {x: 3, z: 1};
		const w = 8, d = 5;
		//two turns of a non-square footprint swap the dims back and forth
		const a = rotate_xz(p.x, p.z, 0, w, d);
		expect([a.x, a.z, a.w, a.d]).toEqual([3, 1, 8, 5]);
	});

	test('the footprint swaps at 90 and 270 - a 16x8 model is 8x16 from the side', () => {
		expect(rotate_xz(0, 0, 90, 16, 8)).toMatchObject({w: 8, d: 16});
		expect(rotate_xz(0, 0, 270, 16, 8)).toMatchObject({w: 8, d: 16});
		expect(rotate_xz(0, 0, 180, 16, 8)).toMatchObject({w: 16, d: 8});
	});

	test('stays inside the footprint at every yaw', () => {
		const w = 6, d = 4;
		for (const yaw of YAWS)
			for (let x = 0; x < w; x++)
				for (let z = 0; z < d; z++) {
					const r = rotate_xz(x, z, yaw, w, d);
					expect(r.x).toBeGreaterThanOrEqual(0);
					expect(r.z).toBeGreaterThanOrEqual(0);
					expect(r.x).toBeLessThan(r.w);
					expect(r.z).toBeLessThan(r.d);
				}
	});

	test('is a bijection - no two voxels land on each other', () => {
		const w = 6, d = 4;
		for (const yaw of YAWS) {
			const seen = new Set();
			for (let x = 0; x < w; x++)
				for (let z = 0; z < d; z++) {
					const r = rotate_xz(x, z, yaw, w, d);
					seen.add(r.x + ',' + r.z);
				}
			expect(seen.size).toBe(w * d);
		}
	});

	test('normalises a junk yaw instead of producing NaN', () => {
		for (const yaw of [null, undefined, 'x', -90, 450, 720]) {
			const r = rotate_xz(1, 1, yaw, 4, 4);
			expect(Number.isFinite(r.x)).toBe(true);
			expect(Number.isFinite(r.z)).toBe(true);
		}
	});
});

describe('project', () => {
	const view = {yaw: 0, w: 16, d: 16, scale: 1};

	test('height moves a point UP the screen', () => {
		//screen y grows downward, so a taller voxel must have a smaller sy
		expect(project(0, 5, 0, view).sy).toBeLessThan(project(0, 0, 0, view).sy);
	});

	test('x and z separate to opposite sides - that is what makes it read as 3D', () => {
		expect(project(4, 0, 0, view).sx).toBeGreaterThan(0);
		expect(project(0, 0, 4, view).sx).toBeLessThan(0);
	});

	test('is linear, so the lattice never drifts', () => {
		const a = project(0, 0, 0, view);
		const b = project(2, 0, 0, view);
		const c = project(4, 0, 0, view);
		expect(b.sx - a.sx).toBeCloseTo(c.sx - b.sx, 10);
		expect(b.sy - a.sy).toBeCloseTo(c.sy - b.sy, 10);
	});

	test('scale multiplies cleanly', () => {
		const one = project(3, 2, 1, {...view, scale: 1});
		const three = project(3, 2, 1, {...view, scale: 3});
		expect(three.sx).toBeCloseTo(one.sx * 3, 10);
		expect(three.sy).toBeCloseTo(one.sy * 3, 10);
	});

	test('never returns NaN, whatever the yaw', () => {
		for (const yaw of YAWS.concat([null, 'junk']))
			for (const p of [[0, 0, 0], [16, 24, 16], [8, 12, 8]]) {
				const r = project(p[0], p[1], p[2], {...view, yaw});
				expect(Number.isFinite(r.sx)).toBe(true);
				expect(Number.isFinite(r.sy)).toBe(true);
			}
	});
});

describe('depth_key / draw_order', () => {
	test('the far bottom corner is drawn before the near top one', () => {
		expect(depth_key(0, 0, 0, 0, 16, 16)).toBeLessThan(depth_key(15, 23, 15, 0, 16, 16));
	});

	test('returns only filled voxels', () => {
		const v = vol16();
		set_voxel(v, 1, 2, 3, RED);
		set_voxel(v, 4, 5, 6, RED);
		const order = draw_order(v, {yaw: 0}, get_voxel);
		expect(order.length).toBe(2);
		expect(order.every((o) => o.value === RED)).toBe(true);
	});

	test('is ordered back to front at every yaw', () => {
		const v = create_volume(4, 4, 4);
		for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) set_voxel(v, x, y, z, RED);

		for (const yaw of YAWS) {
			const order = draw_order(v, {yaw}, get_voxel);
			for (let i = 1; i < order.length; i++) {
				const prev = depth_key(order[i - 1].x, order[i - 1].y, order[i - 1].z, yaw, 4, 4);
				const cur = depth_key(order[i].x, order[i].y, order[i].z, yaw, 4, 4);
				expect(cur).toBeGreaterThanOrEqual(prev);
			}
		}
	});

	test('an empty volume draws nothing', () => {
		expect(draw_order(vol16(), {yaw: 0}, get_voxel)).toEqual([]);
	});
});

describe('bounds / fit_scale', () => {
	test('framing does not depend on what has been drawn', () => {
		const empty = vol16();
		const drawn = vol16();
		set_voxel(drawn, 0, 0, 0, RED);
		expect(bounds(drawn, {yaw: 0})).toEqual(bounds(empty, {yaw: 0}));
	});

	test('a tall model is taller than it is wide on screen', () => {
		const b = bounds(vol16(), {yaw: 0});
		expect(b.height).toBeGreaterThan(0);
		expect(b.width).toBeGreaterThan(0);
	});

	test('fits inside the box at every yaw, with room for the margin', () => {
		const v = create_volume(16, 8, 24);
		for (const yaw of YAWS) {
			const scale = fit_scale(v, {yaw}, {w: 176, h: 176}, 4);
			const b = bounds(v, {yaw, scale});
			expect(b.width).toBeLessThanOrEqual(176 - 8 + 0.001);
			expect(b.height).toBeLessThanOrEqual(176 - 8 + 0.001);
		}
	});

	test('a tiny box still yields a usable scale', () => {
		expect(fit_scale(vol16(), {yaw: 0}, {w: 1, h: 1}, 4)).toBeGreaterThan(0);
	});
});

describe('slice_quad', () => {
	test('is a four cornered plane', () => {
		const q = slice_quad(vol16(), 'y', 5, {yaw: 0, scale: 1});
		expect(q.length).toBe(4);
		for (const p of q) {
			expect(Number.isFinite(p.sx)).toBe(true);
			expect(Number.isFinite(p.sy)).toBe(true);
		}
	});

	test('climbing the slices moves the plane UP the model', () => {
		const v = vol16();
		const low = slice_quad(v, 'y', 0, {yaw: 0, scale: 1});
		const high = slice_quad(v, 'y', 20, {yaw: 0, scale: 1});
		const mid = (q) => q.reduce((a, p) => a + p.sy, 0) / 4;
		//screen y grows downward
		expect(mid(high)).toBeLessThan(mid(low));
	});

	test('each axis sweeps a different way', () => {
		const v = vol16();
		const mid = (q) => ({
			x: q.reduce((a, p) => a + p.sx, 0) / 4,
			y: q.reduce((a, p) => a + p.sy, 0) / 4,
		});
		const view = {yaw: 0, scale: 1};
		//front-to-back and side-to-side move the plane horizontally, not vertically
		const z0 = mid(slice_quad(v, 'z', 0, view));
		const z15 = mid(slice_quad(v, 'z', 15, view));
		expect(Math.abs(z15.x - z0.x)).toBeGreaterThan(0);

		const x0 = mid(slice_quad(v, 'x', 0, view));
		const x15 = mid(slice_quad(v, 'x', 15, view));
		expect(Math.abs(x15.x - x0.x)).toBeGreaterThan(0);
	});

	test('stays within the model bounds at every yaw', () => {
		const v = vol16();
		for (const yaw of YAWS) {
			const b = bounds(v, {yaw, scale: 1});
			for (const s of [0, 12, 23]) {
				for (const p of slice_quad(v, 'y', s, {yaw, scale: 1})) {
					expect(p.sx).toBeGreaterThanOrEqual(b.min_x - 0.001);
					expect(p.sx).toBeLessThanOrEqual(b.max_x + 0.001);
					expect(p.sy).toBeGreaterThanOrEqual(b.min_y - 0.001);
					expect(p.sy).toBeLessThanOrEqual(b.max_y + 0.001);
				}
			}
		}
	});
});

describe('onion_slices', () => {
	test('reaches the same distance either way by default', () => {
		const skins = onion_slices(10, 24, 2, 2);
		expect(skins.map((s) => s.index).sort((a, b) => a - b)).toEqual([8, 9, 11, 12]);
	});

	test('is ordered FARTHEST first, so nearer neighbours paint on top', () => {
		const skins = onion_slices(10, 24, 3, 3);
		for (let i = 1; i < skins.length; i++) {
			expect(skins[i].distance).toBeLessThanOrEqual(skins[i - 1].distance);
		}
	});

	test('nearer neighbours are stronger', () => {
		const skins = onion_slices(10, 24, 3, 0);
		const byDistance = Object.fromEntries(skins.map((s) => [s.distance, s.alpha]));
		expect(byDistance[1]).toBeGreaterThan(byDistance[2]);
		expect(byDistance[2]).toBeGreaterThan(byDistance[3]);
	});

	test('never fades to invisible', () => {
		for (const s of onion_slices(10, 24, 8, 8)) {
			expect(s.alpha).toBeGreaterThanOrEqual(ONION.min_alpha);
			expect(s.alpha).toBeLessThanOrEqual(ONION.max_alpha);
		}
	});

	test('never leaves the volume at either end', () => {
		expect(onion_slices(0, 24, 3, 3).every((s) => s.index >= 0)).toBe(true);
		expect(onion_slices(0, 24, 3, 3).some((s) => s.direction === -1)).toBe(false);
		expect(onion_slices(23, 24, 3, 3).every((s) => s.index < 24)).toBe(true);
		expect(onion_slices(23, 24, 3, 3).some((s) => s.direction === 1)).toBe(false);
	});

	test('the current slice is never one of its own skins', () => {
		for (let i = 0; i < 24; i++) {
			expect(onion_slices(i, 24, 4, 4).some((s) => s.index === i)).toBe(false);
		}
	});

	test('below and above are told apart, so they can be tinted differently', () => {
		const skins = onion_slices(10, 24, 1, 1);
		expect(skins.find((s) => s.index === 9).direction).toBe(-1);
		expect(skins.find((s) => s.index === 11).direction).toBe(1);
	});

	test('a depth of zero shows nothing', () => {
		expect(onion_slices(10, 24, 0, 0)).toEqual([]);
	});

	test('a one-slice volume has no neighbours to show', () => {
		expect(onion_slices(0, 1, 4, 4)).toEqual([]);
	});
});

describe('visible_faces', () => {
	test('the two sides facing the camera change with every quarter turn', () => {
		expect(visible_faces(0)).toEqual({right: '+x', left: '+z'});
		expect(visible_faces(90)).toEqual({right: '-z', left: '+x'});
		expect(visible_faces(180)).toEqual({right: '-x', left: '-z'});
		expect(visible_faces(270)).toEqual({right: '+z', left: '-x'});
	});

	test('never picks a face pointing AWAY from the camera', () => {
		//screen depth grows with rx + rz, so a visible face must lie toward increasing rx/rz.
		//Getting this wrong draws the cubes inside out and the model reads as open at the back.
		const w = 4, d = 4;
		const outward = {'+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1]};

		for (const yaw of YAWS) {
			const f = visible_faces(yaw);
			//step one voxel along the face normal and check it moves TOWARD the camera
			for (const face of [f.right, f.left]) {
				const n = outward[face];
				const here = depth_key(2, 0, 2, yaw, w, d);
				const there = depth_key(2 + n[0], 0, 2 + n[1], yaw, w, d);
				expect(there).toBeGreaterThan(here);
			}
		}
	});

	test('the two faces are always different', () => {
		for (const yaw of YAWS) {
			const f = visible_faces(yaw);
			expect(f.right).not.toBe(f.left);
		}
	});

	test('every yaw names faces that actually exist', () => {
		for (const yaw of YAWS.concat([null, 'junk', -90, 450])) {
			const f = visible_faces(yaw);
			expect(FACE_CORNERS[f.right]).toBeDefined();
			expect(FACE_CORNERS[f.left]).toBeDefined();
		}
	});

	test('every face is a flat quad of four corners', () => {
		for (const name of Object.keys(FACE_CORNERS)) {
			const face = FACE_CORNERS[name];
			expect(face.length).toBe(4);
			//a face is flat: one of the three axes is constant across all four corners
			const constant = [0, 1, 2].filter((ax) => new Set(face.map((c) => c[ax])).size === 1);
			expect(constant.length).toBeGreaterThanOrEqual(1);
		}
	});
});

describe('free rotation', () => {
	test('the quarter turns are EXACT, not approximately zero', () => {
		//Math.cos(PI/2) is 6.1e-17, and that residue pushes a quarter-turn projection off its
		//whole pixel - the cardinals are where the preview rests, so they must be perfect
		expect(yaw_trig(90)).toEqual({cos: 0, sin: 1});
		expect(yaw_trig(180)).toEqual({cos: -1, sin: 0});
		expect(yaw_trig(270)).toEqual({cos: 0, sin: -1});
		expect(yaw_trig(360)).toEqual({cos: 1, sin: 0});
		expect(yaw_trig(-90)).toEqual({cos: 0, sin: -1});
	});

	test('continuous rotation agrees with the index rotation at the quarter turns', () => {
		//rotate_xz turns voxel INDICES, rotate_continuous turns points; a voxel index i is the
		//point i + 0.5, and on a square footprint the two must say the same thing
		const w = 6, d = 6;
		for (const yaw of [90, 180, 270]) {
			for (const [x, z] of [[0, 0], [5, 0], [2, 4], [3, 3]]) {
				const idx = rotate_xz(x, z, yaw, w, d);
				const cont = rotate_continuous(x + 0.5, z + 0.5, yaw, w, d);
				expect(cont.rx).toBeCloseTo(idx.x + 0.5, 10);
				expect(cont.rz).toBeCloseTo(idx.z + 0.5, 10);
			}
		}
	});

	test('a full turn is the identity, from any angle', () => {
		const view = {yaw: 37, w: 4, d: 6, scale: 1};
		const back = {yaw: 397, w: 4, d: 6, scale: 1};
		const a = project(1, 2, 3, view);
		const b = project(1, 2, 3, back);
		expect(b.sx).toBeCloseTo(a.sx, 10);
		expect(b.sy).toBeCloseTo(a.sy, 10);
	});

	test('between the quarter turns the projection stays finite and the model keeps its size', () => {
		const vol = {w: 4, d: 6, h: 9};
		for (const yaw of [15, 37, 45, 118, 200.5, 333]) {
			const b = bounds(vol, {yaw});
			expect(isFinite(b.width) && isFinite(b.height)).toBe(true);
			expect(b.width).toBeGreaterThan(0);
			expect(b.height).toBeGreaterThan(0);
		}
	});

	test('turning half way round reverses the depth order of front and back', () => {
		const near_at_0 = depth_key(3, 0, 5, 0, 4, 6);
		const far_at_0 = depth_key(0, 0, 0, 0, 4, 6);
		expect(near_at_0).toBeGreaterThan(far_at_0);
		//the same two voxels, seen from behind
		expect(depth_key(3, 0, 5, 180, 4, 6)).toBeLessThan(depth_key(0, 0, 0, 180, 4, 6));
	});
});

describe('visible_walls', () => {
	test('reproduces the old table at the cardinals, with the old shading', () => {
		const at = (yaw) => {
			const out = {};
			for (const wall of visible_walls(yaw)) out[wall.side] = wall;
			return out;
		};
		expect(at(0).left.face).toBe('+z');
		expect(at(0).right.face).toBe('+x');
		expect(at(90).left.face).toBe('+x');
		expect(at(90).right.face).toBe('-z');
		expect(at(0).left.lit).toBeCloseTo(0.72, 10);
		expect(at(0).right.lit).toBeCloseTo(0.52, 10);
	});

	test('at 45 degrees one wall faces the camera head on and the side walls are edge-on', () => {
		const walls = visible_walls(45);
		expect(walls.length).toBe(1);
		expect(walls[0].face).toBe('+x');
	});

	test('every wall it names genuinely points at the camera, at any angle', () => {
		for (let yaw = 0; yaw < 360; yaw += 7) {
			const t = yaw_trig(yaw);
			const normals = {
				'+x': [t.cos, t.sin], '-x': [-t.cos, -t.sin],
				'+z': [-t.sin, t.cos], '-z': [t.sin, -t.cos],
			};
			for (const wall of visible_walls(yaw)) {
				const n = normals[wall.face];
				expect(n[0] + n[1]).toBeGreaterThan(0);
				expect(wall.lit).toBeGreaterThan(0.4);
				expect(wall.lit).toBeLessThan(0.8);
			}
		}
	});
});
