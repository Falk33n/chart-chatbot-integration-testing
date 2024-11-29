import hljs from 'highlight.js';
import markdownit from 'markdown-it';

export const md: markdownit = markdownit({
	highlight: (str, lang) => {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return `<pre><code class="hljs">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
			} catch (err) {
				throw new Error(`Failed to highlight code: ${err}`);
			}
		}

		return `<pre><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`;
	}
});
