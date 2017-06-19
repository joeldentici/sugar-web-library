const {response} = require('./output.js');

/**
 *	Sugar.Combinators.Intermediate
 *	written by Joel Dentici
 *	on 6/18/2017
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