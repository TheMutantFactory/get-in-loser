/**
 * Deciding which migrations to run is the difference between a file that loads and one that
 * silently does not. These pin the rule down, including the case that broke: this fork's own
 * version number sorting below every migration milestone.
 */
import semver_compare from 'semver-compare';
import {FILE_FORMAT, OLDEST_FORMAT, resolve_format_version} from '../src/js/libs/file-format.js';

const resolve = (info) => resolve_format_version(info, semver_compare);

/** the milestones load_json migrates against */
const MILESTONES = ['4.0.0', '4.5.0', '4.8.0', '4.11.0'];
const runs_migrations = (version) => MILESTONES.some((m) => semver_compare(version, m) < 0);

describe('resolve_format_version', () => {
	test('prefers an explicit format field', () => {
		expect(resolve({format: '4.14.3', version: '0.1.23'})).toBe('4.14.3');
	});

	test('THE BUG: a file written by this fork must not be read as ancient', () => {
		//0.1.23 sorts below every milestone, so before the fix every migration ran and mangled the
		//layers - forcing type "image" onto a brush layer, whose data is an array of points
		expect(semver_compare('0.1.23', '4.0.0')).toBeLessThan(0);
		expect(resolve({version: '0.1.23'})).toBe(FILE_FORMAT);
		expect(runs_migrations(resolve({version: '0.1.23'}))).toBe(false);
	});

	test('files this app writes now run no migrations at all', () => {
		expect(runs_migrations(resolve({format: FILE_FORMAT, version: '0.1.23'}))).toBe(false);
	});

	test('genuine old miniPaint files still migrate', () => {
		//these need every fix, and must keep getting them
		expect(resolve({version: '3.0.0'})).toBe('3.0.0');
		expect(runs_migrations(resolve({version: '3.0.0'}))).toBe(true);
		expect(resolve({version: '4.2.0'})).toBe('4.2.0');
		expect(runs_migrations(resolve({version: '4.2.0'}))).toBe(true);
	});

	test('a recent miniPaint file runs none', () => {
		expect(runs_migrations(resolve({version: '4.14.3'}))).toBe(false);
	});

	test('a file naming no version at all is treated as the oldest', () => {
		expect(resolve({})).toBe(OLDEST_FORMAT);
		expect(resolve(null)).toBe(OLDEST_FORMAT);
		expect(runs_migrations(resolve({}))).toBe(true);
	});

	test('format wins even when it disagrees with version', () => {
		//the point of splitting them: the app version may go anywhere without moving the format
		expect(resolve({format: '4.14.3', version: '99.0.0'})).toBe('4.14.3');
		expect(resolve({format: '3.0.0', version: '4.14.3'})).toBe('3.0.0');
	});

	test('ignores a blank or non-string field rather than trusting it', () => {
		expect(resolve({format: '', version: '4.2.0'})).toBe('4.2.0');
		expect(resolve({format: 42, version: '4.2.0'})).toBe('4.2.0');
		expect(resolve({version: 7})).toBe(OLDEST_FORMAT);
	});

	test('the declared format is one no migration touches', () => {
		//if FILE_FORMAT is ever bumped below a milestone, saved files start migrating themselves
		expect(runs_migrations(FILE_FORMAT)).toBe(false);
	});
});
