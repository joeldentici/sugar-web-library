const {text, response} = require('./output.js');

/**
 *	combinators/successful
 *	2xx
 *
 *	Combinators for serving HTTP 2xx status responses.
 */

/**
 *	OK :: string -> WebPart
 *
 *	HTTP status 200 response with text/plain content type
 */
exports.OK = text(200);

/**
 *	CREATED :: string -> WebPart
 *
 *	HTTP status 201 response
 */
exports.CREATED = text(201);

/**
 *	ACCEPTED :: string -> WebPart
 *
 *	HTTP status 202 response
 */
exports.ACCEPTED = text(202);

/**
 *	NO_CONTENT :: WebPart
 *
 *	HTTP status 204 response
 */
exports.NO_CONTENT = response(204)('');
