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

//not going to even bother testing...
Sugar.Server.defaultConfig();

exports.Server = {
	'formParsers': test => {
		const parseForm = Sugar.Server.parseForm;

		const check = eq(test);

		const json = JSON.stringify({a: 'b', c: 'd'});

		const test1 = parseForm(makeTest('application/x-www-form-urlencoded', 'a=b&c=d'));
		const test2 = parseForm(makeTest('text/plain', 'a=b&c=d'));
		const test3 = parseForm(makeTest('text/json', json));
		const test4 = parseForm(makeTest('application/json', json));
		const test5 = parseForm(makeTest('blah', json));

		
		const all = Async.all(test1, test2, test3, test4, test5);

		all.fork(([res1, res2, res3, res4, res5]) => {
			check(res1, {a: 'b', c: 'd'});
			check(res2, {a: 'b', c: 'd'});
			check(res3, {a: 'b', c: 'd'});
			check(res4, {a: 'b', c: 'd'});
			check(res5, {});
			test.done();
		}, e => {
			test.done();
		});
	},
	'failing json': test => {
		const parseForm = Sugar.Server.parseForm;

		const check = eq(test);

		const json = 'asdfsadf;;dsf;;';

		const test1 = parseForm(makeTest('text/json', json));

		test1.fork(x => {
			test.ok(false, 'Should have failed');
			test.done();
		}, e => {
			check(e.message, 'Original Text: asdfsadf;;dsf;;, Unexpected token a in JSON at position 0');
			test.done();
		});
	},
	'multipart not implemented': test => {
		const parseForm = Sugar.Server.parseForm;

		const check = eq(test);

		const form = 'asdfsadf;;dsf;;';

		const test1 = parseForm(makeTest('multipart/form-data', form));

		test1.fork(x => {
			test.ok(false, 'Should have failed');
			test.done();
		}, e => {
			check(e.message, 'Multipart form decoding not yet implemented!');
			test.done();
		});		
	},
	'createContext': test => {
		const check = eq(test);

		const req = makeTest('text/plain', '');
		const config = {
			port: 1111,
			mime: {},
			httpsKey: false,
		};

		const expected = { 
			request: { 
				version: undefined,
				url: '',
				host: undefined,
				method: undefined,
				headers: { 'content-type': 'text/plain' },
				query: {},
				form: {},
				body: {},
			},
			response: { status: 0, headers: {}, content: '' },
			runtime: { https: false, port: 1111, mime: {} } 
		};

		const test1 = Sugar.Server.createContext(req, null, config);
		const config2 = Object.assign({}, config, {httpsKey: true});
		const expected2 = {
			request: expected.request,
			response: expected.response,
			runtime: Object.assign({}, expected.runtime, {
				https: true,
			})
		};

		const test2 = Sugar.Server.createContext(makeTest('text/plain', ''), null, config2);

		const all = Async.all(test1, test2);

		all.fork(([x,y]) => {
			const body = x.request.body;
			x.request.body = {};
			test.ok(body instanceof require('stream').PassThrough, 'Body should be a stream');
			check(x, expected);

			y.request.body = {};
			check(y, expected2);
			test.done();
		}, e => {
			test.done();
		});
	}
};