const {REQUEST_TIMEOUT} = require('./requesterrors.js');
const Async = require('monadic-js').Async;

/**
 *	Sugar.Combinators.Misc
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Miscellaneous combinators that don't really
 *	fit into any other specific module.
 */

/**
 *	timeout :: int -> WebPart -> WebPart
 *
 *	Creates a web part that will time out if the specified
 *	web part does not complete processing in the specified
 *	timespan (milliseconds).
 *
 *	The provided WebPart will not be cancelled as it will
 *	have already started processing. Typically you shouldn't
 *	use this anyway and your timeouts should happen in your code.
 */
exports.timeout = function(timespan, part) {
	return function(context) {
		const run = part(context);
		const timed = Async.sleep(timespan).map(_ =>
			REQUEST_TIMEOUT('Request Timeout')(context));

		return Async.first(run, timed);
	}
}