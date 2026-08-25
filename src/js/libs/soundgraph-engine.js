/*
 * get-in-loser - https://github.com/TheMutantFactory/get-in-loser
 *
 * The main-thread half of the SoundGraph browser runtime, trimmed to what the Sound panel uses.
 * Adapted from soundgraph/editor-web/soundgraph.js (same author, same licence); the DSP itself is
 * sound/soundgraph.wasm running inside sound/soundgraph-worklet.js on the audio thread. There is
 * no DSP in JavaScript, here or anywhere.
 *
 * TRIMMED, NOT REWRITTEN. The upstream class also carries patch validation and parameter binding
 * for its editor; this panel plays fixed patches, so those left with the editor. What remains is
 * the lifecycle the worklet protocol needs: fetch the wasm bytes, hand them across the agent
 * boundary (a WebAssembly.Module cannot be cloned into an AudioWorkletGlobalScope - the attempt
 * fails SILENTLY, so bytes go over and the worklet compiles its own), then load/noteOn/noteOff.
 */

const encoder = new TextEncoder();

class SoundGraph_engine_class extends EventTarget {

	constructor() {
		super();
		this.context = null;
		this.node = null;
		this.bytes = null;
		this.ready = false;
	}

	/** Fetch and hold the wasm bytes. Safe before any user gesture - no AudioContext yet. */
	async load_module(url) {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error('could not fetch ' + url + ' (' + response.status + ')');
		}
		this.bytes = new Uint8Array(await response.arrayBuffer());
	}

	/** Must be called from a user gesture: browsers will not start audio otherwise. */
	async start(worklet_url) {
		if (this.context) {
			await this.context.resume();
			return;
		}

		this.context = new AudioContext();
		await this.context.audioWorklet.addModule(worklet_url);

		this.node = new AudioWorkletNode(this.context, 'soundgraph', {
			numberOfInputs: 0,
			numberOfOutputs: 1,
			outputChannelCount: [2],
		});
		this.node.port.onmessage = (event) => this.receive(event.data);
		this.node.connect(this.context.destination);

		//copied rather than transferred so a restart can send them again
		this.node.port.postMessage({type: 'init', bytes: this.bytes.slice(0)});
		await this.context.resume();
	}

	receive(message) {
		if (message.type === 'ready') {
			this.ready = true;
			this.dispatchEvent(new CustomEvent('ready'));
		}
		else if (message.type === 'loaded') {
			this.dispatchEvent(new CustomEvent('loaded', {detail: {ok: message.ok}}));
		}
		else if (message.type === 'meter') {
			//the worklet reports output peak once a frame; kept for level display and for tests,
			//which have no ears and verify sound by watching this number move
			this.dispatchEvent(new CustomEvent('meter', {detail: message.peak}));
		}
		else if (message.type === 'error') {
			this.dispatchEvent(new CustomEvent('engineerror', {detail: message.message}));
		}
	}

	load_patch(patch_text) {
		if (!this.node) {
			return;
		}
		const bytes = encoder.encode(patch_text);
		this.node.port.postMessage({type: 'load', patch: bytes}, [bytes.buffer]);
	}

	note_on(note, velocity) {
		if (this.node) {
			this.node.port.postMessage({type: 'noteOn', note: note, velocity: velocity == null ? 0.9 : velocity});
		}
	}

	note_off(note) {
		if (this.node) {
			this.node.port.postMessage({type: 'noteOff', note: note});
		}
	}

	all_notes_off() {
		if (this.node) {
			this.node.port.postMessage({type: 'allNotesOff'});
		}
	}

}

export default SoundGraph_engine_class;
