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
 *	A few useful combinators to dynamically use WebParts
 *	are provided in this module directly.
 */

/**
 *	WebPartCombinator :: ...(any ->) WebPart
 *
 *	Any type of a function that ultimately results in a WebPart when
 *	fully applied.
 *
 *	This means both constructors of WebParts and functions that combine
 *	WebParts are considered combinators for the purpose of the documentation
 *	of this library.
 */

/**
 *	WebPart :: HttpContext -> Async e HttpContext
 *
 *	WebPart is the type used to construct Sugar applications.
 *
 *	WebParts can be constructed and combined using WebPartCombinators
 */

/**
 *	HttpContext :: {request: HttpRequest, response: HttpResponse, runtime: HttpRuntime}
 *
 *	An HttpContext represents the state of an HttpRequest and the response
 *	that is being built, as it is processed by a Sugar application.
 */

/**
 *	HttpRequest :: Object
 *
 *	An object with the following properties:
 *
 *	`version - string`
 *	`url - string`
 *	`host - string`
 *	`method - string`
 *	`headers - Map string string`
 *	`query - Map string string`
 *	`form - Form`
 *	`body - ReadableStream`
 *
 *	This represents the HttpRequest that was received by Sugar from
 *	the underlying node http/https server, after some processing.
 */

/**
 *	Form :: Map string (string | FileUpload)
 *
 *	An object whose fields are either string values
 *	or file uploads.
 */

/**
 *	FileUpload :: {name: string, stream: ReadableStream}
 *
 *	An object that represents a file upload field in a form.
 */

/**
 *	File :: {size: int, stream: ReadableStream, name: int}
 *
 *	A File can be processed by Sugar.Combinators.Files.{send,download}
 *	into a WebPart that sends/downloads the file.
 */

/**
 *	HttpResponse :: {status: int, headers: Map string string, content: ReadableStream}
 *
 *	An object representing what will be sent to the browser/client.
 */

/**
 *	HttpRuntime :: {https: bool, port: int, mime: Map string string}
 *
 *	An object representing configuration of the server that might be used
 *	to change the behavior of the application.
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
		return fn(context.request).chain(f => f(context));
	}
}

/**
 *	asyncContext :: (HttpContext -> Async WebPart) -> WebPart
 *
 *	See asyncRequest
 */
exports.asyncContext = function(fn) {
	return function(context) {
		return fn(context).chain(f => f(context));
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
	Proxy: require('./combinators/proxy.ejs'),
};
exports.Utility = {
	Parsers: require('./util/parsers.js'),
	JWT: require('./util/jwt.ejs'),
};