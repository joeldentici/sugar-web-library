//wrap strictDeepEqual to to return bool, not throw
const assert = require('assert');
function equals(a, b) {
	try {
		assert.deepStrictEqual(a, b);
		return true;
	}
	catch (e) {
		return false;
	}
}

function eq(test) {
	return (a, b, msg) => test.ok(equals(a, b), msg);
}

module.exports = {
	equals,
	eq
}