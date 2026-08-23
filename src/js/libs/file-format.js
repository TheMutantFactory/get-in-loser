/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * Which FILE FORMAT a saved .json is written in, as opposed to which version of the app wrote it.
 * Pure - see tests/file-format.test.js.
 *
 * THE BUG THIS EXISTS TO FIX. `info.version` carried the app version, and the loader compared that
 * same field against miniPaint's format milestones - 4.0.0, 4.5.0, 4.8.0, 4.11.0 - to decide which
 * migrations to run. That worked for as long as the app version and the format version were the
 * same number, which they were right up until this fork reset the app to 0.1.x.
 *
 * After that, every file this app saved claimed version "0.1.x", which is below all four
 * milestones, so every migration ran on files that needed none. The v3 to v4 migration forces
 * `type = "image"` onto every layer, so a brush layer came back as an image whose `data` was still
 * an array of stroke points - and Insert_layer_action called cloneNode on it and threw. do_action
 * catches and returns {status: 'aborted'} without a word, so quicksave simply stopped working and
 * said nothing.
 *
 * The two numbers are now separate: `info.format` says how to read the file, `info.version` says
 * what wrote it, and only the first one decides migrations.
 */

/**
 * The format this app writes. It is miniPaint's lineage, not this app's version: the layout is
 * unchanged from the 4.14.3 import, so files stay readable by miniPaint and vice versa. Bump it
 * only when the SHAPE of the file changes, and add a migration when you do.
 */
const FILE_FORMAT = '4.14.3';

/**
 * The oldest format miniPaint ever wrote. A file that names no version at all predates the field.
 */
const OLDEST_FORMAT = '3.0.0';

/**
 * Work out which format version a file should be read as.
 *
 * @param {object} info the file's info block
 * @param {function} semver_compare (a, b) => -1 | 0 | 1
 * @returns {string} a version to compare migrations against
 */
function resolve_format_version(info, semver_compare) {
	if (info == null) {
		return OLDEST_FORMAT;
	}

	if (typeof info.format === 'string' && info.format.length > 0) {
		//written by a version that knows the difference
		return info.format;
	}

	var stated = typeof info.version === 'string' && info.version.length > 0
		? info.version
		: OLDEST_FORMAT;

	//RESCUE FOR FILES ALREADY SAVED. Anything claiming a version below miniPaint's own oldest was
	//written by this fork after the rebrand, when the field held the app version. Those files are
	//in the current format; reading them as ancient is what broke them in the first place.
	if (semver_compare(stated, OLDEST_FORMAT) < 0) {
		return FILE_FORMAT;
	}

	return stated;
}

export {FILE_FORMAT, OLDEST_FORMAT, resolve_format_version};
