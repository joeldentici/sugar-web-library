const Async = require('monadic-js').Async;
const PassThrough = require('stream').PassThrough;

/**
 *	Sugar.Combinators.Output
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Provides combinators for creating and
 *	modifying HTTP responses.
 */

/**
 *	response :: int -> Buffer | ReadableStream -> WebPart
 *
 *	General purpose HTTP response web part that accepts the HTTP status
 *	code, and the response content. The response content can be in the
 *	form of a byte buffer, or a File, which consists of a ReadableStream,
 *	file name, mime type, and file size.
 */
const response = exports.response = function(status) {
	return function(content) {
		return function(context) {
			const headers = JSON.parse(JSON.stringify(context.response.headers));

			let stream = content;
			//handle buffer content -> turn into a ReadableStream
			if (content instanceof Buffer) {
				headers['content-length'] = Buffer.byteLength(content);
				stream = new PassThrough();
				stream.end(content);
			}

			const newContext = {
				runtime: context.runtime,
				request: context.request,
				response: {
					status,
					content: stream,
					headers
				}
			};
			return Async.unit(newContext);
		}
	}
}

/**
 *	setHeader :: string -> string -> WebPart
 *
 *	Web Part that sets an HTTP response header to a given
 *	value.
 */
const setHeader = exports.setHeader = function(header) {
	return function(value) {
		return function(context) {
			header = header.toLowerCase();

			const headers = JSON.parse(JSON.stringify(context.response.headers));
			if (value)
				headers[header] = value;
			else
				delete headers[header];

			const newContext = {
				runtime: context.runtime,
				request: context.request,
				response: {
					status: context.response.status,
					content: context.response.content,
					headers
				}
			};

			return Async.unit(newContext);

		}
	}
}

/**
 *	text :: int -> string -> WebPart
 *
 *	Like response, but also sets the content type to
 *	text/plain.
 */
const text = exports.text = function(status) {
	return function(content) {
		return response(status)(Buffer.from(content));
	}
}

/**
 *	mime :: string -> WebPart
 *
 *	Web Part that sets the 
 *	Content-Type header for the HTTP response
 */
exports.mime = function(type) {
	return setHeader('Content-Type')(type);
}

/**
 *	encoding :: string -> WebPart
 *
 *	Sets the content encoding. This will cause
 *	compression of the output stream to occur.
 */
exports.encoding = function(type) {
	return setHeader('Content-Encoding')(type)
			.arrow(setHeader('Content-Length')(undefined));
}