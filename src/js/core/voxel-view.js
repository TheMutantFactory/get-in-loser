/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * Isometric projection for the voxel preview - the second view, which exists to answer two
 * questions the flat editing canvas cannot: what does this look like, and WHERE IS THE SLICE I AM
 * PAINTING ON. Pure; see tests/voxel-view.test.js.
 *
 * The camera orbits in 90 degree steps around the vertical axis. That is a deliberate limit: at
 * multiples of 90 the projection stays exact, every voxel lands on the same lattice, and the slice
 * plane is always a clean parallelogram. Free rotation would look nicer and make the "which slice
 * is that" question harder to answer at a glance.
 */

/** The camera positions. Orbiting is a quarter turn at a time. */
const YAWS = [0, 90, 180, 270];

/** 2:1 isometric - the pixel-art standard, and it keeps every edge on a whole pixel. */
const TILE = {w: 2, h: 1};

/** How tall one voxel stands on screen, in the same units as TILE. */
const VOXEL_H = 1;

/**
 * Turn the model under the camera.
 *
 * The footprint swaps at 90 and 270: a 16 wide by 8 deep model is 8 wide by 16 deep from the side,
 * and forgetting that is how a preview ends up clipped down one edge.
 *
 * @param {number} x
 * @param {number} z
 * @param {number} yaw
 * @param {number} w footprint width
 * @param {number} d footprint depth
 * @returns {object} keys x, z (rotated), w, d (footprint after rotation)
 */
function rotate_xz(x, z, yaw, w, d) {
	var turn = ((parseInt(yaw, 10) || 0) % 360 + 360) % 360;

	if (turn === 90) {
		return {x: (d - 1) - z, z: x, w: d, d: w};
	}
	if (turn === 180) {
		return {x: (w - 1) - x, z: (d - 1) - z, w: w, d: d};
	}
	if (turn === 270) {
		return {x: z, z: (w - 1) - x, w: d, d: w};
	}

	return {x: x, y: undefined, z: z, w: w, d: d};
}

/**
 * Project a point onto the preview.
 *
 * Takes CONTINUOUS coordinates, so it serves both voxel corners (whole numbers) and the slice
 * plane, whose corners sit on the far edge of the last voxel rather than its centre.
 *
 * @param {number} x
 * @param {number} y height
 * @param {number} z
 * @param {object} view keys: yaw, w, d, scale
 * @returns {object} keys sx, sy
 */
function project(x, y, z, view) {
	var scale = view.scale || 1;
	var turn = ((parseInt(view.yaw, 10) || 0) % 360 + 360) % 360;
	var w = view.w;
	var d = view.d;

	//rotate in continuous space - rotate_xz works on voxel indices, and reusing it here would be
	//off by one along the mirrored axes
	var rx = x;
	var rz = z;
	if (turn === 90) {
		rx = d - z;
		rz = x;
	}
	else if (turn === 180) {
		rx = w - x;
		rz = d - z;
	}
	else if (turn === 270) {
		rx = z;
		rz = w - x;
	}

	return {
		sx: (rx - rz) * (TILE.w / 2) * scale,
		sy: ((rx + rz) * (TILE.h / 2) - y * VOXEL_H) * scale,
	};
}

/**
 * Painter's algorithm key. Larger is nearer the camera, so drawing in ascending order puts the
 * back of the model down first.
 *
 * @returns {number}
 */
function depth_key(x, y, z, yaw, w, d) {
	var r = rotate_xz(x, z, yaw, w, d);

	return r.x + r.z + y;
}

/**
 * Every filled voxel, ordered back to front.
 *
 * @param {object} vol
 * @param {object} view keys: yaw
 * @param {function} get_voxel (vol,x,y,z) => packed colour
 * @returns {array} [{x, y, z, value}]
 */
function draw_order(vol, view, get_voxel) {
	var out = [];

	for (var y = 0; y < vol.h; y++) {
		for (var z = 0; z < vol.d; z++) {
			for (var x = 0; x < vol.w; x++) {
				var value = get_voxel(vol, x, y, z);
				if (value !== 0) {
					out.push({x: x, y: y, z: z, value: value});
				}
			}
		}
	}

	out.sort(function (a, b) {
		return depth_key(a.x, a.y, a.z, view.yaw, vol.w, vol.d)
			- depth_key(b.x, b.y, b.z, view.yaw, vol.w, vol.d);
	});

	return out;
}

/**
 * The box the whole model projects into, so the preview can be centred and scaled to fit.
 *
 * Computed from the eight corners of the volume rather than from the filled voxels: the framing
 * must not jump about while someone is drawing.
 *
 * @param {object} vol
 * @param {object} view
 * @returns {object} keys min_x, max_x, min_y, max_y, width, height
 */
function bounds(vol, view) {
	var v = {yaw: view.yaw, w: vol.w, d: vol.d, scale: view.scale || 1};
	var xs = [];
	var ys = [];

	for (var i = 0; i < 8; i++) {
		var p = project(
			(i & 1) ? vol.w : 0,
			(i & 2) ? vol.h : 0,
			(i & 4) ? vol.d : 0,
			v
		);
		xs.push(p.sx);
		ys.push(p.sy);
	}

	var min_x = Math.min.apply(null, xs);
	var max_x = Math.max.apply(null, xs);
	var min_y = Math.min.apply(null, ys);
	var max_y = Math.max.apply(null, ys);

	return {
		min_x: min_x, max_x: max_x, min_y: min_y, max_y: max_y,
		width: max_x - min_x, height: max_y - min_y,
	};
}

/**
 * The four projected corners of the current slice plane - what the preview outlines so the slice
 * has a visible position in the model.
 *
 * @param {object} vol
 * @param {string} axis
 * @param {number} slice
 * @param {object} view
 * @returns {array} four {sx, sy}, in order around the plane
 */
function slice_quad(vol, axis, slice, view) {
	var v = {yaw: view.yaw, w: vol.w, d: vol.d, scale: view.scale || 1};
	//the plane sits on the FAR face of the slice's voxels, which is index + 1
	var s = slice + 1;
	var corners;

	if (axis === 'z') {
		corners = [[0, 0, s], [vol.w, 0, s], [vol.w, vol.h, s], [0, vol.h, s]];
	}
	else if (axis === 'x') {
		corners = [[s, 0, 0], [s, 0, vol.d], [s, vol.h, vol.d], [s, vol.h, 0]];
	}
	else {
		corners = [[0, s, 0], [vol.w, s, 0], [vol.w, s, vol.d], [0, s, vol.d]];
	}

	return corners.map(function (c) {
		return project(c[0], c[1], c[2], v);
	});
}

/**
 * Scale that fits the model inside a box, with a margin.
 *
 * @param {object} vol
 * @param {object} view keys: yaw
 * @param {object} box keys: w, h
 * @param {number} margin pixels
 * @returns {number}
 */
function fit_scale(vol, view, box, margin) {
	var b = bounds(vol, {yaw: view.yaw, scale: 1});
	var pad = margin != undefined ? margin : 4;
	var avail_w = Math.max(1, box.w - pad * 2);
	var avail_h = Math.max(1, box.h - pad * 2);

	if (b.width <= 0 || b.height <= 0) {
		return 1;
	}

	return Math.min(avail_w / b.width, avail_h / b.height);
}


/**
 * ONION SKINNING. How far to look either way, and how faint each neighbour is.
 *
 * Slices are only legible one at a time, which makes lining a shape up with the slice under it a
 * matter of memory. Showing the neighbours faintly behind the live one turns that into something
 * you can see.
 */
const ONION = {
	/** the nearest neighbour, at its strongest */
	max_alpha: 0.42,
	/** never so faint it may as well not be drawn */
	min_alpha: 0.08,
	/** below the current slice - warm, like the frames already gone in animation onion skinning */
	tint_below: {r: 255, g: 80, b: 80},
	/** above - cool */
	tint_above: {r: 90, g: 170, b: 255},
};

/**
 * Which neighbouring slices to draw, and how strongly.
 *
 * Returned FARTHEST FIRST, so nearer neighbours paint over more distant ones and the stack reads
 * as depth rather than as a smear.
 *
 * @param {number} current
 * @param {number} count how many slices exist on this axis
 * @param {number} before how many to show below/behind
 * @param {number} after how many to show above/in front
 * @returns {array} [{index, distance, direction, alpha}]
 */
function onion_slices(current, count, before, after) {
	var out = [];

	var falloff = function (distance, span) {
		if (span <= 0) {
			return 0;
		}
		var a = ONION.max_alpha * (1 - (distance - 1) / span);

		return Math.max(ONION.min_alpha, a);
	};

	for (var d = 1; d <= (before || 0); d++) {
		var i = current - d;
		if (i < 0) {
			break;
		}
		out.push({index: i, distance: d, direction: -1, alpha: falloff(d, before)});
	}
	for (var e = 1; e <= (after || 0); e++) {
		var j = current + e;
		if (j >= count) {
			break;
		}
		out.push({index: j, distance: e, direction: 1, alpha: falloff(e, after)});
	}

	out.sort(function (a, b) {
		return b.distance - a.distance;
	});

	return out;
}


/**
 * The corners of each face of a unit voxel, as offsets from its origin.
 */
const FACE_CORNERS = {
	top: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]],
	'+x': [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
	'-x': [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
	'+z': [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]],
	'-z': [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
};

/**
 * WHICH SIDE FACES THE CAMERA CAN SEE at a given yaw.
 *
 * Drawing a fixed pair - the model's +x and +z, say - is only right at yaw 0. Orbit past that and
 * those faces point AWAY, so the cubes are drawn inside out: the near sides are never filled and
 * the model reads as hollow, open at the back. Which face is visible follows from the projection:
 * screen depth grows with rx + rz, so the visible sides are the ones lying toward increasing rx
 * and increasing rz, and what those are in model space changes with every quarter turn.
 *
 * The top is always visible - the camera is above the model at every yaw.
 *
 * @param {number} yaw
 * @returns {object} keys right (the +rx face) and left (the +rz face)
 */
function visible_faces(yaw) {
	var turn = ((parseInt(yaw, 10) || 0) % 360 + 360) % 360;

	if (turn === 90) {
		return {right: '-z', left: '+x'};
	}
	if (turn === 180) {
		return {right: '-x', left: '-z'};
	}
	if (turn === 270) {
		return {right: '+z', left: '-x'};
	}

	return {right: '+x', left: '+z'};
}

export {YAWS, ONION, onion_slices, FACE_CORNERS, visible_faces, TILE, VOXEL_H, rotate_xz, project, depth_key, draw_order, bounds, slice_quad, fit_scale};
