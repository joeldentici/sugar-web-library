const {response} = require('./output.js');

/**
 *	combinators/intermediate
 *	1xx
 *	
 *	Combinators for serving HTTP 1xx status responses
 */

/**
 *	CONTINUE :: WebPart
 */
exports.CONTINUE = response(100)('');

/**
 *	SWITCHING_PROTO :: WebPart
 */
exports.SWITCHING_PROTO = response(101)('');