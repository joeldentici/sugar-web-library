/**
 *	operators
 *
 *	Defines operators used by Sugar
 */

Promise.prototype.bind = Promise.prototype.then;

/**
 *	Kleisi Composition of monadic
 *	functions
 */
function arrow(a, b) {
	return function(x) {
		return a(x).bind(b);
	}
}

/**
 *	alt :: (a -> Promise b) -> (a -> Promise b) -> a -> Promise b
 *
 *	Returns a new function that will try the first
 *	function, then try the second function if the
 *	first one fails.
 */
function alt(a, b) {
	return function(x) {
		return a(x)
			.then(x => x,
				  e => b(x));
	}
}

/**
 *	Attach Kleisi composition as an operator
 *	to all functions. This will of course only
 *	work with functions of the type:
 *	Monad m => a -> m b
 *
 *	This will result in a new function with
 *	the same signature as the functions that were
 *	composed.
 */
Function.prototype.arrow = function(b) {
	return arrow(this, b);
}

exports.arrow = arrow;
exports.alt = alt;