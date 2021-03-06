/**
 *	Sugar.Utility.Parsers
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	This module provides functions to parse
 *	incoming request data.
 *
 *	Node's http module already does most of the parsing of the HTTP request,
 *	but these functions allow us to do some of the additional
 *	parsing that allows providing the application developer with request
 *	parameters (form data, query string data, etc.).
 */

/**
 *	parseQuery :: string -> Map string string
 *
 *	Takes a URI Encoded form and parses it into
 *	a map of key-value string pairs (actually an object).
 *
 *	TODO: This needs to decode characters, consider using
 *	Node query module.
 */
const parseQuery = exports.parseQuery = function(query) {
	return query ? query
		.split("&")
		.map(x => x.split("="))
		.reduce((acc, x) => {
			acc[x[0]] = x[1];
			return acc;
		}, {}) : {};
}

/**
 *	parsePlain :: string -> Map string string
 *
 *	Parses a text/plain encoded form, which is the same
 *	as parsing a URI encoded form, but without decoding
 *	any special symbols (I believe this is someone trying
 *	to get unicode in with a charset (utf-8) instead of
 *	encoding the unicode to ascii).
 *
 *	This is not widely used and only implemented because
 *	a few other servers implement it.
 */
const parsePlain = exports.parsePlain = function(form) {
	return form ? form
		.split('&')
		.map(x => x.split('='))
		.reduce((acc, x) => {
			acc[x[0]] = x[1].replace(/\+/g, ' ');
			return acc;
		}, {}) : {};
}

/**
 *	parseUrl :: string -> (string, Map string string)
 *
 *	Takes a URI and splits it into the URI and query string
 *	components, and parses the query string.
 */
exports.parseUrl = function(input) {
	const [url, query] = input ? input.split("?") : ['', ''];

	const queryFields = parseQuery(query);

	return [url, queryFields];	
}