/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * Feather: soften the edge between what a layer draws and what it does not. Pure - see
 * tests/feather.test.js.
 *
 * THE THING THAT MAKES THIS NOT JUST "BLUR THE ALPHA". A fully transparent pixel still has colour
 * channels, and they are almost always black - nobody writes a colour they are not going to show.
 * Blur the alpha on its own and those black pixels start being visible, so a feathered cutout comes
 * back wearing a dark halo. The fix is to blur in PREMULTIPLIED space: multiply colour by alpha,
 * blur colour and alpha together, then divide the colour back out. Transparent pixels contribute
 * nothing because they weigh nothing, and the edge takes its colour from the pixels that actually
 * had one.
 *
 * AND THE BLURRED COLOUR IS ONLY USED WHERE THERE WASN'T ONE. Feathering is an operation on ALPHA;
 * it must not smear the picture. Taking the blurred colour everywhere does - a red square with a
 * blue panel inside it came back with the red/blue boundary smudged, nowhere near any edge. So the
 * blurred colour is mixed in by how transparent the pixel ORIGINALLY was: an opaque pixel keeps its
 * own colour exactly, and a pixel that had none takes the colour that bled into it. The halo is
 * still fixed, because the halo is exactly the region that had no colour of its own.
 */

/** Past this the blur costs more than the softness is worth at the sizes this app works at. */
const MAX_RADIUS = 64;

/**
 * One pass of a separable box blur over a single channel.
 *
 * Three box passes approximate a Gaussian closely enough that nobody can tell, and each pass is a
 * sliding sum - the cost does not grow with the radius.
 *
 * @param {Float32Array} src
 * @param {Float32Array} dst
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @param {boolean} horizontal
 */
function box_pass(src, dst, width, height, radius, horizontal) {
	var outer = horizontal ? height : width;
	var inner = horizontal ? width : height;
	var step = horizontal ? 1 : width;
	var span = radius * 2 + 1;

	for (var o = 0; o < outer; o++) {
		var base = horizontal ? o * width : o;
		var sum = 0;

		//prime the window, clamping at the edge so the border does not darken
		for (var k = -radius; k <= radius; k++) {
			sum += src[base + Math.min(inner - 1, Math.max(0, k)) * step];
		}

		for (var i = 0; i < inner; i++) {
			dst[base + i * step] = sum / span;

			var out_i = Math.min(inner - 1, Math.max(0, i - radius));
			var in_i = Math.min(inner - 1, Math.max(0, i + radius + 1));
			sum += src[base + in_i * step] - src[base + out_i * step];
		}
	}
}

/**
 * How to spend a feather radius on box passes.
 *
 * THE RADIUS HAS TO MEAN WHAT IT SAYS. Three passes of box radius r reach 3r each way, not r - so
 * feeding the requested radius straight in overshoots by three, and a 16px shape feathered by "3"
 * came back with its CENTRE at alpha 248. The shape was being dimmed, not edged. The box radius is
 * therefore a third of the ask, and small radii take a single pass so that "1" is one pixel rather
 * than the minimum three passes can express.
 *
 * @param {number} radius the feather radius asked for
 * @returns {object} keys: passes, box
 */
function blur_plan(radius) {
	if (radius <= 2) {
		//one pass gives a linear ramp exactly `radius` wide - crisp and honest at small sizes
		return {passes: 1, box: radius};
	}

	//three passes approximate a Gaussian; 6*box+1 is their combined support
	return {passes: 3, box: Math.max(1, Math.round(radius / 3))};
}

/**
 * Blur one channel, spreading about `radius` pixels each way.
 *
 * @param {Float32Array} channel modified in place
 * @param {number} width
 * @param {number} height
 * @param {number} radius the feather radius, not the box radius
 */
function blur_channel(channel, width, height, radius) {
	if (radius < 1) {
		return;
	}

	var plan = blur_plan(radius);
	var tmp = new Float32Array(channel.length);

	for (var pass = 0; pass < plan.passes; pass++) {
		box_pass(channel, tmp, width, height, plan.box, true);
		box_pass(tmp, channel, width, height, plan.box, false);
	}
}

/**
 * Soften a layer's alpha edge.
 *
 * @param {Uint8ClampedArray} rgba source pixels, not modified
 * @param {number} width
 * @param {number} height
 * @param {object} options keys:
 *   radius - how far the edge is spread, in pixels
 *   inside_only - keep the shape from growing: the result is masked back to where there was
 *                 already some coverage, so the edge fades inward instead of blooming outward
 * @returns {Uint8ClampedArray} new pixels
 */
function feather_pixels(rgba, width, height, options) {
	options = options || {};

	var radius = Math.max(0, Math.min(MAX_RADIUS, Math.round(options.radius || 0)));
	var out = new Uint8ClampedArray(rgba);

	if (radius < 1 || width < 1 || height < 1) {
		//nothing to do, and the caller gets a copy either way so it can always assign the result
		return out;
	}

	var n = width * height;
	var a = new Float32Array(n);
	var r = new Float32Array(n);
	var g = new Float32Array(n);
	var b = new Float32Array(n);
	var original_alpha = new Float32Array(n);

	//PREMULTIPLY. Colour is weighted by how much of it there is, so transparent pixels carry no
	//colour into the blur and cannot tint the new edge.
	for (var i = 0; i < n; i++) {
		var alpha = rgba[i * 4 + 3] / 255;
		original_alpha[i] = alpha;
		a[i] = alpha;
		r[i] = rgba[i * 4] * alpha;
		g[i] = rgba[i * 4 + 1] * alpha;
		b[i] = rgba[i * 4 + 2] * alpha;
	}

	blur_channel(a, width, height, radius);
	blur_channel(r, width, height, radius);
	blur_channel(g, width, height, radius);
	blur_channel(b, width, height, radius);

	for (var p = 0; p < n; p++) {
		var alpha_out = a[p];

		if (options.inside_only === true) {
			//never more coverage than there was; the shape softens rather than spreading
			alpha_out = Math.min(alpha_out, original_alpha[p]);
		}

		if (alpha_out <= 0) {
			out[p * 4] = 0;
			out[p * 4 + 1] = 0;
			out[p * 4 + 2] = 0;
			out[p * 4 + 3] = 0;
			continue;
		}

		//UN-PREMULTIPLY against the blurred alpha, which is what the colour was weighted by
		var weight = a[p] > 0 ? a[p] : 1;
		//...then keep the pixel's own colour in proportion to how much of it there already was
		var keep = original_alpha[p];
		var bleed = 1 - keep;

		out[p * 4] = rgba[p * 4] * keep + (r[p] / weight) * bleed;
		out[p * 4 + 1] = rgba[p * 4 + 1] * keep + (g[p] / weight) * bleed;
		out[p * 4 + 2] = rgba[p * 4 + 2] * keep + (b[p] / weight) * bleed;
		out[p * 4 + 3] = alpha_out * 255;
	}

	return out;
}

export {MAX_RADIUS, blur_plan, blur_channel, feather_pixels};
