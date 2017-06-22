const {REQUEST_TIMEOUT} = require('./requesterrors.js');
const {waitFor: delayFor} = require('js-helpers');
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
		const timed = delayFor(timespan).then(_ => Promise.reject());
		return Promise.race([run,timed])
			.catch(_ => REQUEST_TIMEOUT('Request Timeout')(context));
	}
}