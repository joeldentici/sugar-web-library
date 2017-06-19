const {response, setHeader, mime} = require('./output.js');

/**
 *	Sugar.Combinators.Redirection
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Combinators for HTTP 3xx status responses.
 */

/**
 *	redirect :: URI -> WebPart
 *
 *	Temporarily moved response with body for browsers
 *	that do not perform automatic redirection.
 */
exports.redirect = function(url) {
	const msg = 'The requested resource has moved here';
	return setHeader('Location')(url)
		.arrow(mime('text/html'))
		.arrow(response(302)(`<html>
			<body>
				<a href="${url}">${msg}</a>
			</body>
		</html>`));
}

/**
 *	NOT_MODIFIED :: WebPart
 *
 *	HTTP 304 Not Modified Web Part response. The
 *	browser should load the requested resource from
 *	its cache.
 */
exports.NOT_MODIFIED = response(304)('');

/**
 *	MOVED_PERMANENTLY :: URI -> WebPart
 *
 *	HTTP 301 Moved Permanently response that
 *	indicates the resource has been moved
 */
exports.MOVED_PERMANENTLY = function(url) {
	return setHeader('Location')(url)
		.arrow(response(301)(''));
}

/**
 *	FOUND :: URI -> WebPart
 *
 *	HTTP 302 Moved Temporarily response that
 *	indicates the resource can temporarily be
 *	found at the provided uri.
 */
exports.FOUND = function(url) {
	return setHeader('Location')(url)
		.arrow(response(302)(''));
}