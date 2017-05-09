const {zip} = require('../util/misc.js');
const {response} = require('./output.js');

/**
 *	combinators/filters
 *
 *	Combinators for filtering requests by
 *	the information contained within them.
 */

/**
 *	test :: JsonPath -> string -> string -> HttpContext -> Promise HttpContext
 *
 *	Creates Web Parts that test the HttpContext for some criteria.
 *
 *	It is expected that the property found by following the provided
 *	path in the input HttpContext will be equal to the provided expected
 *	value for the property. If it is, then the context is propagated. If not,
 *	the provided error message is propagated.
 */
function test(jsonPath, expected, err) {
	jsonPath = jsonPath.split(".");
	return function(context) {
		//resolve the json path in context
		actual = context;
		for (let x of jsonPath) {
			if (actual === null) break;
			actual = actual[x];
		}

		//couldn't resolve path
		if (actual === null)
			return Promise.reject("Bad JSON Path in test: " + jsonPath);
		//test passed
		else if (actual === expected)
			return Promise.resolve(context);
		//test failed
		else
			return Promise.reject(err);
	}
}

/** Combinator using test on the HTTP request method **/
function method(m) {
	return test("request.method", m, "Not " + m + " request");
}

/** Combinators to filter by HTTP method **/
exports.GET = method("GET");
exports.PUT = method("PUT");
exports.DELETE = method("DELETE");
exports.POST = method("POST");
exports.HEAD = method("HEAD");

/** Combinator to filter by the URI **/
exports.path = function(pathStr) {
	return test("request.url", pathStr, "Path match failure");
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
			if (int === dub && int !== NaN)
				return int;
		},
		'%f': x => {
			const dub = Number(x);
			if (dub !== NaN)
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
 *	Matches a pattern in the style of scanf in the Web Context's
 *	path, extracts the arguments from the path, and passes them to
 *	the provided function to get the resulting web part.
 */
exports.pathMatch = function(pattern, mapper) {
	return function(context) {
		const values = extract(pattern, context.request.url);
		if (values === null)
			return Promise.reject("Path does not match");
		else
			return mapper.apply(null, values)(context);
	}
}

/**
 *	choose :: [WebPart] -> WebPart
 *	choose :: [HttpContext -> Promise HttpContext] -> HttpContext -> Promise HttpContext
 *
 *	Picks from a list of WebParts by choosing the first WebPart that
 *	accepts the HttpContext provided.
 */
exports.choose = function(...options) {
	function tryOptions(context, options) {
		if (options.length)
			return options[0](context).then(
				x => x,
				x => tryOptions(context, options.slice(1)));
		else
			return Promise.reject("No choose option matched");
	}

	return function(context) {
		return tryOptions(context, options);
	}
}

