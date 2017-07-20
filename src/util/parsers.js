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
	return (query || '')
		.split("&")
		.map(x => x.split("="))
		.reduce((acc, x) => {
			acc[x[0]] = x[1];
			return acc;
		}, {});
}

const parsePlain = exports.parsePlain = function(form) {
	return (form || '')
		.split('&')
		.map(x => x.split('='))
		.reduce((acc, x) => {
			acc[x[0]] = x[1].replace(/\+/g, ' ');
			return acc;
		}, {});
}

/**
 *	parseUrl :: string -> (string, Map string string)
 *
 *	Takes a URI and splits it into the URI and query string
 *	components, and parses the query string.
 */
exports.parseUrl = function(input) {
	const [url, query] = input.split("?");

	const queryFields = parseQuery(query);

	return [url, queryFields];	
}