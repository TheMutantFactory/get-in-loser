/*
 * Get in loser - https://github.com/TheMutantFactory/get-in-loser
 * Based on miniPaint by ViliusL.
 */
import Dialog_class from './../../libs/popup.js';
import changelog_md from './../../../../CHANGELOG.md';

class Help_changelog_class {

	constructor() {
		this.POP = new Dialog_class();
	}

	changelog() {
		// the dialog title already says "Changelog"; drop the file's leading H1
		var body = changelog_md.replace(/^\s*#\s+[^\n]*\n?/, '');
		var settings = {
			title: 'Changelog',
			params: [
				{ title: '', html: '<div class="markdown_body">' + this.render_markdown(body) + '</div>' }
			],
			on_finish: function () { }
		};
		this.POP.show(settings);
	}

	/**
	 * Minimal, safe markdown -> HTML: headings, bold, italic, inline code,
	 * unordered lists, horizontal rules, links, paragraphs. Escapes HTML first
	 * so raw markup in the source can never inject.
	 */
	render_markdown(md) {
		function esc(s) {
			return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		}
		function inline(s) {
			return esc(s)
				.replace(/`([^`]+)`/g, '<code>$1</code>')
				.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
				.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
				.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
		}

		var lines = md.replace(/\r\n/g, '\n').split('\n');
		var html = '';
		var in_list = false;
		function close_list() { if (in_list) { html += '</ul>'; in_list = false; } }

		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if (/^\s*$/.test(line)) { close_list(); continue; }

			var heading = line.match(/^(#{1,4})\s+(.*)$/);
			if (heading) { close_list(); var n = heading[1].length; html += '<h' + n + '>' + inline(heading[2]) + '</h' + n + '>'; continue; }

			if (/^\s*---+\s*$/.test(line)) { close_list(); html += '<hr>'; continue; }

			if (/^\s*[-*]\s+/.test(line)) {
				if (!in_list) { html += '<ul>'; in_list = true; }
				html += '<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>';
				continue;
			}

			close_list();
			html += '<p>' + inline(line) + '</p>';
		}
		close_list();
		return html;
	}

}

export default Help_changelog_class;
