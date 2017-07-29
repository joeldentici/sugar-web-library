const λ = require('fantasy-check/src/adapters/nodeunit');
const applicative = require('fantasy-check/src/laws/applicative');
const functor = require('fantasy-check/src/laws/functor');
const monad = require('fantasy-check/src/laws/monad');

const {identity, constant} = require('fantasy-combinators');

const {equals, eq} = require('../test-lib.js');

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
		const res = context.response.content;

		let buffers = [];
		res.on('data', x => buffers.push(x));
		res.on('end', x => {
			succ([context, Buffer.concat(buffers).toString()]);
		});
	});
}

function testWP(type, body, wp, headers, method, url) {
	return makeContext(type, body, headers, method, url)
		.chain(wp)
		.chain(getOutput);
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
			console.log("WTF");
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
			check(x[0].response.headers, {'Content-Type': 'text/html', 'Content-Length': 0});
			check(y[0].response.headers, {'Content-Encoding': 'gzip'});
			check(z[0].response.headers, {'Content-Length': 0});
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

			const c = x => check(x.response.headers.Location, 'google.com');

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

		const res = testWP('text/plain', '', toEventStream(events, 100));
		const res2 = testWP('text/plain', '', toEventStream(events2));

		const all = Async.all(res, res2);

		all.fork(([x, y]) => {
			check(x[1], 'data: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\ndata: {"a":5}\n\n:keepalive\n\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\nevent: Event\ndata: {"a":5}\n\n:keepalive\n\nevent: Event\ndata: {"a":5}\n\n');
			check(y[1], 'event: Error\ndata: "Errror!!!"\n\n');
			test.done();
		}, e => {
			console.error(e);
			test.done();
		});
		//events.onCompleted();
	}
};