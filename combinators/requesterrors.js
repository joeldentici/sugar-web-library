const {text, setHeader} = require('./output.js');

/**
 *	Sugar.Combinators.RequestErrors
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Combinators for serving 4xx status
 *	HTTP responses.
 */


/**
 *	NOT_FOUND :: string -> WebPart
 *
 *	HTTP status 404 response with text/plain content type.
 *
 *	Used when a resource cannot be located.
 */
exports.NOT_FOUND = text(404);

/**
 *	BAD_REQUEST :: string -> WebPart
 *
 *	HTTP status 400 response with text/plain content type.
 *
 *	Used when a request is malformed.
 */
exports.BAD_REQUEST = text(400);

/**
 *	UNAUTHORIZED :: string -> WebPart
 *
 *	HTTP status 401 response requesting basic authentication
 *	for a resource from a client.
 */
exports.UNAUTHORIZED = function(s) {
	return text(401)(s)
		.arrow(setHeader('WWW-Authenticate')('Basic realm="Protected"'));
}

/**
 *	challenge :: WebPart
 *
 *	HTTP status 401 Basic Challenge.
 */
exports.challenge = exports.UNAUTHORIZED('Please log in to access this resource');

/**
 *	FORBIDDEN :: string -> WebPart
 *
 *	HTTP status 403 response with message to client.
 *
 *	Used when access to a resource is forbidden to the
 *	client and authorization will not gain them access.
 */
exports.FORBIDDEN = text(403);

/**
 *	METHOD_NOT_ALLOWED :: string -> WebPart
 *
 *	HTTP status 405 response with message to client.
 *
 *	Used when an HTTP method is not allowed for some
 *	URI.
 */
exports.METHOD_NOT_ALLOWED = text(405);

/**
 *	NOT_ACCEPTABLE :: string -> WebPart
 *
 *	HTTP status 406 response with message to client.
 *
 *	The response is of a type that the client does
 *	not accept, but the server otherwise processed
 *	the request properly.
 */
exports.NOT_ACCEPTABLE = text(406);

/**
 *	REQUEST_TIMEOUT :: string -> WebPart
 *
 *	HTTP status 408 response with message to client.
 *
 *	Used when the servers determines that processing
 *	a request is taking to long and decides to terminate
 *	it.
 */
exports.REQUEST_TIMEOUT = text(408);

/**
 *	CONFLICT :: string -> WebPart
 *
 *	HTTP status 409 response with message to client.
 */
exports.CONFLICT = text(409);

/**
 *	GONE :: string -> WebPart
 *
 *	HTTP status 410 response with message to client.
 *
 *	Used when a resource cannot be located, but we know
 *	that it previously existed.
 */
exports.GONE = text(410);

/**
 *	UNSUPPORTED_MEDIA_TYPE :: string -> WebPart
 *
 *	HTTP status 415 response with message to client.
 *
 *	Used when the server does not recognize the content
 *	type of the request body.
 */
exports.UNSUPPORTED_MEDIA_TYPE = text(415);

/**
 *	UNPROCESSABLE_ENTITY :: string -> WebPart
 *
 *	HTTP status 422 response with message to client.
 *
 *	Used when the server can parse the request, but cannot
 *	process it (it is semantically meaningless, but syntactically
 *	meaningful).
 */
exports.UNPROCESSABLE_ENTITY = text(422);

/**
 *	PRECONDITION_REQUIRED :: string -> WebPart
 *
 *	HTTP status 428 response with message to client.
 *
 *	Sent when the server requires the request to be conditional.
 */
exports.PRECONDITION_REQUIRED = text(428);

/**
 *	TOO_MANY_REQUEST :: string -> WebPart
 *
 *	HTTP status 429 response with message to client.
 *
 *	Used with rate limiting schemes to prevent clients
 *	from sending too many requests in a short period of
 *	time.
 */
exports.TOO_MANY_REQUESTS = text(429);