const {REQUEST_TIMEOUT} = require('./requesterrors.js');
const {delayFor} = require('../util/misc.js');


/**
 *	timeout :: int -> WebPart -> WebPart
 *
 *	Creates a web part that will time out if the specified
 *	web part does not complete processing in the specified
 *	timespan.
 */
exports.timeout = function(timespan, part) {
	return function(context) {
		const run = part(context);
		const timed = delayFor(timespan).then(_ => Promise.reject());
		return Promise.race([run,timed])
			.catch(_ => REQUEST_TIMEOUT('Request Timeout')(context));
	}
}