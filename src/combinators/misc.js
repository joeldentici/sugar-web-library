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
 *	Due to the way that Promises work, the provided WebPart
 *	processing will not be cancelled, but its result will be
 *	discarded and the returned WebPart is guaranteed to complete
 *	within the provided timespan.
 */
exports.timeout = function(timespan, part) {
	return function(context) {
		const run = part(context);
		const timed = Async.sleep(timespan).map(_ =>
			REQUEST_TIMEOUT('Request Timeout')(context));

		return Async.first(run, timed);
	}
}