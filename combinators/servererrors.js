const {text} = require('./output.js');

/**
 *	combinators/servererrors
 *	5xx
 *
 *	Combinators for serving 5xx status HTTP responses
 */

/**
 *	INTERNAL_ERROR :: string -> WebPart
 *
 *	HTTP 500 Status Internal Service Error
 *	response. Used when an unexpected error
 *	occurs and no more information exists to
 *	give a better error.
 */
exports.INTERNAL_ERROR = text(500);

/**
 *	NOT_IMPLEMENTED :: string -> WebPart
 *
 *	HTTP 501 Not Implemented Error. The
 *	requested service is not yet available,
 *	but is likely to be implemented in the
 *	future.
 */
exports.NOT_IMPLEMENTED = text(501);

/**
 *	BAD_GATEWAY :: string -> WebPart
 *
 *	HTTP 502 Bad Gateway. An upstream server
 *	returned an invalid response when this
 *	server was acting as a gateway.
 */
exports.BAD_GATEWAY = text(502);

/**
 *	SERVICE_UNAVAILABLE :: string -> WebPart
 *
 *	HTTP 503 Service Unavailable. The server is
 *	not currently available.
 */
exports.SERVICE_UNAVAILABLE = text(503);

/**
 *	GATEWAY_TIMEOUT :: string -> WebPart
 *
 *	HTTP 504 Gateway Timeout. An upstream server
 *	did not respond in a timely manner when this
 *	server was acting as a gateway.
 */
exports.GATEWAY_TIMEOUT = text(504);

/**
 *	INVALID_HTTP_VERSION :: string -> WebPart
 *
 *	505 HTTP Version Not Supported. The server
 *	does not support the version of the HTTP
 *	protocol used in the request.
 */
exports.INVALID_HTTP_VERSION = text(505);