const λ = require('fantasy-check/src/adapters/nodeunit');
const applicative = require('fantasy-check/src/laws/applicative');
const functor = require('fantasy-check/src/laws/functor');
const monad = require('fantasy-check/src/laws/monad');

const {identity, constant} = require('fantasy-combinators');

const {equals, eq} = require('../test-lib.js');

const fs = require('fs');

let files = {
	'/': {
		stats: {
			isFile: () => false,
			isDirectory: () => true,
			size: 4096,
			mtime: 'sometime'
		}
	},
	'/home': {
		contents: [
			'abc', 'def.js', 'ghi'
		],
		stats: {
			isFile: () => false,
			isDirectory: () => true,
			size: 4096,
			mtime: 'sometime'
		}
	},
	'/home/abc': {
		stats: {
			isFile: () => false,
			isDirectory: () => true,
			size: 4096,
			mtime: 'sometime'
		},
		contents: [
			'index.html',
		]
	},
	'/home/abc/index.html': {
		stats: {
			isFile: () => true,
			isDirectory: () => false,
			size: Buffer.byteLength(
				Buffer.from('<h1>HI</h1>')),
			mtime: 'sometime',
		},
		data: '<h1>HI</h1>'
	},
	'/home/def.js': {
		stats: {
			isFile: () => true,
			isDirectory: () => false,
			size: Buffer.byteLength(
				Buffer.from('alert("HELLO")')),
			mtime: 'sometime',
		},
		data: 'alert("HELLO")',
	},
	'/home/ghi': {
		stats: {
			isFile: () => true,
			isDirectory: () => false,
			size: 4096,
			mtime: 'sometime',
		}
	},
	'/home/sadf': {
		stats: {
			isFile: () => false,
			isDirectory: () => false,
		}
	}
};

fs.stat = (path, cb) => {
	cb(null, files[path].stats);
}

fs.readdir = (path, cb) => {
	cb(null, files[path].contents);
}

fs.createReadStream = (path, cb) => {
	const stream = new require('stream').PassThrough();

	const data = Buffer.from(files[path].data);

	stream.end(data);

	return stream;
}

const Sugar = require('../src/sugar.js');

const monadic = require('monadic-js');
const {Either, Async} = monadic;

function makeTest(contentType, body, headers = {}, method, url) {
	headers['content-type'] = contentType;

	const data = Buffer.from(body);

	const req = new require('stream').PassThrough();

	req.end(data);
	req.headers = headers;
	req.method = method;
	req.url = url;
	req.connection = {remoteAddress: '1'}

	return req;
}

function makeContext(contentType, body, headers, method, url) {
	return Sugar.Server.createContext(
		makeTest(contentType, body, headers, method, url),
		null,
		{https: true, mime: {}, port: 1111}
	);
}

function getOutput(context) {
	return Async.create((succ, fail) => {

		const isEs = context.response.headers['content-type'] === 'text/event-stream';
		const res = isEs ?
			context.response.content : Sugar.Combinators.Compression.compressStream(
			context.response.headers['content-encoding'],
			context.response.content
		);

		let buffers = [];
		res.on('data', x => buffers.push(x));
		res.on('end', x => {
			succ([context, Buffer.concat(buffers)]);
		});
	});
}

function testWP2(type, body, wp, headers, method, url) {
	return makeContext(type, body, headers, method, url)
		.chain(wp)
		.chain(getOutput);
}

function testWP(type, body, wp, headers, method, url) {
	return testWP2(type, body, wp, headers, method, url)
		.map(x => [x[0], x[1].toString()]);
}

exports.Combinators = {
	'Successful': test => {
		const check = eq(test);


		const {OK, CREATED,
			ACCEPTED, NO_CONTENT} = Sugar.Combinators.Successful;

		const res1 = testWP('text/plain', '', OK('hello'));

		const res2 = testWP('text/plain', '', CREATED('hello'));

		const res3 = testWP('text/plain', '', ACCEPTED('hello'));

		const res4 = testWP('text/plain', '', NO_CONTENT);

		const all = Async.all(res1, res2, res3, res4);

		all.fork(([w,x,y,z]) => {
			check(w[0].response.status, 200);
			check(w[1], 'hello');

			check(x[0].response.status, 201);
			check(x[1], 'hello');

			check(y[0].response.status, 202);
			check(y[1], 'hello');

			check(z[0].response.status, 204);
			check(z[1], '');

			test.done();
		}, e => {
			console.error(e);
			test.done();
		});
	},
	'output': test => {
		const check = eq(test);

		const {mime, encoding} = Sugar.Combinators.Output;
		const {OK} = Sugar.Combinators.Successful;

		const res1 = testWP('text/plain', '', mime('text/html').arrow(OK('')));
		const res2 = testWP('text/plain', '', OK('').arrow(encoding('gzip')));
		const res3 = testWP('text/plain', '', OK('').arrow(mime('text/html').arrow(mime())));

		const all = Async.all(res1, res2, res3);

		all.fork(([x,y,z]) => {
			check(x[0].response.headers, {'content-type': 'text/html', 'content-length': 0});
			check(y[0].response.headers, {'content-encoding': 'gzip'});
			check(z[0].response.headers, {'content-length': 0});

			test.done();

		}, e => {
			console.error(e);
			test.ok(false, "Error shouldn't occur");
			test.done();
		})
	},
	'timeout': test => {
		const check = eq(test);

		const WP = x => Async.sleep(100).map(_ => x);

		const {timeout} = Sugar.Combinators.Misc;
		const {OK} = Sugar.Combinators.Successful;

		const res = testWP('text/plain', '', timeout(200, OK('hey').arrow(WP)));
		const res2 = testWP('text/plain', '', timeout(50, OK('hey').arrow(WP)));

		const all = Async.all(res, res2);

		all.fork(([x, y]) => {
			check(x[0].response.status, 200);
			check(y[0].response.status, 408);
			test.done();
		}, e => {
			console.error(e);
			test.ok(false, 'Error should not have happened');
			test.done();
		});
	},
	'redirection': test => {
		const check = eq(test);

		const {redirect, MOVED_PERMANENTLY, FOUND} = Sugar.Combinators.Redirection;
		const {OK} = Sugar.Combinators.Successful;

		const res = testWP('text/plain', '', redirect('google.com'));
		const res2 = testWP('text/plain', '', FOUND('google.com'));
		const res3 = testWP('text/plain', '', MOVED_PERMANENTLY('google.com'));

		const all = Async.all(res, res2, res3);

		all.fork(([x,y,z]) => {
			check(x[0].response.status, 302);
			check(y[0].response.status, 302);
			check(z[0].response.status, 301);

			const c = x => check(x.response.headers.location, 'google.com');

			c(x[0]);
			c(y[0]);
			c(z[0]);

			test.done();
		}, e => {
			console.error(e);
			test.ok(false, 'Error should not have happened');
			test.done();
		})
	},
	'filters': test => {
		const check = eq(test);

		const {DELETE, PUT, path, pathStarts, pathMatch, choose} = Sugar.Combinators.Filters;

		const {OK} = Sugar.Combinators.Successful;

		const blah = (...args) => {
			return OK(args.join(','));
		};

		const res = testWP('text/plain', '', OK('').arrow(DELETE).arrow(OK('good')), {}, 'DELETE');
		const res2 = testWP('text/plain', '', OK('').arrow(DELETE).alt(OK('good')), {}, 'PUT');
		const res3 = testWP('text/plain', '', OK('').arrow(path('/a')).arrow(OK('good')), {}, 'GET', '/a');
		const res4 = testWP('text/plain', '', OK('').arrow(path('/a')).alt(OK('good')), {}, 'GET', '/ab');
		const res5 = testWP('text/plain', '', OK('').arrow(pathStarts('/a')).arrow(OK('good')), {}, 'GET', '/ab');
		const res6 = testWP('text/plain', '', OK('').arrow(pathStarts('/a')).alt(OK('good')), {}, 'GET', '/b');
		const res7 = testWP('text/plain', '', OK('').arrow(pathMatch('/%d/%f/%s', blah)), {}, 'GET', '/5/3.7/abc');
		const res8 = testWP('text/plain', '', OK('').arrow(pathMatch('/%d/%f/%s', blah)).alt(OK('good')), {}, 'GET', '/5.5/g/abc');
		const res9 = testWP('text/plain', '',
			choose(DELETE, OK('good')),
		  {}, 'GET', '/5.5/g/abc');
		const res10 = testWP('text/plain', '',
			choose(DELETE, PUT).alt(OK('good')),
		  {}, 'GET', '/5.5/g/abc');
		const all = Async.all(res, res2, res3, res4, res5, res6, res7, res8, res9, res10);

		all.fork(([x,y,z,a,b,c,d,e,f,g]) => {
			check(x[1], 'good');
			check(y[1], 'good');
			check(z[1], 'good');
			check(a[1], 'good');
			check(b[1], 'good');
			check(c[1], 'good');
			check(d[1], '5,3.7,abc');
			check(e[1], 'good');
			check(f[1], 'good');
			check(g[1], 'good');
			test.done();
		}, e => {
			console.error(e);
			test.ok(false, 'Error should not have happened');
			test.done();
		});
	},
	'events': test => {
		const check = eq(test);

		const Rx = require('rx');

		class Event {
			constructor(a) {
				this.a = a;
			}
		}

		const events = Rx.Observable.interval(10)
			.map(_ => ({
				a: 5
			}))
			.take(10)
			.concat(Rx.Observable.interval(10).map(_ => new Event(5)).take(10));

		const events2 = Rx.Observable.throw('Errror!!!');

		const {toEventStream} = Sugar.Combinators.Events;

		const res = testWP('text/plain', '', toEventStream(events));
		const res2 = testWP('text/plain', '', toEventStream(events2));
		const res3 = testWP('text/plain', '', toEventStream(Rx.Observable.empty().delay(6), 5));

		const all = Async.all(res, res2, res3);

		all.fork(([x, y, z]) => {
			check(x[1], 'data: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\n');
			check(y[1], 'event: Error\ndata: "Errror!!!"\n\n');
			check(z[1], ':keepalive\n\n');
			test.done();
		}, e => {
			console.error(e);
			test.done();
		});
		//events.onCompleted();
	},
	'compression': test => {
		const check = eq(test);

		const {OK} = Sugar.Combinators.Successful;
		const {compress} = Sugar.Combinators.Compression;

		const res = testWP2('text/plain', '', OK("HELLO").arrow(compress), {'accept-encoding': 'gzip, deflate'});
		const res2 = testWP2('text/plain', '', OK("HELLO").arrow(compress), {'accept-encoding': 'deflate, gzip'});
		const res3 = testWP2('text/plain', '', OK("HELLO").arrow(compress), {'accept-encoding': 'blah'});
		const res4 = testWP2('text/plain', '', OK("HELLO").arrow(compress), {});

		const all = Async.all(res, res2, res3, res4);

		const zlib = require('zlib');

		all.fork(([x,y,z,a]) => {
			const xVal = zlib.gunzipSync(x[1]).toString();
			const yVal = zlib.inflateSync(y[1]).toString();
			const zVal = z[1].toString();
			const aVal = a[1].toString();

			check(xVal, 'HELLO');
			check(yVal, 'HELLO');
			check(zVal, 'HELLO');
			check(aVal, 'HELLO');

			test.done();
		}, e => {
			console.error(e);
			test.done();
		});		
	},
	'authentication': test => {
		const check = eq(test);

		const {authenticateBasic, authenticateJWT} = Sugar.Combinators.Authentication;
		const {OK} = Sugar.Combinators.Successful;
		const jwt = Sugar.Utility.JWT;

		//test basic auth
		const P = OK("Hello");

		const author = (t,u,p) => t + ' ' + Buffer.from(u + ':' + p).toString('base64');
		const header = (u,p) => author('basic', u, p)

		const authed = authenticateBasic((u,p) => u === 'foo' && p === 'bar', P);

		const res = testWP('text/plain', '', authed, {'authorization': header('foo', 'bar')});
		const res2 = testWP('text/plain', '', authed, {'authorization': header('foo2', 'bar')});
		const res3 = testWP('text/plain', '', authed, {'authorization': author('blah', 'foo2', 'bar')});
		const res4 = testWP('text/plain', '', authed, {});

		//test jwt auth
		const P2 = (context) => OK('' + context.userToken.userId)(context);

		const auth1 = authenticateJWT('blah', 'blah', 'HS256');
		const auth2 = authenticateJWT('blah', 'blah', 'HS256', {check: x => Async.fail(new Error('bad'))});

		let j = jwt('blah', 'blah');
		const token = (userId, alg) => j.createToken({userId}, alg).case({
			Left: _ => '',
			Right: v => v,
		});

		const res5 = testWP('text/plain', '', auth1(P2), {authorization: token(12)});
		const res6 = testWP('text/plain', '', auth1(P2), {});
		const res7 = testWP('text/plain', '', auth1(P2), {authorization: token(12, 'HS512')});
		const res8 = testWP('text/plain', '', auth2(P2), {authorization: token(12)});

		const all = Async.all(res, res2, res3, res4, res5, res6, res7, res8);

		all.fork(([a,b,c,d,e,f, g,h]) => {
			//basic auth assertions
			check(a[1], 'Hello');
			check(b[1], 'Please log in to access this resource');
			check(c[1], 'Please log in to access this resource');
			check(d[1], 'Please log in to access this resource');
			//jwt auth assertions
			check(e[1], '12');
			check(f[1], '"You must authenticate to use this resource"');
			check(g[1], '"The token\'s algorithm does not match the expected algorithm"');
			check(h[1], '"bad"');

			test.done();
		}, e => {
			test.ok(false, e.message);
			test.done();
		});
	},
	files: test => {
		const check = eq(test);

		const {toHTML, resolvePath, browsePath} = Sugar.Combinators.Files;
		const {OK} = Sugar.Combinators.Successful;

		try {
			resolvePath('/home', '/../../s');
			test.ok(false, 'bad path check');
		}
		catch (e) {
			test.ok(true, 'bad path check');
		}

		const res = testWP('text/plain', '', browsePath('/home', ''), {}, 'GET', '/');
		const expected = toHTML('/', [
			['.', files['/home'].stats],
			['..', files['/'].stats],
			['abc', files['/home/abc'].stats],
			['def.js', files['/home/def.js'].stats],
			['ghi', files['/home/ghi'].stats]
		]);
		const res2 = testWP('text/plain', '', browsePath('/home', ''), {}, 'HEAD', '/');
		const res3 = testWP('text/plain', '', browsePath('/home', ''), {}, 'GET', '/def.js');
		const res4 = testWP('text/plain', '', browsePath('/home', ''), {}, 'GET', '/abc');
		const res5 = testWP('text/plain', '', browsePath('/home', '').alt(OK("good")), {}, 'GET', '/sadf');
		const res6 = testWP('text/plain', '', browsePath('/home', ''), {range: '2-5'}, 'GET', '/def.js');

		const all = Async.all(res, res2, res3, res4, res5, res6);

		all.fork(([a, b, c, d, e, f]) => {
			check(b[0].response.headers['accept-ranges'], 'none');
			check(a[1], expected);
			check(c[1], 'alert("HELLO")');
			check(d[1], '<h1>HI</h1>');
			check(e[1], 'good');
			check(f[1], 'alert("HELLO")');
			check(f[0].response.status, 206);
			test.done();
		}, e => {
			console.error(e);
			test.ok(false, "BAH");
			test.done();
		})
	}
};