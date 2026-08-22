/*
 * get-in-loser - derivative of miniPaint (https://github.com/viliusle/miniPaint)
 *
 * The outbox. Pure of the network but not of storage - it takes a storage-shaped object and a
 * send function, so the whole drain is testable without either. See tests/feedback-outbox.test.js.
 *
 * THE OUTBOX IS THE SOURCE OF TRUTH, NOT THE REQUEST. A browser app goes offline, gets closed
 * mid-send, and sits behind captive portals. Nothing is removed from the queue until the server
 * acknowledges it, and a report refused as malformed is set aside rather than dropped, because
 * "it ate my feedback" should be answerable afterwards.
 */

/** Queue of envelopes waiting to be sent. */
const OUTBOX_KEY = 'feedback_outbox';

/** Reports the server refused as malformed. Kept, never deleted. */
const REJECTED_KEY = 'feedback_rejected';

/**
 * How many reports to hold. A browser that never reaches the server must not grow localStorage
 * without bound, and localStorage throwing QuotaExceeded would take the app's other saved state
 * down with it. Oldest is dropped first: a stale report about an old build is worth less than a
 * fresh one, and this is the one place where dropping is the lesser evil.
 */
const MAX_QUEUED = 50;

/** Rejected reports worth keeping around to answer "did it send?". */
const MAX_REJECTED = 20;

/**
 * @param {object} storage localStorage-shaped
 * @param {string} key
 * @returns {array} always an array, even if the slot holds junk
 */
function read_queue(storage, key) {
	try {
		var raw = storage.getItem(key);
		if (!raw) {
			return [];
		}
		var parsed = JSON.parse(raw);

		return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e === 'object') : [];
	}
	catch (e) {
		//corrupt or unreadable. An empty queue loses reports; throwing loses the whole feature.
		return [];
	}
}

/**
 * @param {object} storage localStorage-shaped
 * @param {string} key
 * @param {array} entries
 * @returns {boolean} whether the write landed
 */
function write_queue(storage, key, entries) {
	try {
		storage.setItem(key, JSON.stringify(entries));

		return true;
	}
	catch (e) {
		return false;
	}
}

/**
 * Add a report to the queue.
 *
 * @param {object} storage localStorage-shaped
 * @param {object} entry keys: envelope, image (data URL or null)
 * @returns {array} the queue as it now stands
 */
function enqueue(storage, entry) {
	var queue = read_queue(storage, OUTBOX_KEY);
	queue.push(entry);

	//oldest first, so the newest report always survives
	while (queue.length > MAX_QUEUED) {
		queue.shift();
	}

	write_queue(storage, OUTBOX_KEY, queue);

	return queue;
}

/**
 * @param {object} storage localStorage-shaped
 * @returns {number} reports still waiting to be sent
 */
function pending_count(storage) {
	return read_queue(storage, OUTBOX_KEY).length;
}

/**
 * Drain the queue.
 *
 * @param {object} storage localStorage-shaped
 * @param {function} send async (entry) => outcome string from classify_response
 * @returns {object} keys: sent, discarded, rejected, held
 */
async function drain(storage, send) {
	var queue = read_queue(storage, OUTBOX_KEY);

	if (queue.length === 0) {
		//nothing to do, and nothing to write. Every app start calls this, and rewriting an empty
		//slot each time is a pointless touch of storage the app shares with quicksave.
		return {sent: 0, discarded: 0, rejected: 0, held: 0};
	}

	var keep = [];
	var rejected = [];
	var result = {sent: 0, discarded: 0, rejected: 0, held: 0};
	var limited = false;

	for (var i = 0; i < queue.length; i++) {
		var entry = queue[i];

		if (limited) {
			//the window is per minute, so everything after a 429 would only collect 429s too.
			//Position in the queue is preserved.
			keep.push(entry);
			result.held++;
			continue;
		}

		var outcome;
		try {
			outcome = await send(entry);
		}
		catch (e) {
			//a thrown send is a transport failure, which is the world's problem, not the report's
			outcome = 'retry';
		}

		if (outcome === 'sent') {
			result.sent++;
		}
		else if (outcome === 'discarded') {
			result.discarded++;
		}
		else if (outcome === 'rejected') {
			rejected.push(entry);
			result.rejected++;
		}
		else if (outcome === 'limited') {
			keep.push(entry);
			result.held++;
			limited = true;
		}
		else {
			keep.push(entry);
			result.held++;
		}
	}

	write_queue(storage, OUTBOX_KEY, keep);

	if (rejected.length > 0) {
		var kept = read_queue(storage, REJECTED_KEY).concat(rejected);
		while (kept.length > MAX_REJECTED) {
			kept.shift();
		}
		write_queue(storage, REJECTED_KEY, kept);
	}

	return result;
}

export {
	OUTBOX_KEY,
	REJECTED_KEY,
	MAX_QUEUED,
	MAX_REJECTED,
	read_queue,
	write_queue,
	enqueue,
	pending_count,
	drain,
};
