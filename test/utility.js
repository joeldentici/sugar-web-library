const λ = require('fantasy-check/src/adapters/nodeunit');
const applicative = require('fantasy-check/src/laws/applicative');
const functor = require('fantasy-check/src/laws/functor');
const monad = require('fantasy-check/src/laws/monad');

const {identity, constant} = require('fantasy-combinators');

const {equals, eq} = require('../test-lib.js');

const Sugar = require('../src/sugar.js');
const Utility = Sugar.Utility;

exports.Utility = {
	'parseQuery': test => {
		const parse = Utility.Parsers.parseQuery;

		//deep equality checking
		const check = eq(test);

		check(parse('a=b&c=d&g=f'), {
			a: 'b',
			c: 'd',
			g: 'f'
		});

		check(parse(''), {});

		check(parse(), {});

		test.done();
	},
	'parsePlain': test => {
		const parse = Utility.Parsers.parsePlain;

		//deep equality checking
		const check = eq(test);

		check(parse('a=b&c=d&g=f'), {
			a: 'b',
			c: 'd',
			g: 'f'
		});

		check(parse(''), {});

		check(parse(), {});

		test.done();
	},
	'parseUrl': test => {
		const parse = Utility.Parsers.parseUrl;

		//deep equality checking
		const check = eq(test);
		
		check(parse('/x?a=b&c=d&g=f'), ['/x', {
			a: 'b',
			c: 'd',
			g: 'f'
		}]);

		check(parse('/x'), ['/x', {}])

		check(parse(''), ['', {}]);

		check(parse(), ['', {}]);

		test.done();
	},
	'jwt': test => {
		test.done();
	}
};