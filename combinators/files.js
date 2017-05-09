const {setHeader, response} = require('./output.js');
const fs = require('fs');
const path = require('path');
const {promisfy} = require('../util/misc.js');

/**
 *	combinators/files
 *
 *	Functions for interacting with the filesystem
 *	and combinators for serving static files.
 */

/**
 *	stat :: string -> Promise Object Error
 *
 *	Stats a file on the local filesystem.
 */
const stat = promisfy(fs.stat);

/**
 *	openFile :: string -> Promise File
 *
 *	Opens a file on the local filesystem.
 */
const openFile = exports.openFile = function(name) {
	const fileName = name.substring(name.lastIndexOf(path.sep) + 1);
	return stat(name)
		.then(({size}) => ({
			//remove any / or \ left in the file name to play
			//nicely with the other opposite OS when they are
			//the client
			name: fileName.replace(/\|\\\//g, '-'),
			stream: fs.createReadStream(name),
			size,
		}));
}

/**
 *	send :: File -> WebPart
 *
 *	Web Part that will cause a typical web browser to download
 *	a file with a specified file name. The file is sent in an HTTP 200 OK
 *	response.
 */
const send = exports.send = function(file) {
	return response(200)(file.stream)
		.arrow(setHeader('Content-Type')(file.mime || 'application/octet-stream'))
		.arrow(setHeader('Content-Disposition')('attachment; filename='+file.name))
		.arrow(setHeader('Content-Length')(file.size));
}