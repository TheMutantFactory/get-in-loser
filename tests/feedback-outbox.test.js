/**
 * The outbox exists so a report is never lost and never retried forever. These tests are the
 * evidence for that claim - each one is a way a naive queue loses feedback.
 */
import {
	OUTBOX_KEY,
	REJECTED_KEY,
	MAX_QUEUED,
	MAX_REJECTED,
	read_queue,
	enqueue,
	pending_count,
	drain,
} from '../src/js/libs/feedback-outbox.js';

const store = (initial = {}) => {
	const data = {...initial};
	return {
		getItem: (k) => (k in data ? data[k] : null),
		setItem: (k, v) => {
			data[k] = String(v);
		},
		data,
	};
};

const entry = (n) => ({envelope: {text: `report ${n}`, ts: `2026-08-22T18:00:0${n}Z`}, image: null});

/** A send that answers with a fixed script, and records what it was asked to send. */
const scripted = (outcomes) => {
	const seen = [];
	let i = 0;
	const fn = async (e) => {
		seen.push(e.envelope.text);
		return outcomes[Math.min(i++, outcomes.length - 1)];
	};
	fn.seen = seen;
	return fn;
};

describe('enqueue', () => {
	test('queues a report and counts it', () => {
		const s = store();
		enqueue(s, entry(1));

		expect(pending_count(s)).toBe(1);
	});

	test('drops the OLDEST when full, so the newest report always survives', () => {
		const s = store();
		for (let i = 0; i < MAX_QUEUED + 5; i++) {
			enqueue(s, entry(i));
		}

		const queue = read_queue(s, OUTBOX_KEY);
		expect(queue.length).toBe(MAX_QUEUED);
		expect(queue[queue.length - 1].envelope.text).toBe(`report ${MAX_QUEUED + 4}`);
		expect(queue[0].envelope.text).not.toBe('report 0');
	});

	test('a broken storage does not take the app down', () => {
		const broken = {
			getItem: () => {
				throw new Error('nope');
			},
			setItem: () => {
				throw new Error('quota');
			},
		};

		expect(() => enqueue(broken, entry(1))).not.toThrow();
		expect(pending_count(broken)).toBe(0);
	});
});

describe('read_queue', () => {
	test.each([
		['not json at all'],
		['{"not":"an array"}'],
		['[1,2,3]'],
		['null'],
	])('survives junk in the slot: %s', (raw) => {
		expect(read_queue(store({[OUTBOX_KEY]: raw}), OUTBOX_KEY)).toEqual([]);
	});
});

describe('drain', () => {
	test('a sent report leaves the queue', async () => {
		const s = store();
		enqueue(s, entry(1));

		const result = await drain(s, scripted(['sent']));

		expect(result.sent).toBe(1);
		expect(pending_count(s)).toBe(0);
	});

	test('a discarded [deleteme] report leaves too, and is never retried', async () => {
		const s = store();
		enqueue(s, entry(1));

		const result = await drain(s, scripted(['discarded']));

		expect(result.discarded).toBe(1);
		expect(pending_count(s)).toBe(0);
	});

	test('a 5xx is HELD, not lost', async () => {
		const s = store();
		enqueue(s, entry(1));

		const result = await drain(s, scripted(['retry']));

		expect(result.held).toBe(1);
		expect(pending_count(s)).toBe(1);
	});

	test('a thrown send is held, same as a 5xx', async () => {
		const s = store();
		enqueue(s, entry(1));

		const result = await drain(s, async () => {
			throw new Error('offline');
		});

		expect(result.held).toBe(1);
		expect(pending_count(s)).toBe(1);
	});

	test('a rejected report is set aside, never dropped and never sent again', async () => {
		const s = store();
		enqueue(s, entry(1));

		const result = await drain(s, scripted(['rejected']));

		expect(result.rejected).toBe(1);
		//gone from the outbox...
		expect(pending_count(s)).toBe(0);
		//...but still answerable afterwards
		expect(read_queue(s, REJECTED_KEY).length).toBe(1);
	});

	test('a held report is retried on the next drain', async () => {
		const s = store();
		enqueue(s, entry(1));

		await drain(s, scripted(['retry']));
		const second = await drain(s, scripted(['sent']));

		expect(second.sent).toBe(1);
		expect(pending_count(s)).toBe(0);
	});

	test('a rate limit holds THIS report and everything after it', async () => {
		const s = store();
		enqueue(s, entry(1));
		enqueue(s, entry(2));
		enqueue(s, entry(3));

		const send = scripted(['limited']);
		const result = await drain(s, send);

		//the window is per minute, so the rest would only collect 429s: do not even try
		expect(send.seen).toEqual(['report 1']);
		expect(result.held).toBe(3);
		expect(pending_count(s)).toBe(3);
	});

	test('order is preserved across a partial failure', async () => {
		const s = store();
		enqueue(s, entry(1));
		enqueue(s, entry(2));
		enqueue(s, entry(3));

		//first sends, second is held, third sends
		await drain(s, scripted(['sent', 'retry', 'sent']));

		const left = read_queue(s, OUTBOX_KEY);
		expect(left.map((e) => e.envelope.text)).toEqual(['report 2']);
	});

	test('mixed outcomes are all accounted for', async () => {
		const s = store();
		for (let i = 1; i <= 4; i++) enqueue(s, entry(i));

		const result = await drain(s, scripted(['sent', 'rejected', 'discarded', 'retry']));

		expect(result).toEqual({sent: 1, discarded: 1, rejected: 1, held: 1});
		expect(pending_count(s)).toBe(1);
	});

	test('an empty queue is a no-op', async () => {
		const s = store();
		const send = scripted(['sent']);

		expect(await drain(s, send)).toEqual({sent: 0, discarded: 0, rejected: 0, held: 0});
		expect(send.seen).toEqual([]);
	});

	test('the rejected pile is capped so it cannot grow without bound', async () => {
		const s = store();
		for (let i = 0; i < MAX_REJECTED + 5; i++) {
			enqueue(s, entry(i));
		}
		await drain(s, scripted(['rejected']));

		expect(read_queue(s, REJECTED_KEY).length).toBe(MAX_REJECTED);
	});

	test('nothing is sent twice in one drain', async () => {
		const s = store();
		for (let i = 1; i <= 3; i++) enqueue(s, entry(i));

		const send = scripted(['sent']);
		await drain(s, send);

		expect(send.seen).toEqual(['report 1', 'report 2', 'report 3']);
		expect(new Set(send.seen).size).toBe(3);
	});
});
