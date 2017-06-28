const Async = require('monadic-js').Async;
const {encoding} = require('../combinators/output');
const {request} = require('../sugar.js');
const zlib = require('zlib');
const PassThrough = require('stream').PassThrough;

/**
 *	Sugar.Combinators.Compression
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Provides combinators for performing
 *	compression on responses.
 */


/**
 *	compressionStreams :: Map string TransformStream
 *
 *	Map encoding types to compression stream constructors.
 */
const compressionStreams = {
	deflate: zlib.createDeflate,
	gzip: zlib.createGzip,
	none: () => new PassThrough(),
};

/**
 *	supportedCompression :: Set string
 *
 *	Set of supported compression type.
 */
const supportedCompression = new Set(Object.keys(compressionStreams));



/**
 *	addCompression :: HttpRequest -> WebPart
 *
 *	Adds compression to the HttpResponse if
 *	the request accepts a supported encoding.
 */
function addCompression(request) {
	if (request.headers['accept-encoding']) {
		const algs = request.headers['accept-encoding']
			.split(',')
			.map(x => x.trim());
		const usableAlgs = algs.filter(x => supportedCompression.has(x));
		if (usableAlgs.length)
			return encoding(usableAlgs[0]);
	}

	return Async.unit;
}

/**
 *	compress :: WebPart
 *
 *	Adds compression to the response, if the
 *	requestor supports it.
 */
exports.compress = request(addCompression);

/**
 *	compressStream :: string -> ReadableStream -> ReadableStream
 *
 *	Compresses the provided stream with the compression
 *	algorithm for the provided encoding.
 */
exports.compressStream = function (encoding, stream) {
	encoding = encoding || 'none';
	return stream.pipe(compressionStreams[encoding]());
}