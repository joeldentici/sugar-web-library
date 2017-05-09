/**
 *	combinators/output
 *
 *	Provides combinators for creating and
 *	modifying HTTP responses.
 */

/**
 *	response :: int -> string | Buffer | File -> WebPart
 *
 *	General purpose HTTP response web part that accepts the HTTP status
 *	code, and the response content. The response content can be in the
 *	form of a string, a byte buffer, or a File, which consists of a ReadableStream,
 *	file name, mime type, and file size.
 */
const response = exports.response = function(status) {
	return function(content) {
		return function(context) {
			const headers = JSON.parse(JSON.stringify(context.response.headers));
			try{
				headers['Content-Length'] = Buffer.byteLength(content);
			} catch (e) {}
			const newContext = {
				request: context.request,
				response: {
					status,
					content,
					headers
				}
			};
			return Promise.resolve(newContext);
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
			const headers = JSON.parse(JSON.stringify(context.response.headers));
			headers[header] = value;
			const newContext = {
				request: context.request,
				response: {
					status: context.response.status,
					content: context.response.content,
					headers
				}
			};

			return Promise.resolve(newContext);

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
		return response(status)(content)
			.arrow(setHeader('Content-Type')('text/plain'));
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