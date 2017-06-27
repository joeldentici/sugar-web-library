const {setHeader, response, mime} = require('./output.js');
const fs = require('fs');
const path = require('path');
const {asyncRequest} = require('../sugar.js');
const {NOT_FOUND} = require('./requesterrors.js');

const Async = require('monadic-js').Async;

/**
 *	Sugar.Combinators.Files
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	Functions for interacting with the filesystem
 *	and combinators for serving static files. These
 *	combinators can also be used with a custom file loading
 *	scheme (see below).
 *
 *	Files are represented as an object containing a suggested name
 *	for the file, a readable stream of the file's contents, and the
 *	size in bytes of the file. If you construct an object like this,
 *	it can be provided to the send or download combinators, depending
 *	on what you would like the user's browser to do with the file (note
 *	that the browser can choose to ignore the headers set by download
 *	and not actually download the file to the file system).
 */

/**
 *	stat :: string -> Async Error Object
 *
 *	Stats a file on the local filesystem.
 */
const stat = Async.wrap(fs.stat);

/**
 *	openFile :: string -> Async Error File
 *
 *	Opens a file on the local filesystem.
 */
const openFile = exports.openFile = function(name) {
	const fileName = name.substring(name.lastIndexOf(path.sep) + 1);
	return stat(name)
		.bind(stats => {
			if (stats.isFile()) {
				return Async.unit({
					name: fileName.replace(/\|\\\//g, '-'),
					stream: fs.createReadStream(name),
					size: stats.size,
				});
			}
			else {
				return Async.fail(new Error("Not a file"));
			}
		});
}

/**
 *	send :: File -> WebPart
 *
 *	WebPart that send the byte stream contained in the file object
 *	to the client. Sent in an HTTP 200 OK response.
 *
 *	The Content-Type header will be set as follows:
 *
 *		If the extension in file.name is in context.runtime.mime
 *		then the mime type will be used
 *
 *		Otherwise, 'application/octet-stream' will be used, which
 *		will cause most browsers to download the file
 */
const send = exports.send = function(file) {
	return function(context) {
		const extension = path.extname(file.name);
		const mimeType = context.runtime.mime[extension]
			|| 'application/octet-stream';

		const handle = response(200)(file.stream)
			.arrow(mime(mimeType))
			.arrow(setHeader('Content-Length')(file.size));

		return handle(context);
	}
}

/**
 *	download :: File -> WebPart
 *
 *	Web Part that will cause a typical web browser to download
 *	a file with a specified file name. The file is sent in an HTTP 200 OK
 *	response. This is equivalent to send, but will attempt to force a browser
 *	to download the file and will suggest that the browser uses the file name
 *	provided by the file object.
 */
const download = exports.download = function(file) {
	return send(file)
		.arrow(setHeader('Content-Disposition')('attachment; filename='+file.name));
}


/**
 *	doFile :: (File -> WebPart) -> string -> Async () WebPart
 *
 *	Reads a file from disk, then maps it to the appropriate
 *	web part by applying the provided action.
 *
 *	The resulting WebPart will return an HTTP 404 Not Found
 *	error containing the message of any error that occurs
 *	while loading the file.
 */
function doFile(action) {
	return function(filePath) {
		return Async.try(openFile(filePath).map(action))
			    	.catch(e => Async.unit(NOT_FOUND(
			    		"The requested file could not be found: " + e.toString())));		
	}
}

/**
 *	downloadFile :: string -> Async () WebPart
 *
 *	Loads a file from disk asynchronously and then maps it
 *	to a web part that will download the file.
 */
const downloadFile = exports.downloadFile = doFile(download);
/**
 *	sendFile :: string -> Async () WebPart
 *
 *	Loads a file from disk asynchronously and then maps it
 *	to a web part that will send the file.
 */
const sendFile = exports.sendFile = doFile(send);

/**
 *	resolvePath :: string -> string -> string
 *
 *	Resolves the file name provided relative to the root
 *	path provided. The resulting path is guaranteed to be
 *	a subpath of the rootPath.
 */
const resolvePath = exports.resolvePath = function(rootPath, fileName) {
	fileName = fileName.replace(/\//g, path.sep);

	if (fileName[0] === path.sep) {
		fileName = fileName.substring(1);
	}

	const result = path.normalize(path.join(rootPath, fileName));
	if (result.startsWith(rootPath)) {
		return result;
	}
	else {
		throw new Error("Path resolution error");
	}
}

/**
 *	browse :: string -> (string -> string) -> WebPart
 *
 *	Returns a WebPart that allows the user to
 *	browse a portion of the file system. Takes
 *	the root path to browse at and a function to map
 *	paths. Handles path resolution.
 */
const browse = exports.browse = function(rootPath, urlMap = (x => x)) {
	return asyncRequest(request => 
		sendFile(resolvePath(rootPath, urlMap(request.url))));
}

/**
 *	browsePath :: string -> string -> WebPart
 *
 *	Browse relative to the rootPath on the file system, excluding
 *	startPath from the URL.
 */
const browsePath = exports.browsePath = function(rootPath, startPath) {
	return browse(rootPath, x => x.substring(startPath.length));
}