/*
 * Get in loser - smart folder
 *
 * Lets the user pick a folder that Get in loser reads from and writes to. The
 * folder holds a single `get-in-loser.json` with the app's configuration and a
 * session history. Reconnecting a folder that was used before restores that
 * config/history. Uses the File System Access API (Chromium) + IndexedDB to
 * remember the folder handle between sessions.
 */
import config from './../config.js';
import Helper_class from './helpers.js';
import alertify from './../../../node_modules/alertifyjs/build/alertify.min.js';

const CONFIG_FILE = 'get-in-loser.json';
const HANDLE_KEY = 'smart_folder_handle';
const ENABLED_COOKIE = 'smart_folder';
const DB_NAME = 'get_in_loser';
const STORE = 'kv';

//--- tiny IndexedDB key/value store (holds the directory handle) ---
function idb_open() {
	return new Promise(function (resolve, reject) {
		var req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
		req.onsuccess = function () { resolve(req.result); };
		req.onerror = function () { reject(req.error); };
	});
}
async function idb_set(key, value) {
	var db = await idb_open();
	return new Promise(function (resolve, reject) {
		var tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put(value, key);
		tx.oncomplete = function () { resolve(); };
		tx.onerror = function () { reject(tx.error); };
	});
}
async function idb_get(key) {
	var db = await idb_open();
	return new Promise(function (resolve, reject) {
		var tx = db.transaction(STORE, 'readonly');
		var rq = tx.objectStore(STORE).get(key);
		rq.onsuccess = function () { resolve(rq.result); };
		rq.onerror = function () { reject(rq.error); };
	});
}
async function idb_del(key) {
	var db = await idb_open();
	return new Promise(function (resolve, reject) {
		var tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).delete(key);
		tx.oncomplete = function () { resolve(); };
		tx.onerror = function () { reject(tx.error); };
	});
}

class Smart_folder_class {

	constructor() {
		this.Helper = new Helper_class();
		this.handle = null; // FileSystemDirectoryHandle
		this.data = null;   // parsed get-in-loser.json
	}

	is_supported() {
		return typeof window.showDirectoryPicker === 'function';
	}
	is_connected() {
		return this.handle != null;
	}
	is_enabled() {
		return this.Helper.getCookie(ENABLED_COOKIE) == 1;
	}

	//--- header toggle button ------------------------------------------------

	init_toggle() {
		var _this = this;
		var btn = document.getElementById('smart_folder_toggle');
		if (!btn) return;
		this.toggle_el = btn;
		btn.addEventListener('click', function () {
			//a real click, so the folder picker keeps its user gesture
			if (_this.is_connected()) _this.disable();
			else _this.enable();
		});
		this.update_toggle();
	}

	update_toggle() {
		var btn = this.toggle_el || document.getElementById('smart_folder_toggle');
		if (!btn) return;
		var on = this.is_connected();
		btn.setAttribute('aria-pressed', on ? 'true' : 'false');
		btn.setAttribute('title', on
			? 'Smart folder: on' + (this.handle ? ' (' + this.handle.name + ')' : '') + ' — click to disconnect'
			: 'Smart folder: off — click to pick a folder');
	}

	//--- toggle entry points -------------------------------------------------

	async enable() {
		if (!this.is_supported()) {
			alertify.error('Smart folder needs a Chromium browser (Chrome/Edge). Not supported here.');
			return false;
		}
		var dir;
		try {
			dir = await window.showDirectoryPicker({ id: 'gil-smart-folder', mode: 'readwrite' });
		} catch (e) {
			return false; // user cancelled the picker
		}
		if (!(await this.ensure_permission(dir))) {
			alertify.error('Smart folder needs read + write permission to that folder.');
			return false;
		}
		this.handle = dir;
		try { await idb_set(HANDLE_KEY, dir); } catch (e) { /* handle still works this session */ }
		this.Helper.setCookie(ENABLED_COOKIE, 1);
		await this.connect_folder(dir);
		return true;
	}

	async disable() {
		this.handle = null;
		this.data = null;
		this.Helper.setCookie(ENABLED_COOKIE, 0);
		try { await idb_del(HANDLE_KEY); } catch (e) { /* ignore */ }
		this.update_toggle();
		alertify.success('Smart folder disabled. Get in loser will no longer read or write to the folder.');
	}

	//--- restore on startup --------------------------------------------------

	async restore() {
		if (!this.is_enabled() || !this.is_supported()) return;
		var dir;
		try { dir = await idb_get(HANDLE_KEY); } catch (e) { return; }
		if (!dir) return;
		var perm = 'denied';
		try { perm = await dir.queryPermission({ mode: 'readwrite' }); } catch (e) { return; }
		if (perm === 'granted') {
			this.handle = dir;
			await this.connect_folder(dir);
		} else {
			alertify.error("Smart folder “" + dir.name + "” needs reconnecting — re-enable it in Settings.");
		}
	}

	//--- folder connect: read/create config + append history -----------------

	async connect_folder(dir) {
		this.update_toggle();
		var existing = await this.read_config(dir);
		if (existing) {
			this.data = existing;
			this.apply_config(existing.config);
			var seen = (existing.history || []).length;
			existing.history = (existing.history || []).concat([{ session: new Date().toISOString() }]);
			existing.updated = new Date().toISOString();
			try { await this.write_config(dir, existing); } catch (e) { /* read-only fallback */ }
			alertify.success("Reconnected to smart folder “" + dir.name + "” — it remembers " +
				seen + " earlier session" + (seen === 1 ? '' : 's') + ". History and settings restored.");
		} else {
			this.data = {
				app: 'get-in-loser',
				version: 1,
				updated: new Date().toISOString(),
				config: this.snapshot_config(),
				history: [{ session: new Date().toISOString() }],
			};
			await this.write_config(dir, this.data);
			alertify.success("Smart folder set to “" + dir.name + "”. Get in loser will read and write its history and settings here.");
		}
	}

	async ensure_permission(dir) {
		if ((await dir.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
		return (await dir.requestPermission({ mode: 'readwrite' })) === 'granted';
	}

	async read_config(dir) {
		try {
			var fh = await dir.getFileHandle(CONFIG_FILE, { create: false });
			var file = await fh.getFile();
			var json = JSON.parse(await file.text());
			return (json && json.app === 'get-in-loser') ? json : null;
		} catch (e) {
			return null; // not found / invalid
		}
	}

	async write_config(dir, data) {
		var fh = await dir.getFileHandle(CONFIG_FILE, { create: true });
		var w = await fh.createWritable();
		await w.write(JSON.stringify(data, null, '\t'));
		await w.close();
	}

	//--- config snapshot / apply --------------------------------------------

	snapshot_config() {
		var _this = this;
		var out = {};
		['theme', 'transparency', 'snap', 'guides', 'thick_guides'].forEach(function (k) {
			out[k] = _this.Helper.getCookie(k);
		});
		return out;
	}

	apply_config(cfg) {
		if (!cfg) return;
		var _this = this;
		//persist restored settings as cookies (read on next use)
		Object.keys(cfg).forEach(function (k) {
			if (cfg[k] !== null && cfg[k] !== undefined) _this.Helper.setCookie(k, cfg[k]);
		});
		//apply the theme immediately (most visible), mirroring Base_gui.change_theme
		if (cfg.theme) {
			for (var i in config.themes) {
				document.body.classList.remove('theme-' + config.themes[i]);
			}
			document.body.classList.add('theme-' + cfg.theme);
		}
	}
}

export default new Smart_folder_class();
