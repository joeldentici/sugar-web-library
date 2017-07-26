const PassThrough = require('stream').PassThrough;
const {response, mime} = require('./output.js');
const Rx = require('rx');
const Async = require('monadic-js').Async;

/**
 *	Sugar.Combinators.Events
 *	written by Joel Dentici
 *	on 7/13/2017
 *	
 *	This module provides combinators to turn
 *	JavaScript event streams (Rx Observables)
 *	into HTTP event streams.
 *
 *	Responses from these combinators use the
 *	server-sent events specification.
 */

/**
 *	toEventStream :: Observable a -> WebPart
 *
 *	Creates a WebPart that subscribes to the observable
 *	and emits its events using server-sent events.
 *
 *	This should be used for each request that wants an
 *	event stream.
 */
exports.toEventStream = function(eventStream, keepalive = 20000) {
	//The Observable may have side effects, so we should delay subscription
	//to it until we run the Async computation that the resulting WebPart
	//returns. For that reason, we thunk the entire thing and wrap it in an Async
	//computation. The base WebPart's result will be forked to give the value of the
	//Async that this WebPart results in.
	return context => Async.create((succ, fail) => {
		const outStream = new PassThrough();

		//write events
		function write(stream, event) {
			try {
				const name = event.__type__ || event.constructor.name;

				const data = JSON.stringify(event);

				//only send a name for the event if it isn't going
				//to be Object... like that means anything
				if (name !== 'Object')
					stream.write('event: ' + name + '\n');
				stream.write('data: ' + data + '\n\n');
			}
			catch (e) { }
		}

		//write errors
		function writeErr(stream, err) {
			try {
				const name = 'Error';
				const data = JSON.stringify(err);

				stream.write('event: ' + name + '\n');
				stream.write('data: ' + data + '\n\n');
				stream.end();
			}
			catch (e) { }
		}

		//write keep-alive comments
		const keepAlive = Rx.Observable.interval(keepalive);
		const dispk = keepAlive.forEach(_ => {
			try {
				outStream.write(':keepalive\n\n');
			} 
			catch (e) { }
		});

		//subscribe to event stream to write
		//errors to the out stream
		const disp = eventStream.subscribe({
			onNext: ev => write(outStream, ev),
			onError: err => writeError(outStream, err),
			onCompleted: () => { 
				try {
					outStream.end();
				}
				catch (e) { }
			},
		});

		//if the client closes down, then outStream will
		//close so we want to dispose the observable subscription
		outStream.on('end', () => {
			disp.dispose();
			dispk.dispose();
		});

		//create WebPart from the out stream, apply it to the context
		//and then fork its result to this Async's thunk
		response(200)(outStream)
			.arrow(mime('text/event-stream'))(context).fork(succ, fail);
	});
}