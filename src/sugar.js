const monadic = require('monadic-js');
monadic.loadDo('.ejs');

/**
 *	Sugar
 *	written by Joel Dentici
 *	on 6/18/2017
 *	
 *	Sugar exports all the submodules used by the web application
 *	library.
 *
 *	A few useful functions to dynamically use WebPart combinators
 *	are provided in this module.
 */


/**
 *	WebPart :: HttpContext -> Async e HttpContext
 *
 *	WebPart is the type of combinators used in
 *	Sugar.
 */


/*
HttpRequest = {
	version: string,
	url: string,
	host: string,
	method: string,
	headers: object,
	query: object,
	form: Form,
	body: ReadableStream
}

Form = Map string (string | FileUpload)

FileUpload = {
	name: string, 
	stream: ReadableStream
}

File = {
	size: int,
	stream: ReadableStream,
	name: string,
}

HttpResponse = {
	status: int,
	headers: object,
	content: ReadableStream
}

HttpContext = {
	request: HttpRequest,
	response: HttpResponse
}


*/


/**
 *	request :: (HttpRequest -> WebPart) -> WebPart
 *
 *	Allows application code to easily get access to
 *	an outstanding HttpRequest and return a WebPart
 *	based off of it.
 */
exports.request = function(fn) {
	return function(context) {
		return fn(context.request)(context);
	}
}

/**
 *	context :: (HttpContext -> WebPart) -> WebPart
 *
 *	See request, but lets the application inspect
 *	the context instead.
 */
exports.context = function(fn) {
	return function(context) {
		return fn(context)(context);
	}
}

/**
 *	asyncRequest :: (HttpRequest -> Async e WebPart) -> WebPart
 *
 *	Like request, but the function provided returns a promise
 *	for a WebPart instead of a WebPart. This allows the function
 *	to perform asynchronous handling of the HttpRequest (such as
 *	loading a file, making some network request, etc.), and only
 *	worry about calling a combinator to construct a WebPart, and
 *	not have to worry about piping the context in themselves.
 */
exports.asyncRequest = function(fn) {
	return function(context) {
		return fn(context.request).bind(f => f(context));
	}
}

/**
 *	asyncContext :: (HttpContext -> Async WebPart) -> WebPart
 *
 *	See asyncRequest
 */
exports.asyncContext = function(fn) {
	return function(context) {
		return fn(context).bind(f => f(context));
	}
}

exports.Server = require('./server/index.js');
exports.Combinators = {
	Authentication: require('./combinators/authentication.js'),
	Compression: require('./combinators/compression.js'),
	CQRS: require('./combinators/cqrs.ejs'),
	Events: require('./combinators/events.js'),
	Files: require('./combinators/files.js'),
	Filters: require('./combinators/filters.js'),
	Intermediate: require('./combinators/intermediate.js'),
	Misc: require('./combinators/misc.js'),
	Output: require('./combinators/output.js'),
	Redirection: require('./combinators/redirection.js'),
	RequestErrors: require('./combinators/requesterrors.js'),
	ServerErrors: require('./combinators/servererrors.js'),
	Successful: require('./combinators/successful.js'),
};
exports.Util = {
	Parsers: require('./util/parsers.js'),
	JWT: require('./util/jwt.ejs'),
};