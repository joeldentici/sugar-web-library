/**
 *	Sugar.Util.Misc
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Miscellaneous utility functions
 */

/**
 *	zip :: [a] -> [b] -> [(a,b)]
 *
 *	Zips together corresponding elements
 *	of two lists.
 */
exports.zip = function(a, b) {
	function zipAcc(a, b, acc) {
		if (a.length === 0 || b.length === 0)
			return acc;
		else
			return zipAcc(
				a.slice(1),
				b.slice(1),
				acc.concat([[a[0], b[0]]]));
	}
	return zipAcc(a, b, []);
}

/**
 *	delayFor :: int -> Promise ()
 *
 *	Returns a Promise that is resolved
 *	after the provided time in milliseconds
 *	elapses.
 */
exports.delayFor = function(timespan) {
	return new Promise((res, rej) =>
		setTimeout(() => res(), timespan)
	);
}

/**
 *	sequence :: [a_0 -> a_1,...,a_n-1 -> a_n] -> a_0 -> a_n
 *
 *	Left to right composition of unary functions.
 */
exports.sequence = function(...fns) {
	return function(value) {
		for (let fn of fns) {
			value = fn.call(null, value);
		}
		return value;
	}
}

/**
 *	promisfy :: (a -> (b -> c -> ()) -> ()) -> a -> Promise b c
 *
 *	Turns an async function that returns its result by
 *	continuation into an async function that returns its
 *	result by Promise.
 */
exports.promisfy = function(fn) {
	return function(arg) {
		return new Promise((res, rej) => {
			fn(arg, (err, val) => {
				if (err) rej(err);
				else res(val);
			});
		});
	}
}