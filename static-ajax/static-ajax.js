/*
 * GitHub Pages has no WordPress backend, so admin-ajax.php and trp-ajax.php
 * are unavailable. Answer the requests the front end needs from saved files:
 *  - Forminator form markup: /static-ajax/form-<id>[-<lang>].json
 *  - TranslatePress translations of dynamic strings: /static-ajax/trp-<lang>.json
 * Form submissions cannot be stored, so they open WhatsApp with the request
 * written out as a message instead.
 */
(function ($) {
	if (!$ || !$.ajaxPrefilter) {
		return;
	}

	var WHATSAPP_NUMBER = '34621383059';

	var TEXT = {
		en: {
			title: 'New request from the website',
			calculator: 'Cleaning cost calculation',
			contact: 'Contact form',
			files: 'I will send the photos/files in this chat.',
			done: 'Your request has been prepared in WhatsApp. Please press <b>Send</b> in WhatsApp to deliver it to us.',
			link: 'Open WhatsApp'
		},
		es: {
			title: 'Nueva solicitud desde la web',
			calculator: 'Cálculo del coste de limpieza',
			contact: 'Formulario de contacto',
			files: 'Enviaré las fotos/archivos en este chat.',
			done: 'Su solicitud está preparada en WhatsApp. Pulse <b>Enviar</b> en WhatsApp para hacérnosla llegar.',
			link: 'Abrir WhatsApp'
		}
	};

	function text() {
		var trp = window.trp_data || {};
		var lang = trp.trp_current_language || document.documentElement.lang || 'en';
		return /^es/i.test(lang) ? TEXT.es : TEXT.en;
	}

	function clean(s) {
		return $.trim(String(s || '').replace(/\s+/g, ' ').replace(/\s*\*$/, ''));
	}

	// One "Label: value" line per filled-in field the visitor can see
	// (fields hidden by the form's conditions are skipped).
	function describeForm(form) {
		var lines = [];
		var hasFiles = false;
		$(form).find('.forminator-field').each(function () {
			var $field = $(this);
			var $col = $field.closest('.forminator-col');
			if ($field.closest('.forminator-hidden').length || ($col.length && $col.css('display') === 'none')) {
				return;
			}
			var label = clean($field.find('.forminator-label').first().text());
			var values = [];
			$field.find('select').each(function () {
				$(this).find('option:selected').each(function () {
					if ($(this).val() !== '') {
						values.push(clean($(this).text()));
					}
				});
			});
			$field.find('input[type=radio]:checked, input[type=checkbox]:checked').each(function () {
				var $label = $(this).closest('label');
				values.push(clean($label.find('.forminator-radio-label, .forminator-checkbox-label').text() || $label.text() || $(this).val()));
			});
			$field.find('input:not([type=radio]):not([type=checkbox]):not([type=hidden]):not([type=file]):not([type=button]):not([type=submit]), textarea').each(function () {
				var v = clean($(this).val());
				if (v === '') {
					return;
				}
				if ($col.hasClass('forminator-field-calculation')) {
					if (parseFloat(v.replace(',', '.')) === 0) {
						return;
					}
					v += ' €';
				}
				values.push(v);
			});
			if ($field.find('input[type=file]').filter(function () { return this.files && this.files.length; }).length) {
				hasFiles = true;
			}
			if (values.length) {
				lines.push((label ? '*' + label + ':* ' : '') + values.join(', '));
			}
		});
		return { lines: lines, hasFiles: hasFiles };
	}

	function whatsappUrl(form) {
		var t = text();
		var info = describeForm(form);
		var isCalculator = $(form).find('.forminator-field-calculation').length > 0;
		var message = ['*' + t.title + '* — ' + (isCalculator ? t.calculator : t.contact), ''].concat(info.lines);
		if (info.hasFiles) {
			message.push('', t.files);
		}
		return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message.join('\n'));
	}

	function submitToWhatsapp(options, formId) {
		var form = document.getElementById('forminator-module-' + formId);
		if (!form) {
			return;
		}
		var url = whatsappUrl(form);
		var t = text();
		// Runs inside the submit click, so the browser allows the new tab.
		var win = window.open(url, '_blank');
		if (win) {
			win.opener = null;
		}
		var message = '<p>' + t.done + '</p><p><a href="' + url + '" target="_blank" rel="noopener">' + t.link + '</a></p>';

		// Answer Forminator as the backend would on success.
		options.url = '/static-ajax/submit.json';
		options.type = 'GET';
		options.data = null;
		options.dataType = 'json';
		options.dataFilter = function () {
			return JSON.stringify({ success: true, data: { success: true, message: message } });
		};
		if (!win) {
			window.location.href = url;
		}
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
		if (window.FormData && options.data instanceof window.FormData) {
			var action = String(options.data.get('action') || '');
			var formId = String(options.data.get('form_id') || '');
			if (/^forminator_submit_form/.test(action) && /^\d+$/.test(formId)) {
				submitToWhatsapp(options, formId);
			}
			return;
		}
		var p = params(typeof options.data === 'string' ? options.data : '');

		if (p.action === 'forminator_load_form' && /^\d+$/.test(p.id || '')) {
			// The backend renders forms already translated for non-default languages.
			var trp = window.trp_data || {};
			var lang = trp.trp_current_language && trp.trp_current_language !== trp.trp_original_language ? '-' + trp.trp_current_language : '';
			options.url = '/static-ajax/form-' + p.id + lang + '.json';
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
