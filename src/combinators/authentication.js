const {challenge} = require('./requesterrors.js');
const Async = require('monadic-js').Async;
const jwt = require('../util/jwt.ejs');
const {FORBIDDEN} = require('./requesterrors.js');

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

/**
 *	IBlackList :: Object
 *
 *	An IBlackList is an object with a <code>check</code>
 *	method that takes the payload of a JWT and returns an
 *	<code>Async e ()</code>.
 *
 *	If the returned <code>Async e ()</code> is an error,
 *	then we should forbid the request, even though we issued
 *	the token originally.
 *
 *	The black list that is used should be stored in a quick
 *	access way (such as in process or in an in memory data store).
 */

/**
 *	authenticateJWT :: (string, string, string, IBlackList) -> WebPart -> WebPart
 *
 *	Constructs a WebPart that uses the JWT library to authenticate
 *	the Authorization header. If the token is authenticated, the
 *	payload is placed on the HttpContext as userToken.
 *
 *	If authentication succeeds, the specified WebPart is ran,
 *	otherwise an appropriate error WebPart is ran.
 *
 *	TODO: This should also take an errMapper
 */
exports.authenticateJWT = function(privateKey, publicKey, alg, blacklist) {
	const auth = jwt(privateKey, publicKey);

	blacklist = blacklist || {check: Async.of};

	return part => context => {
		const token = (context
			.request
			.headers['authorization'] || '')
			.replace(/Bearer\s*/g, '');

		//no sense in attempting authentication on an empty token
		if (!token) {
			return FORBIDDEN('You must authenticate to use this resource')(context);
		}

		//authenticate the token
		return auth.authenticateToken(token, alg).case({
			//the token is invalid, forbid the request
			Left: e => FORBIDDEN(e.message)(context),
			//token is valid, so now we need to make sure
			//it isn't blacklisted
			Right: payload => {
				//check the valid token against a token blacklist
				return Async.try(blacklist
					.check(payload)
					//its valid, so run the WebPart on the updated context
					.chain(_ => part(Object.assign({}, context, {
						userToken: payload
					})))
				//the token is blacklisted, forbid the request
				).catch(e => FORBIDDEN(e.message)(context));
			}
		});
	}
}