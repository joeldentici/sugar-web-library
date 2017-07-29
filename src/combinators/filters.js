const {response} = require('./output.js');
const {Async, Utility} = require('monadic-js');
const {zip} = Utility;
const path = require('path');

/**
 *	Sugar.Combinators.Filters
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Combinators for filtering requests by
 *	the information contained within them.
 */


/**
 *	test :: (HttpContext -> boolean) -> string -> WebPart
 *
 *	Useful to create combinators that test the current
 *	request context for some property to filter requests.
 *
 *	If the predicate returns true for a request, then the
 *	composition path on the returned combinator will be
 *	followed. Otherwise, the returned combinator will fail
 *	to match the request and signal an error.
 */
function test(pred, err) {
	return function(context) {
		if (pred(context)) {
			return Async.unit(context);
		}
		else {
			return Async.fail(err);
		}
	}
}

/**
 *	method :: string -> WebPart
 *
 *	Create a WebPart that filters on an HTTP Method.
 */
function method(m) {
	return test(ctx => ctx.request.method === m,
	 "Not " + m + " request");
}

/**
 *	GET :: WebPart
 *
 *	Filters out requests that are not HTTP GET
 */
exports.GET = method("GET");
/**
 *	PUT :: WebPart
 *
 *	Filters out requests that are not HTTP PUT
 */
exports.PUT = method("PUT");
/**
 *	DELETE :: WebPart
 *
 *	Filters out requests that are not HTTP DELETE
 */
exports.DELETE = method("DELETE");
/**
 *	POST :: WebPart
 *
 *	Filters out requests that are not HTTP POST
 */
exports.POST = method("POST");
/**
 *	HEAD :: WebPart
 *
 *	Filters out requests that are not HTTP HEAD
 */
exports.HEAD = method("HEAD");

function toPath(str) {
	return path.normalize(path.join(str, '/.'));
}

/**
 *	path :: string -> WebPart
 *
 *	Filters out requests whose URI does not match
 *	the provided URI.
 */
exports.path = function(pathStr) {
	return test(ctx => toPath(ctx.request.url) 
		=== toPath(pathStr),
	 "Path match failure");
}

/**
 *	pathStarts :: string -> WebPart
 *
 *	Filters out requests whose URI does not start
 *	with the provided URI.
 */
exports.pathStarts = function(pathStr) {
	return test(
		ctx => toPath(ctx.request.url)
			.startsWith(toPath(pathStr)),
		'Path match failure');
}

/**
 *	extract :: string -> string -> [int|number|string]
 *
 *	Extracts arguments from a text path that match
 *	parameters in a pattern path, in the style of
 *	scanf.
 */
function extract(pattern, text) {
	const extractor = {
		'%d': x => {
			const int = Number.parseInt(x);
			const dub = Number(x);
			if (int === dub && !isNaN(int))
				return int;
		},
		'%f': x => {
			const dub = Number(x);
			if (!isNaN(dub))
				return dub;
		},
		'%s': x => x
	}

	const pt = zip(pattern.split("/"), text.split("/"));

	//extract arguments
	const res = pt
		.map(([p, t]) => extractor[p] && extractor[p](t))
		.filter(x => x);

	//count the number of arguments that should be extracted
	const num = pt
		.map(([p]) => extractor[p])
		.filter(x => x)
		.length;

	//make sure each part of pattern path is a pattern, or it
	//matches the text exactly
	const good = pt.every(([p, t]) => extractor[p] || p === t);

	//this should imply the pattern and text match up
	if (num === res.length && good) {
		return res;
	}
	else {
		return null;
	}
}

/**
 *	pathMatch :: string -> (...int|number|string -> WebPart) -> WebPart
 *
 *	Matches a pattern in the style of scanf in the request's
 *	path, extracts the arguments from the path, and passes them to
 *	the provided function to get the resulting web part.
 */
exports.pathMatch = function(pattern, mapper) {
	return function(context) {
		const values = extract(pattern, context.request.url);
		if (values === null)
			return Async.fail("Path does not match");
		else
			return mapper.apply(null, values)(context);
	}
}

/**
 *	choose :: [WebPart] -> WebPart
 *
 *	Picks from a list of WebParts by choosing the first WebPart that
 *	accepts the HttpContext provided.
 */
exports.choose = function(...options) {
	//TODO: Should we implement this in terms of Function.prototype.or?
	function tryOptions(context, options) {
		if (options.length)
			return Async.try(options[0](context))
						.catch(e => tryOptions(context, options.slice(1)));
		else
			return Async.fail("No choose option matched");
	}

	return function(context) {
		return tryOptions(context, options);
	}
}

