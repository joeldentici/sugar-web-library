const {challenge} = require('./requesterrors.js');
const Async = require('monadic-js').Async;

/**
 *	Sugar.Combinators.Authentication
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Provides combinators for performing
 *	basic HTTP authentication/authorization.
 *
 *	More advanced authentication and authorization
 *	schemes are left to the user to implement for
 *	their own applications or frameworks.
 */

/**
 *	parseAuthHeader :: string -> (string, string, string)
 *
 *	Decodes the HTTP basic authorization header to extract
 *	the authorization type, username, and password.
 */
function parseAuthHeader(header) {
	const parts = header.split(' ');
	const enc = parts[1].trim();
	const decoded = new Buffer(enc, 'base64').toString('ascii');
	const i = decoded.indexOf(':');
	return [
		parts[0].toLowerCase(),
		decoded.substring(0, i),
		decoded.substring(i + 1)
	];
}

/**
 *	authenticateBasicAsync :: (string -> string -> Async () bool) -> WebPart -> WebPart
 *
 *	Returns a WebPart that will allow the user to access the provided WebPart
 *	if they provided credentials that pass the provided test. Otherwise,
 *	the user is provided an HTTP 401 Unauthorized response with a Basic
 *	authentication challenge.
 */
const authenticateBasicAsync = exports.authenticateBasicAsync = function(test, part) {
	return function(context) {
		const request = context.request;
		const authHeader = request.headers['authorization'];
		if (authHeader) {
			const [type, user, pwd] = parseAuthHeader(authHeader);
			if (type === 'basic') {
				return test(user, pwd)
					.bind(b => b ? part(context) : challenge(context));
			}
			else {
				return challenge(context);
			}
		}
		else {
			return challenge(context);
		}
	}
}

/**
 *	authenticateBasic :: (string -> string -> bool) -> WebPart -> WebPart
 *
 *	See authenticateBasicAsync. This is the same thing but for a validation
 *	function that is not asynchronous.
 */
exports.authenticateBasic = function(test, part) {
	return authenticateBasicAsync(
		(u,p) => Async.unit(test(u,p)), part);
}