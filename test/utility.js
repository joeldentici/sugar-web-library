const λ = require('fantasy-check/src/adapters/nodeunit');
const applicative = require('fantasy-check/src/laws/applicative');
const functor = require('fantasy-check/src/laws/functor');
const monad = require('fantasy-check/src/laws/monad');

const {identity, constant} = require('fantasy-combinators');

const {equals, eq} = require('../test-lib.js');

const Sugar = require('../src/sugar.js');
const Utility = Sugar.Utility;

const monadic = require('monadic-js');
const {Either} = monadic;

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
	'jwt - encode/decode': test => {
		const jwt = Utility.JWT;

		const check = eq(test);

		//make sure the encoder and decoder work
		check(jwt.decode(jwt.encode('blah')), Either.of('blah'));
		//make sure decoding a non-object will fail
		const error = jwt.decode(Buffer.from('blah;djd').toString('base64')).case({
			Right: _ => undefined,
			Left: e => e.message
		});
		let expected;
		try {
			JSON.parse('blah;djd');
		}
		catch (e) {
			expected = e.message;
		}
		check(error, expected);

		const error2 = jwt.split({}).case({
			Left: e => e.message,
			Right: _ => undefined,
		});

		check(error2, 'token.split is not a function');

		test.done();
	},
	'jwt - create/auth': test => {
		const jwt = Utility.JWT;

		const check = eq(test);

		const auth = jwt('key', 'key');
		const auth2 =jwt('key2', 'key');

		const token = {
			user: 'blah',
			iat: Date.now(),
			exp: Date.now() + 10000
		};

		const result = auth.createToken(token)
		.chain(token => auth.authenticateToken(token)).case({
			Left: _ => undefined,
			Right: v => v,
		});

		const result2 = auth.createToken(token, 'b8d88d8').case({
			Left: e => e.message,
			Right: v => undefined
		});

		const token2 = {
			'user': 'blah',
			iat: Date.now() + 10000,
			exp: Date.now() + 10000,
		};
		const result3 = auth.createToken(token2)
		.chain(token => auth.authenticateToken(token)).case({
			Left: e => e.message,
			Right: v => undefined
		});

		const token3 = {
			'user': 'blah',
			iat: Date.now(),
			exp: Date.now() - 1000
		};
		const result4 = auth.createToken(token3)
		.chain(token => auth.authenticateToken(token)).case({
			Left: e => e.message,
			Right: v => undefined,
		});

		const result5 = auth.createToken(token)
		.chain(token => auth2.authenticateToken(token)).case({
			Left: e => e.message,
			Right: v => undefined
		});

		const weird = jwt.encode({}) + '.' + jwt.encode({});
		const weirdToken = weird + '.' + jwt.encode('blah');
		const result6 = auth.authenticateToken(weirdToken).case({
			Left: e => e.message,
			Right: v => undefined
		});

		const badAlg = jwt.encode({typ: 'JWT', alg: 'blah'}) + '.' + jwt.encode({});
		const badAlgToken = badAlg + '.' + jwt.encode('blah');
		const result7 = auth.authenticateToken(badAlgToken).case({
			Left: e => e.message,
			Right: v => undefined
		});


		const mismatchAlg = jwt.encode({typ: 'JWT', alg: 'HS512'}) + '.' + jwt.encode({});
		const mismatchAlgToken = mismatchAlg + '.' + jwt.encode('blah');
		const result8 = auth.authenticateToken(mismatchAlgToken).case({
			Left: e => e.message,
			Right: v => undefined
		});

		const result9 = auth.createToken(token, 'none')
		.chain(token => auth.authenticateToken(token, 'none')).case({
			Left: _ => undefined,
			Right: v => v,
		});

		const result10 = auth.createToken(token, 'none')
		.chain(token => auth.authenticateToken(token)).case({
			Left: e => e.message,
			Right: v => undefined,
		});

		const result11 = auth.createToken(token, 'HS512')
		.chain(token => auth.authenticateToken(token, 'HS512')).case({
			Left: e => undefined,
			Right: v => v,
		});

		check(result11, token);

		check(result10, "The token's algorithm does not match the expected algorithm");

		check(result9, token);

		check(result8, "The token's algorithm does not match the expected algorithm");

		check(result7, 'The hash algorithm used to create this token is not supported');

		check(result6, 'Not a JSON Web Token');

		check(result5, 'This token failed authentication');

		check(result4, 'The token has expired');

		check(result3, 'IAT failure: The token was issued in the future!');

		check(result2, 'The provided signing algorithm is not supported');

		check(result, token);


		test.done();
	}
};