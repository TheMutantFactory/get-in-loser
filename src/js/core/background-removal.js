/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * Remove the background: clear the region that reaches the edge of the image. Pure - see
 * tests/background-removal.test.js.
 *
 * WHY THIS IS NOT THE TOOLS WE ALREADY HAVE. Color to Alpha removes a colour EVERYWHERE, so a white
 * background goes and so do the highlights in the eyes. The Magic Eraser is contiguous but wants a
 * click per region, so a subject with sky either side of its head takes three. This starts from the
 * border and floods inward, which is the actual definition of background: the part that touches the
 * outside.
 *
 * CONTIGUITY IS THE WHOLE POINT. A hole enclosed by the subject - the gap inside a handle, the sky
 * between an arm and a body that the arm closes off - is the same colour as the background and is
 * NOT the background. Flooding rather than colour-matching is what tells them apart.
 *
 * ------------------------------------------------------------------------------------------------
 * THE FIRST VERSION OF THIS FILE MATCHED ONE BORDER COLOUR WITH ONE THRESHOLD, AND FAILED THREE WAYS
 * that are worth writing down, because each stage below exists to fix one of them.
 *
 *   1. IT COULD INVERT. It took the single most common border colour as the background. On a tight
 *      crop the SUBJECT is most of the border, so the tool deleted the subject and kept the wall.
 *      Measured: 100% of the subject cleared, 100% of the background surviving.
 *   2. IT LEAKED. An anti-aliased edge is a smooth ramp from background to subject, so a plain
 *      threshold flood walks straight down it and out into the foreground. Measured on a photo-like
 *      scene: tolerance 30 removed the background correctly, tolerance 60 removed 89.5% of the
 *      SUBJECT. There was no safe setting, only a lucky one.
 *   3. IT WAS CHOPPY, because the mask was binary. A real edge is fractionally covered - a pixel on
 *      the boundary of a strand of hair is genuinely 40% hair - and a yes/no test cannot say so.
 *
 * So: cluster the border instead of taking its mode, and refuse clusters the middle of the picture
 * is made of (1); require each step of the flood to be small as well as the destination plausible
 * (2); and solve real fractional alpha in a band around the boundary instead of thresholding (3).
 */

/** 0 removes only exact matches; 255 would remove everything. */
const MAX_TOLERANCE = 255;

/** How wide the band of solved alpha can be. Past this it is a selection, not an edge. */
const MAX_REFINE = 16;

/** How many distinct colours the background is allowed to be made of. */
const MAX_CLUSTERS = 4;

/** A tolerance timid enough that it cannot plausibly reach past a real edge. */
const SAFE_TOLERANCE = 18;

/**
 * Perceptual-ish distance between two colours, 0 when identical.
 *
 * Weighted toward green because the eye is, so a tolerance that looks right on one hue looks right
 * on the others. Returned on the same 0-255 scale as the tolerance so the setting means something.
 *
 * @returns {number}
 */
function color_distance(r1, g1, b1, r2, g2, b2) {
	var dr = r1 - r2;
	var dg = g1 - g2;
	var db = b1 - b2;

	return Math.sqrt((2 * dr * dr + 4 * dg * dg + 3 * db * db) / 9);
}

/**
 * Group a weighted list of colours into at most k representative ones.
 *
 * Plain Lloyd's algorithm, seeded from the heaviest coarse buckets rather than at random - this has
 * to give the same answer twice or a live preview flickers as you drag the slider.
 *
 * @param {Array} samples entries [r, g, b, weight]
 * @param {number} k
 * @returns {Array} entries {r, g, b, weight}
 */
function cluster_colors(samples, k) {
	if (samples.length === 0) {
		return [];
	}

	//seed: the heaviest coarse buckets, which are already a decent guess at the modes
	var buckets = new Map();
	for (var s = 0; s < samples.length; s++) {
		var key = (samples[s][0] >> 4) * 256 + (samples[s][1] >> 4) * 16 + (samples[s][2] >> 4);
		var slot = buckets.get(key);
		if (slot == null) {
			buckets.set(key, {r: samples[s][0], g: samples[s][1], b: samples[s][2], weight: samples[s][3]});
		}
		else {
			slot.weight += samples[s][3];
		}
	}

	var seeds = Array.from(buckets.values()).sort(function (a, b) { return b.weight - a.weight; });
	var centers = seeds.slice(0, k).map(function (c) { return {r: c.r, g: c.g, b: c.b, weight: 0}; });

	if (centers.length === 0) {
		return [];
	}

	for (var pass = 0; pass < 8; pass++) {
		var sums = centers.map(function () { return {r: 0, g: 0, b: 0, w: 0}; });

		for (var i = 0; i < samples.length; i++) {
			var best = 0;
			var best_d = Infinity;

			for (var c = 0; c < centers.length; c++) {
				var d = color_distance(samples[i][0], samples[i][1], samples[i][2],
					centers[c].r, centers[c].g, centers[c].b);
				if (d < best_d) {
					best_d = d;
					best = c;
				}
			}

			var w = samples[i][3];
			sums[best].r += samples[i][0] * w;
			sums[best].g += samples[i][1] * w;
			sums[best].b += samples[i][2] * w;
			sums[best].w += w;
		}

		for (var m = 0; m < centers.length; m++) {
			if (sums[m].w > 0) {
				centers[m].r = sums[m].r / sums[m].w;
				centers[m].g = sums[m].g / sums[m].w;
				centers[m].b = sums[m].b / sums[m].w;
			}
			centers[m].weight = sums[m].w;
		}
	}

	return centers.filter(function (c) { return c.weight > 0; })
		.sort(function (a, b) { return b.weight - a.weight; });
}

/**
 * Collect the colours the border is made of, weighted, corners counting for more.
 *
 * CORNERS ARE THE LAST REDOUBT OF THE BACKGROUND. A subject can run off the bottom of the frame and
 * off both sides; it is far rarer for it to hold all four corners as well. Weighting them is a cheap
 * way of making the common tight crop behave.
 *
 * @returns {Array} entries [r, g, b, weight]
 */
function border_samples(rgba, width, height) {
	var samples = [];
	var corner = Math.max(2, Math.round(Math.min(width, height) * 0.15));

	var take = function (x, y) {
		var i = (y * width + x) * 4;
		if (rgba[i + 3] === 0) {
			//already transparent; it says nothing about what the background looks like
			return;
		}
		var near_corner = (x < corner || x >= width - corner) && (y < corner || y >= height - corner);
		samples.push([rgba[i], rgba[i + 1], rgba[i + 2], near_corner ? 3 : 1, near_corner ? 1 : 0]);
	};

	for (var x = 0; x < width; x++) {
		take(x, 0);
		if (height > 1) take(x, height - 1);
	}
	for (var y = 1; y < height - 1; y++) {
		take(0, y);
		if (width > 1) take(width - 1, y);
	}

	return samples;
}

/**
 * Keep only the clusters the corners actually vouch for.
 *
 * Each corner sample votes for its nearest cluster; a cluster with almost no corner behind it is
 * something the subject brought to the border, not the background.
 *
 * @param {Array} clusters
 * @param {Array} samples entries [r, g, b, weight, is_corner]
 * @returns {Array}
 */
function with_corner_support(clusters, samples) {
	if (clusters.length < 2) {
		//nothing to choose between; a single cluster is the only answer available
		return clusters;
	}

	var votes = clusters.map(function () { return 0; });
	var corner_total = 0;

	for (var i = 0; i < samples.length; i++) {
		if (samples[i][4] !== 1) {
			continue;
		}
		corner_total += samples[i][3];

		var best = 0;
		var best_d = Infinity;
		for (var c = 0; c < clusters.length; c++) {
			var d = color_distance(samples[i][0], samples[i][1], samples[i][2],
				clusters[c].r, clusters[c].g, clusters[c].b);
			if (d < best_d) {
				best_d = d;
				best = c;
			}
		}
		votes[best] += samples[i][3];
	}

	if (corner_total === 0) {
		return clusters;
	}

	var supported = clusters.filter(function (c, index) { return votes[index] / corner_total >= 0.1; });

	//if the corners agree with nothing, they are no help and the border stands as it was
	return supported.length > 0 ? supported : clusters;
}

/**
 * The colours that dominate the middle of the picture.
 *
 * Used only to VETO border clusters. Whatever the middle of the frame is mostly made of is the
 * subject; if the border agrees with it, the border is subject too, and calling it background is
 * how the old version came to delete the foreground.
 *
 * @returns {Array} entries {r, g, b, share} where share is a fraction of the centre region
 */
function center_colors(rgba, width, height) {
	var x0 = Math.floor(width / 4), x1 = Math.ceil(width * 3 / 4);
	var y0 = Math.floor(height / 4), y1 = Math.ceil(height * 3 / 4);
	var samples = [];

	for (var y = y0; y < y1; y++) {
		for (var x = x0; x < x1; x++) {
			var i = (y * width + x) * 4;
			if (rgba[i + 3] > 0) {
				samples.push([rgba[i], rgba[i + 1], rgba[i + 2], 1]);
			}
		}
	}

	if (samples.length === 0) {
		return [];
	}

	return cluster_colors(samples, MAX_CLUSTERS).map(function (c) {
		return {r: c.r, g: c.g, b: c.b, share: c.weight / samples.length};
	});
}

/**
 * Work out what the background is made of.
 *
 * @param {object} options keys: tolerance
 * @returns {Array} entries {r, g, b, weight}
 */
function background_clusters(rgba, width, height, options) {
	options = options || {};
	var tolerance = options.tolerance == null ? 30 : options.tolerance;

	var samples = border_samples(rgba, width, height);
	if (samples.length === 0) {
		return [];
	}

	var total = samples.reduce(function (sum, s) { return sum + s[3]; }, 0);
	var clusters = cluster_colors(samples, MAX_CLUSTERS)
		//a colour a twentieth of the border agrees on is noise, not a background
		.filter(function (c) { return c.weight / total >= 0.05; });

	//A BACKGROUND HOLDS THE CORNERS. This is the fix for the subject that runs off the bottom of the
	//frame: a portrait's shirt occupies a good share of the bottom edge, so it was becoming one of
	//the background clusters and then seeding the flood ON THE SUBJECT - which is why no tolerance
	//helped, not even 6. Measured: 53.8% of the subject lost with no noise and nothing else wrong.
	//A subject can run off one edge, or three; it is far rarer for it to hold the corners too.
	clusters = with_corner_support(clusters, samples);

	var middle = center_colors(rgba, width, height);

	//THE VETO HAS TO BE RARE, AND IT MUST NOT WIDEN WITH THE SETTING. Two things went wrong here
	//before. Most photographs show plenty of background in the middle of the frame - sky either side
	//of a head - so a cluster that merely APPEARS in the centre is still background; only a colour
	//the centre is mostly MADE of is the subject. And matching at the USER'S tolerance meant a wide
	//setting vetoed every cluster at once, the real background included, which threw the decision to
	//the fallback and handed the subject straight back. It is judged at a fixed, timid radius.
	var vetoed = clusters.filter(function (c) {
		return !middle.some(function (m) {
			return m.share >= 0.45 && color_distance(c.r, c.g, c.b, m.r, m.g, m.b) <= SAFE_TOLERANCE;
		});
	});

	if (vetoed.length > 0) {
		return vetoed;
	}

	//EVERY candidate looks like the subject, which means the centre is made of the same things the
	//border is: a flat image, or a two-tone one, or a picture that is all background. Keep them all
	//and let the flood decide - refusing would leave a two-tone backdrop half removed, and taking
	//only the heaviest did exactly that.
	return clusters;
}

/**
 * Flood inward from the border, marking what is reachable background.
 *
 * TWO CONDITIONS, NOT ONE. A pixel joins the background if it looks like a background colour AND the
 * step onto it from where we came was small. The second test is the one that matters: an
 * anti-aliased edge is a smooth ramp, so its DESTINATION looks plausible all the way across - but
 * each step down it is a large fraction of the whole subject-to-background difference, while steps
 * within a real background are noise-sized.
 *
 * @returns {Uint8Array} 1 where background
 */
function flood_background(rgba, width, height, clusters, tolerance, step_limit, options) {
	options = options || {};

	var n = width * height;
	var mask = new Uint8Array(n);
	var visited = new Uint8Array(n);
	var blocked = options.blocked || null;
	var stack = [];

	var looks_like_background = function (index) {
		var i = index * 4;
		for (var c = 0; c < clusters.length; c++) {
			if (color_distance(rgba[i], rgba[i + 1], rgba[i + 2],
				clusters[c].r, clusters[c].g, clusters[c].b) <= tolerance) {
				return true;
			}
		}
		return false;
	};

	var step = function (from, to) {
		var a = from * 4, b = to * 4;
		return color_distance(rgba[a], rgba[a + 1], rgba[a + 2], rgba[b], rgba[b + 1], rgba[b + 2]);
	};

	var seed = function (index) {
		if (visited[index] === 1 || (blocked != null && blocked[index] === 1)) {
			return;
		}
		visited[index] = 1;
		if (looks_like_background(index)) {
			stack.push(index);
		}
	};

	if (options.seeds != null && options.seeds.length > 0) {
		//SOMEBODY TOLD US WHERE THE BACKGROUND IS. No guessing from here on.
		for (var s = 0; s < options.seeds.length; s++) {
			seed(options.seeds[s]);
		}
	}
	else {
		for (var x = 0; x < width; x++) {
			seed(x);
			seed((height - 1) * width + x);
		}
		for (var y = 0; y < height; y++) {
			seed(y * width);
			seed(y * width + width - 1);
		}
	}

	while (stack.length > 0) {
		var index = stack.pop();
		mask[index] = 1;

		var px = index % width;
		var py = (index - px) / width;

		var visit = function (next) {
			if (visited[next] === 1 || (blocked != null && blocked[next] === 1)) {
				return;
			}
			if (!looks_like_background(next) || step(index, next) > step_limit) {
				//leave it unvisited: another route may reach it across a smaller step
				return;
			}
			visited[next] = 1;
			stack.push(next);
		};

		if (px > 0) visit(index - 1);
		if (px < width - 1) visit(index + 1);
		if (py > 0) visit(index - width);
		if (py < height - 1) visit(index + width);
	}

	return mask;
}

/**
 * Grow a mask by `radius` pixels, four-connected.
 *
 * @returns {Uint8Array}
 */
function dilate(mask, width, height, radius) {
	var out = Uint8Array.from(mask);
	if (radius < 1) {
		return out;
	}

	var frontier = [];
	for (var i = 0; i < out.length; i++) {
		if (out[i] === 1) frontier.push(i);
	}

	for (var r = 0; r < radius; r++) {
		var next = [];
		for (var f = 0; f < frontier.length; f++) {
			var index = frontier[f];
			var px = index % width;
			var py = (index - px) / width;

			var add = function (q) {
				if (out[q] === 0) {
					out[q] = 1;
					next.push(q);
				}
			};

			if (px > 0) add(index - 1);
			if (px < width - 1) add(index + 1);
			if (py > 0) add(index - width);
			if (py < height - 1) add(index + width);
		}
		frontier = next;
	}

	return out;
}

/** Shrink a mask by `radius` pixels: dilate its complement instead. */
function erode(mask, width, height, radius) {
	var inverse = new Uint8Array(mask.length);
	for (var i = 0; i < mask.length; i++) {
		inverse[i] = mask[i] === 1 ? 0 : 1;
	}

	var grown = dilate(inverse, width, height, radius);

	var out = new Uint8Array(mask.length);
	for (var j = 0; j < mask.length; j++) {
		out[j] = grown[j] === 1 ? 0 : 1;
	}
	return out;
}

/**
 * Label every pixel definite-background (0), definite-foreground (1) or unknown (2).
 *
 * @returns {Uint8Array}
 */
function build_trimap(mask, width, height, refine) {
	var inner = erode(mask, width, height, refine);
	var outer = dilate(mask, width, height, refine);
	var trimap = new Uint8Array(mask.length);

	for (var i = 0; i < mask.length; i++) {
		if (inner[i] === 1) {
			trimap[i] = 0;
		}
		else if (outer[i] === 0) {
			trimap[i] = 1;
		}
		else {
			trimap[i] = 2;
		}
	}

	return trimap;
}

/**
 * Solve fractional coverage for one unknown pixel.
 *
 * THE FORMULA IS A PROJECTION. If a boundary pixel's colour C is a mix of some foreground colour F
 * and some background colour B, then where it sits along the line from B to F IS its coverage. So
 * find the nearest confident example of each, and project:
 *
 *     alpha = (C - B) . (F - B) / |F - B|^2
 *
 * This is the cheap end of a family that runs up to closed-form matting; it is enough to turn a
 * staircase into an edge, and unlike a threshold it can answer "40% hair".
 *
 * @returns {object} keys: alpha, r, g, b
 */
function solve_pixel(rgba, width, height, trimap, index, search) {
	var px = index % width;
	var py = (index - px) / width;
	var i = index * 4;

	var fore = null, back = null;

	var consider = function (qx, qy) {
		if (qx < 0 || qy < 0 || qx >= width || qy >= height) {
			return;
		}
		var q = qy * width + qx;
		if (trimap[q] === 1 && fore == null) {
			fore = q * 4;
		}
		else if (trimap[q] === 0 && back == null) {
			back = q * 4;
		}
	};

	//spiral outward until both a confident foreground and a confident background are in hand.
	//ONLY THE PERIMETER OF EACH RING: scanning the filled square instead makes this cubic in the
	//search radius, which at the largest edge-refine setting took a 64x64 test image 50 seconds.
	for (var ring = 1; ring <= search && (fore == null || back == null); ring++) {
		for (var d = -ring; d <= ring; d++) {
			consider(px + d, py - ring);
			consider(px + d, py + ring);
			consider(px - ring, py + d);
			consider(px + ring, py + d);
		}
	}

	if (fore == null || back == null) {
		//nothing confident nearby: keep whichever side of the boundary it fell
		return {alpha: trimap[index] === 0 ? 0 : 1, r: rgba[i], g: rgba[i + 1], b: rgba[i + 2]};
	}

	var fr = rgba[fore], fg = rgba[fore + 1], fb = rgba[fore + 2];
	var br = rgba[back], bg = rgba[back + 1], bb = rgba[back + 2];

	var dr = fr - br, dg = fg - bg, db = fb - bb;
	var len = dr * dr + dg * dg + db * db;

	if (len < 1) {
		//foreground and background are the same colour here; coverage is unknowable, keep the pixel
		return {alpha: 1, r: rgba[i], g: rgba[i + 1], b: rgba[i + 2]};
	}

	var alpha = ((rgba[i] - br) * dr + (rgba[i + 1] - bg) * dg + (rgba[i + 2] - bb) * db) / len;
	alpha = Math.max(0, Math.min(1, alpha));

	//COLOUR DECONTAMINATION. A half-covered pixel's colour is half background; leave it and the
	//cutout carries a rim of wherever it used to be. Undo the mix to recover the foreground alone.
	if (alpha > 0.15) {
		return {
			alpha: alpha,
			r: Math.max(0, Math.min(255, br + (rgba[i] - br) / alpha)),
			g: Math.max(0, Math.min(255, bg + (rgba[i + 1] - bg) / alpha)),
			b: Math.max(0, Math.min(255, bb + (rgba[i + 2] - bb) / alpha)),
		};
	}

	//too little coverage to divide by; the nearby foreground is a better guess than the mix
	return {alpha: alpha, r: fr, g: fg, b: fb};
}

/** How much of the protected subject the flood may take before the tolerance is judged too wide. */
const MAX_SUBJECT_LOSS = 0.3;

/**
 * The part of the middle of the picture that a deliberately timid flood could not reach.
 *
 * This is the subject, identified rather than guessed at. Colour heuristics kept getting this
 * wrong - the middle of a photograph is full of background too, and a background with any gradient
 * in it reads as "a different colour" from its own border - but a flood too timid to cross an edge
 * cannot be argued with about which side of one it is on.
 *
 * @returns {Array} pixel indices
 */
function protected_region(rgba, width, height, clusters, tolerance, step_limit) {
	var timid = flood_background(rgba, width, height, clusters,
		Math.min(tolerance, SAFE_TOLERANCE), step_limit);

	//THE WHOLE FRAME, NOT THE MIDDLE OF IT. This looked only at the central quarter, on the theory
	//that the subject lives in the middle - and a pale shirt against a pale wall, which is most of
	//the lower half of a portrait and barely inside that box, was therefore not protected at all.
	//53.8% of the subject went, with no noise and nothing else wrong. A subject is not obliged to
	//sit in the middle of the picture, and the timid flood already knows where it is.
	var kept = [];

	for (var index = 0; index < width * height; index++) {
		if (timid[index] === 0 && rgba[index * 4 + 3] > 0) {
			kept.push(index);
		}
	}

	//too little survives to be a subject: a flat image, or a small mark on a wide background, where
	//flooding all of it is the correct answer rather than a mistake
	return kept.length >= width * height * 0.02 ? kept : [];
}

/**
 * Turn a background mask into pixels: hard clear inside it, solved alpha in the band around it.
 *
 * @param {Uint8ClampedArray} out written to
 * @param {Uint8Array} mask 1 where background
 * @param {Array|null} protect pixel indices that are foreground no matter what the geometry says
 * @returns {number} how many pixels lost some alpha
 */
function apply_mask(rgba, width, height, out, mask, refine, protect) {
	var trimap = refine > 0
		? build_trimap(mask, width, height, refine)
		: mask.map(function (m) { return m === 1 ? 0 : 1; });

	if (protect != null) {
		//a mark is an instruction, not a hint: it survives the erosion that built the band
		for (var p = 0; p < protect.length; p++) {
			trimap[protect[p]] = 1;
		}
	}

	var search = Math.max(3, refine * 2);
	var removed = 0;

	for (var index = 0; index < width * height; index++) {
		var i = index * 4;
		var label = trimap[index];

		if (label === 1) {
			//confident foreground, left exactly as it was
			continue;
		}

		if (label === 0) {
			out[i + 3] = 0;
			removed++;
			continue;
		}

		var solved = solve_pixel(rgba, width, height, trimap, index, search);
		var alpha = Math.round(solved.alpha * rgba[i + 3]);

		out[i] = solved.r;
		out[i + 1] = solved.g;
		out[i + 2] = solved.b;
		out[i + 3] = alpha;

		if (alpha < rgba[i + 3]) {
			removed++;
		}
	}

	return removed;
}

/**
 * Let background marks and subject marks compete for every pixel; nearest wins.
 *
 * WHY A COMPETITION AND NOT TWO THRESHOLDS. Flooding out from each kind of mark separately means
 * both floods obey the same sensitivity, so an edge that one of them can cross is an edge the other
 * can cross too - set it loose and the background swallows the subject, set it tight and the subject
 * claims the wall. Whichever way it is wrong, it is wrong in both directions at once, and no value
 * of the setting fixes that.
 *
 * MARKING THE SUBJECT CHANGES THE RULE, and it is worth knowing which rule you are under. Background
 * marks on their own mean "take this region, out to where it stops looking like this", and the
 * sensitivity governs where that is. Add a subject mark and it becomes "keep what I marked, take
 * everything else" - so a piece of the subject that touches nothing marked, a head not quite meeting
 * the shoulders, goes with the background until it is marked too. That is the rule doing as it is
 * told rather than a fault, but it is not what the first rule would have done.
 *
 * The distance used is MINIMAX: the cost of reaching a pixel is the largest single colour step on
 * the easiest route to it. That is the right notion here because it asks "what is the strongest edge
 * I had to cross to get here", which is exactly the question a boundary answers. Every pixel then
 * belongs to whichever mark got to it over the lowest wall, and the boundary settles onto the
 * highest ridge between them without anybody having to name a number.
 *
 * Dial's algorithm rather than a heap: costs are quantised, so the queue is a fixed set of buckets
 * and the whole thing stays linear.
 *
 * COSTS ARE QUANTISED IN SIXTEENTHS, and the sixteenths matter. Rounding them to whole units looked
 * harmless and was not: on a pale shirt against a pale graded wall, the largest step ACROSS the edge
 * was 0.88 and the steps along the wall's own gradient were 0.47. Both round to nothing, the ridge
 * the competition is supposed to find stops existing, and the subject swallows the entire picture.
 * Low-contrast images are exactly the ones this tool is for, so the resolution has to survive them.
 *
 * @returns {Uint8Array} 1 where background
 */
function segment_by_competition(rgba, width, height, bg_seeds, fg_seeds) {
	var SCALE = 16;
	var LEVELS = 256 * SCALE + 1;
	var n = width * height;
	var cost = new Uint16Array(n).fill(LEVELS);
	var owner = new Uint8Array(n);
	var buckets = [];

	for (var b = 0; b < LEVELS; b++) {
		buckets.push([]);
	}

	var start = function (pixels, mark) {
		for (var i = 0; i < pixels.length; i++) {
			var p = pixels[i];
			if (cost[p] !== 0) {
				cost[p] = 0;
				owner[p] = mark;
				buckets[0].push(p);
			}
		}
	};

	//the subject goes first so that a tie is resolved in favour of keeping it; losing the subject is
	//the failure people notice and mind
	start(fg_seeds, 2);
	start(bg_seeds, 1);

	var step = function (a, c) {
		var i = a * 4, j = c * 4;
		return color_distance(rgba[i], rgba[i + 1], rgba[i + 2], rgba[j], rgba[j + 1], rgba[j + 2]);
	};

	for (var c = 0; c < LEVELS; c++) {
		while (buckets[c].length > 0) {
			var p = buckets[c].pop();

			if (cost[p] !== c) {
				//already reached more cheaply by another route
				continue;
			}

			var px = p % width;
			var py = (p - px) / width;

			var relax = function (q) {
				var next = Math.max(c, Math.round(step(p, q) * SCALE));
				if (next < cost[q]) {
					cost[q] = next;
					owner[q] = owner[p];
					buckets[next].push(q);
				}
			};

			if (px > 0) relax(p - 1);
			if (px < width - 1) relax(p + 1);
			if (py > 0) relax(p - width);
			if (py < height - 1) relax(p + width);
		}
	}

	var mask = new Uint8Array(n);
	for (var m = 0; m < n; m++) {
		mask[m] = owner[m] === 1 ? 1 : 0;
	}
	return mask;
}

/**
 * Clear the background the marks point at.
 *
 * @returns {object} the same shape remove_background returns
 */
function from_marks(rgba, width, height, out, seeds, blocked, protect,
	tolerance, refine, step_limit, brush) {

	var colors_of = function (pixels) {
		var samples = [];
		for (var i = 0; i < pixels.length; i++) {
			var k = pixels[i] * 4;
			if (rgba[k + 3] > 0) {
				samples.push([rgba[k], rgba[k + 1], rgba[k + 2], 1]);
			}
		}
		return cluster_colors(samples, MAX_MARK_CLUSTERS);
	};

	var clusters = colors_of(seeds);

	if (clusters.length === 0) {
		//every marked pixel is already transparent; there is nothing there to take
		return {data: out, removed: 0, tolerance_used: tolerance, background: null, clusters: []};
	}

	//A SUBJECT MARK CLAIMS ITS WHOLE REGION, not the few pixels under the cursor - marking one dot in
	//the middle of a shirt and having the flood pour in around it is not a correction. Once there is
	//something to compete against, the sensitivity setting stops being consulted at all: the boundary
	//is decided by where the strongest edge between the two marks lies.
	var mask = protect != null && protect.length > 0
		? segment_by_competition(rgba, width, height, seeds, protect)
		: flood_background(rgba, width, height, clusters, tolerance, step_limit,
			{seeds: seeds, blocked: blocked});

	var removed = apply_mask(rgba, width, height, out, mask, refine, protect);

	return {
		data: out,
		removed: removed,
		tolerance_used: tolerance,
		background: {
			r: Math.round(clusters[0].r),
			g: Math.round(clusters[0].g),
			b: Math.round(clusters[0].b),
		},
		clusters: clusters,
	};
}

/** How many colours a set of explicit marks may describe - more than the border gets, since a
 * person clicking four different things means four different things. */
const MAX_MARK_CLUSTERS = 8;

/**
 * Every pixel within `radius` of any mark.
 *
 * A click is one pixel, and one pixel is a poor description of a colour - it might be the single
 * speck of noise its neighbours are not. Taking a small disc makes a mark mean what the person
 * pointed at rather than exactly what they hit.
 *
 * @param {Array} marks entries [x, y]
 * @returns {Array} pixel indices
 */
function mark_pixels(marks, width, height, radius) {
	var seen = new Uint8Array(width * height);
	var out = [];

	for (var m = 0; m < marks.length; m++) {
		var mx = Math.round(marks[m][0]);
		var my = Math.round(marks[m][1]);

		for (var dy = -radius; dy <= radius; dy++) {
			for (var dx = -radius; dx <= radius; dx++) {
				if (dx * dx + dy * dy > radius * radius) {
					continue;
				}
				var x = mx + dx, y = my + dy;
				if (x < 0 || y < 0 || x >= width || y >= height) {
					continue;
				}
				var index = y * width + x;
				if (seen[index] === 0) {
					seen[index] = 1;
					out.push(index);
				}
			}
		}
	}

	return out;
}

/**
 * Clear the background.
 *
 * @param {Uint8ClampedArray} rgba source pixels, not modified
 * @param {number} width
 * @param {number} height
 * @param {object} options keys:
 *   tolerance - how far from a background colour still counts as background, 0-255
 *   refine    - how wide a band around the boundary gets real fractional alpha solved for it
 * @returns {object|null} keys: data, removed, background, clusters
 */
function remove_background(rgba, width, height, options) {
	options = options || {};

	if (!(width > 0) || !(height > 0) || rgba == null || rgba.length < width * height * 4) {
		return null;
	}

	var tolerance = Math.max(0, Math.min(MAX_TOLERANCE, Number(options.tolerance)));
	if (isNaN(tolerance)) {
		tolerance = 0;
	}

	var refine = Math.round(Number(options.refine));
	if (isNaN(refine)) {
		refine = 2;
	}
	refine = Math.max(0, Math.min(MAX_REFINE, refine));

	//a step of half the tolerance is comfortably above background noise and comfortably below the
	//jump an anti-aliased edge makes, which is where the leak used to get through
	var step_limit = options.step_limit == null
		? Math.max(6, tolerance * 0.5)
		: Number(options.step_limit);

	var out = new Uint8ClampedArray(rgba);
	var brush = Math.max(0, Math.round(Number(options.brush)) || 3);
	var seeds = options.seeds != null && options.seeds.length > 0
		? mark_pixels(options.seeds, width, height, brush)
		: null;
	var protect = options.protect != null && options.protect.length > 0
		? mark_pixels(options.protect, width, height, brush)
		: null;

	var blocked = null;
	if (protect != null) {
		blocked = new Uint8Array(width * height);
		for (var b = 0; b < protect.length; b++) {
			blocked[protect[b]] = 1;
		}
	}

	if (seeds != null) {
		//MARKED MODE. Everything the automatic path does to work out what the background is - reading
		//the border, weighing the corners, vetoing against the middle, backing the tolerance off when
		//it starts eating the subject - exists to guess at something it has now simply been told. All
		//of it is skipped, which is the entire point: the guessing is what could be wrong.
		return from_marks(rgba, width, height, out, seeds, blocked, protect,
			tolerance, refine, step_limit, brush);
	}

	var clusters = background_clusters(rgba, width, height, {tolerance: tolerance});

	if (clusters.length === 0) {
		//every border pixel is already transparent; there is nothing to take away
		return {data: out, removed: 0, background: null, clusters: []};
	}

	//THE TOLERANCE IS CAPPED BY THE SUBJECT ITSELF, which is the difference between a setting that is
	//too high and a setting that deletes your photograph. A tolerance wider than the gap between the
	//background and what the middle of the picture is made of does not mean "remove more background";
	//it means "the subject is now also background", and the flood duly removes it. Measured before
	//this cap: a subject 42 units from the wall, at tolerance 60, came back 89.5% erased.
	//THE TOLERANCE IS NOT ALLOWED TO EAT THE SUBJECT, which is the whole difference between a setting
	//that is too high and a setting that deletes your photograph. A tolerance wider than the gap
	//between background and subject does not mean "remove more background"; it means the subject is
	//now ALSO background - and if the subject runs off the edge of the frame, as one in a tight crop
	//does, the flood does not even have to cross an edge to get at it. It is SEEDED on it. Measured
	//before this guard: a subject 42 units from the wall, at tolerance 60, came back 89.5% erased,
	//and no step limit helped, because no step was ever taken.
	//
	//So the tolerance is tried, and backed off while it is taking the subject with it.
	var guarded = protected_region(rgba, width, height, clusters, tolerance, step_limit);
	var effective = tolerance;
	var mask = null;

	for (var attempt = 0; attempt < 5; attempt++) {
		mask = flood_background(rgba, width, height, clusters, effective, step_limit);

		if (guarded.length === 0) {
			break;
		}

		var eaten = 0;
		for (var g = 0; g < guarded.length; g++) {
			if (mask[guarded[g]] === 1) {
				eaten++;
			}
		}

		if (eaten / guarded.length <= MAX_SUBJECT_LOSS) {
			break;
		}

		effective *= 0.7;
	}
	var removed = apply_mask(rgba, width, height, out, mask, refine, null);

	return {
		data: out,
		removed: removed,
		tolerance_used: effective,
		background: {
			r: Math.round(clusters[0].r),
			g: Math.round(clusters[0].g),
			b: Math.round(clusters[0].b),
		},
		clusters: clusters,
	};
}

export {
	MAX_TOLERANCE,
	MAX_REFINE,
	SAFE_TOLERANCE,
	color_distance,
	cluster_colors,
	border_samples,
	center_colors,
	with_corner_support,
	background_clusters,
	protected_region,
	flood_background,
	build_trimap,
	mark_pixels,
	remove_background,
};
