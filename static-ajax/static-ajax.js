/*
 * GitHub Pages has no WordPress backend, so admin-ajax.php and trp-ajax.php
 * are unavailable. Answer the requests the front end needs from saved files:
 *  - Forminator form markup: /static-ajax/form-<id>.json
 *  - TranslatePress translations of dynamic strings: /static-ajax/trp-<lang>.json
 */
(function ($) {
	if (!$ || !$.ajaxPrefilter) {
		return;
	}

	// Strings TranslatePress asked for, kept for rebuilding the dictionary.
	window.staticAjaxTrpOriginals = window.staticAjaxTrpOriginals || [];

	function params(data) {
		var out = {};
		(data || '').split('&').forEach(function (pair) {
			if (!pair) {
				return;
			}
			var i = pair.indexOf('=');
			var key = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
			out[key] = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
		});
		return out;
	}

	$.ajaxPrefilter(function (options) {
		if (!/(admin-ajax|trp-ajax)\.php/.test(options.url || '')) {
			return;
		}
		var p = params(typeof options.data === 'string' ? options.data : '');

		if (p.action === 'forminator_load_form' && /^\d+$/.test(p.id || '')) {
			options.url = '/static-ajax/form-' + p.id + '.json';
			options.type = 'GET';
			options.data = '';
			options.dataType = 'json';
			return;
		}

		if (/^trp_get_translations_/.test(p.action || '') && /^[A-Za-z_]+$/.test(p.language || '')) {
			var originals = [];
			try {
				originals = JSON.parse(p.originals || '[]');
			} catch (e) {}
			Array.prototype.push.apply(window.staticAjaxTrpOriginals, originals);
			var wanted = {};
			originals.forEach(function (s) {
				wanted[String(s).trim()] = true;
			});
			options.url = '/static-ajax/trp-' + p.language + '.json';
			options.type = 'GET';
			options.data = '';
			options.dataType = 'json';
			options.dataFilter = function (raw) {
				var all = [];
				try {
					all = JSON.parse(raw);
				} catch (e) {}
				return JSON.stringify(all.filter(function (entry) {
					return wanted[String(entry.original).trim()];
				}));
			};
		}
	});
})(window.jQuery);
