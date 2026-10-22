/*
 * GitHub Pages has no WordPress backend, so admin-ajax.php is unavailable.
 * Forminator loads its forms through that endpoint; serve the saved
 * responses from /forminator-static/form-<id>.json instead.
 */
(function ($) {
	if (!$ || !$.ajaxPrefilter) {
		return;
	}
	$.ajaxPrefilter(function (options) {
		var data = typeof options.data === 'string' ? options.data : '';
		if (!/admin-ajax\.php/.test(options.url || '') || !/(^|&)action=forminator_load_form(&|$)/.test(data)) {
			return;
		}
		var id = (data.match(/(^|&)id=(\d+)/) || [])[2];
		if (!id) {
			return;
		}
		options.url = '/forminator-static/form-' + id + '.json';
		options.type = 'GET';
		options.data = '';
		options.dataType = 'json';
	});
})(window.jQuery);
