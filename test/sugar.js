const λ = require('fantasy-check/src/adapters/nodeunit');
const applicative = require('fantasy-check/src/laws/applicative');
const functor = require('fantasy-check/src/laws/functor');
const monad = require('fantasy-check/src/laws/monad');

const {identity, constant} = require('fantasy-combinators');

const {equals, eq} = require('../test-lib.js');

const Sugar = require('../src/sugar.js');

const monadic = require('monadic-js');
const {Either, Async} = monadic;

function makeTest(contentType, body) {
	const headers = {
		'content-type': contentType,
	};

	const data = Buffer.from(body);

	const req = new require('stream').PassThrough();

	req.end(data);
	req.headers = headers;

	return req;
}

exports.Sugar = {
	'context/request': test => {
		const check = eq(test);

		const WP = y => x => Async.of(Object.assign({}, x, {
			marked: y
		}));

		const inputContext = () => Sugar.Server.createContext(
			makeTest('text/plain', 'a=b'),
			null,
			{https: true, mime: {}, port: 1111}
		);

		const WP2 = Sugar.context(WP);
		const WP3 = Sugar.request(WP);
		const WP4 = Sugar.asyncContext(y => Async.of(WP(y)));
		const WP5 = Sugar.asyncRequest(y => Async.of(WP(y)));

		const res1 = inputContext().chain(WP2);
		const res2 = inputContext().chain(WP3);
		const res3 = inputContext().chain(WP4);
		const res4 = inputContext().chain(WP5);


		const all = Async.all(res1, res2, res3, res4);

		all.fork(([x,y,z,a]) => {
			const x2 = Object.assign({}, x);
			delete x2['marked'];

			const y2 = Object.assign({}, y);
			delete y2['marked'];

			const z2 = Object.assign({}, z);
			delete z2['marked'];

			const a2 = Object.assign({}, a);
			delete a2['marked'];

			check(x.marked, x2);
			check(y.marked, y2.request);
			check(z.marked, z2);
			check(a.marked, a2.request);

			test.done();
		}, e => {
			console.log("WTF");
			console.error(e);
			test.done();
		});
	}
};