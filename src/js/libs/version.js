/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * What version is running, from the one place that knows.
 *
 * WHY THIS IS NOT THE `VERSION` GLOBAL. That global comes from webpack's DefinePlugin, which reads
 * package.json ONCE, when the config is evaluated - that is, when the dev server starts. Bump the
 * version and every rebuild after it still reports the old number, because the config is not
 * re-evaluated. The build is fresh and the label is not.
 *
 * This cost real time: a session spent testing a fix while the app displayed a version from three
 * releases earlier, which made it look as though the new code was not loading at all. Worse, that
 * same stale number went into saved files and into every feedback report - so a bug report could
 * name a version that was never the one running.
 *
 * Importing package.json makes it a module dependency, so webpack re-reads it whenever it changes,
 * and one import means one answer everywhere.
 */

import pkg from './../../../package.json';

/** The running version, e.g. "0.1.29". */
const VERSION = typeof pkg.version === 'string' ? pkg.version : '0.0.0';

/** With the leading v, for display. */
const VERSION_LABEL = 'v' + VERSION;

export {VERSION, VERSION_LABEL};
export default VERSION;
