/**
 *	Sugar.Operators
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Defines operators used by Sugar. These are
 *	special functions attached to the Function prototype
 *	allowing the composition of WebPart combinators in different
 *	ways.
 */

//this allows us to define Kleisi composition more generically
Promise.prototype.bind = Promise.prototype.then;

/**
 *	arrow :: Monad m => (a -> m b) -> (b -> m c) -> a -> m c
 *	Kleisi Composition of monadic
 *	functions
 */
function arrow(a, b) {
	return function(x) {
		return a(x).bind(b);
	}
}

/**
 *	or :: (a -> Promise b) -> (a -> Promise b) -> a -> Promise b
 *
 *	Returns a new function that will try the first
 *	function, then try the second function if the
 *	first one fails.
 *
 *	This is essentially an alternative instance for promise returning
 *	functions.
 */
function or(a, b) {
	return function(x) {
		return a(x)
			.then(x => x,
				  e => b(x));
	}
}

/* Attach Kleisi composition as defined above to the Function Prototype */
Function.prototype.arrow = function(b) {
	return arrow(this, b);
}

/* Attach the alternative operator as defined above to the Function Prototype */
Function.prototype.or = function(b) {
	return or(this, b);
}

exports.arrow = arrow;
exports.or = or;