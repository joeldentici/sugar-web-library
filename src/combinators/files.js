const {setHeader, response, mime} = require('./output.js');

const fs = require('fs');
const path = require('path');
const {asyncRequest} = require('../sugar.js');
const {NOT_FOUND} = require('./requesterrors.js');

const Async = require('monadic-js').Async;
const PassThrough = require('stream').PassThrough;
const {mapM} = require('monadic-js').Utility;

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

const emoji = fs.readFileSync(path.join(__dirname, 'emoji.txt')).toString();

/**
 *	stat :: string -> Async Error Object
 *
 *	Stats a file on the local filesystem.
 */
const stat = Async.wrap(fs.stat);

/**
 *	readdir :: string -> Async Error [string]
 *
 *	Reads the files in a directory.
 */
const readdir = Async.wrap(fs.readdir);

/**
 *	displaySize :: int -> string
 *
 *	Returns a human readable representation
 *	of the provided size (which should be in bytes)
 */
function displaySize(size, decSig) {
	const prefixes = [
		['TiB', Math.pow(2, 40)],
		['GiB', Math.pow(2, 30)],
		['MiB', Math.pow(2, 20)],
		['KiB', Math.pow(2, 10)],
	];

	for (let [prefix, sig] of prefixes) {
		if (size / sig > 1) {
			const pSize = (size / sig).toFixed(decSig);

			return `${pSize} ${prefix}`;
		}
	}

	return `${size} B`;
}

/**
 *	directoryListing :: string -> string -> Async Error File
 *
 *	Creates an HTML directory listing from a directory.
 */
function directoryListing(dirPath, urlPath, range) {
	function toHTML(files) {
		const getPath = (file) => path.join(urlPath, file);

		const upOne = path.join(urlPath, '..');

		const dirs = files.filter(([n,s]) => s.isDirectory());
		const actualFiles = files.filter(([n,s]) => s.isFile());

		const c = b => b ? 'file' : 'folder';

		const showFiles = files => files.map(([x, stats]) =>
			 `
			 <tr>
			 	<td class="icon ${c(stats.isFile())}">
			 		${stats.isFile() ? '&#x1F4C4;': '&#x1F4C2;'}
			 	</td>
			 	<td class="name">
			 		<a href="${getPath(x)}">${x}</a>
			 	</td>
			 	<td>
			 		${displaySize(stats.size)}
			 	</td>
			 	<td>
			 		${stats.mtime}
			 	</td>
			 </tr>
			 `).join('\n\t\t\t');

		const gradient = (start, end) => `
			background: linear-gradient(to bottom right, ${start}, ${end});
			color: transparent;
			-webkit-background-clip: text;
		`;

		const output = `<!DOCTYPE html>
<html>
	<head>
		<title>Directory Listing - ${urlPath}</title>
		<style>
			@font-face {
				font-family: Emoji;
				src: url(data:font/woff;base64,${emoji})
			}

			table {
				border-spacing: 10px;
			}

			td.name {
				text-align: center;
			}

			td.icon {
				font-family: Emoji;
				font-size: 200%;
				text-align: center;
			}

			td.icon.file {
				${gradient('darkblue', 'skyblue')}
			}

			td.icon.folder {
				${gradient('orangered', 'orange')}
			}
		</style>
	</head>
	<body>
		<h2>Directory Listing - ${urlPath}</h2>
		<h3>Contents:</h3>
		<table>
			<thead>
				<tr>
					<th></th>
					<th>Name</th>
					<th>Size</th>
					<th>Last Modified</th>
				</tr>
			</thead>
			<tbody>
			${showFiles(dirs)}
			${showFiles(actualFiles)}
			</tbody>
		</table>
	</body>
</html>`;
		return output;
	}

	function toStream(buffer) {
		const stream = new PassThrough();
		stream.end(buffer);
		return stream;
	}

	function readStats(fileName) {
		return stat(path.join(dirPath, fileName))
				.map(stats => [fileName, stats]);
	}

	return readdir(dirPath)
		.map(fileNames => ['.', '..'].concat(fileNames))
		.bind(fileNames => mapM(Async, readStats)(fileNames))
		.map(files => files.filter(([n,s]) => 
			s.isFile() || s.isDirectory()))
		.bind(files => {
			//if we have an index file in the directory, return it
			const indexes = files.filter(
					([n,s]) => n.match(/^index/) !== null);
			if (indexes.length > 0) {
				const [name,stats] = indexes[0];
				return openFile({
					name: path.join(dirPath, name),
					urlPath,
					range
				});
			}
			//otherwise create and return a directory listing
			else {
				return Async.unit(files)
					.map(toHTML)
					.map(listing => createFile(
						'directory.html',
						toStream(Buffer.from(listing)),
						Buffer.byteLength(listing)
					));
			}
		});
}

/**
 *	getRange :: HttpRequest -> Object
 *
 *	Parses the range header of an HTTP Request and
 *	returns an object containing the range.
 */
const getRange = exports.getRange = function(request) {
	if (request.headers['range']) {
		const header = request.headers['range'].replace(/^.*=/g, '');
		const [start, end] = header.split('-').map(x => x.trim());
		return {
			start: Number.parseInt(start || 0),
			end: Number.parseInt(end || 0),
		};
	}
	else {
		return null;
	}
}

/**
 *	createFile :: string -> ReadableStream -> int -> Object
 *
 *	Creates a new File object using the specified parameters.
 *
 *	If a range is specified, the File will be sent as a partial
 *	response when send is used.
 */
const createFile = exports.createFile = function(name, stream, size, range = null) {
	if (range) {
		return {
			name,
			stream,
			length: range.end - range.start,
			start: range.start,
			end: range.end,
			size,
			partial: true,
		};
	}
	else {
		return {
			name,
			stream,
			size,
			length: size,
			partial: false,
		};
	}
}

/**
 *	openFile :: Object -> Async Error File
 *
 *	Opens a file on the local filesystem.
 */
const openFile = exports.openFile = function({name, urlPath, range}) {
	const fileName = name
		.substring(name.lastIndexOf(path.sep) + 1)
		.replace(/\|\\\//g, '-');

	function loadFile(stats) {
		//make sure we always have a range to work with
		const r = range || {
			start: 0,
			end: stats.size
		};

		//upper bound our range limits to the actual file limits
		const r2 = {
			start: Math.max(0, Math.min(r.start, stats.size)),
			end: Math.min(Math.max(0, r.end), stats.size),
		};

		//create a File object with our fixed range
		return createFile(
			fileName,
			fs.createReadStream(name, r2),
			stats.size,
			r2
		);
	}

	return stat(name)
		.bind(stats => {
			if (stats.isFile()) {
				return Async.unit(loadFile(stats));
			}
			else if (stats.isDirectory()) {
				return directoryListing(name, urlPath, range);
			}
			else {
				return Async.fail(new Error("Not a file or directory"));
			}
		});
}

/**
 *	send :: File -> WebPart
 *
 *	WebPart that send the byte stream contained in the file object
 *	to the client. Sent in an HTTP 200 OK or 206 Partial response.
 *
 *	If the File is a partial File, then a partial response will be
 *	sent.
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


		let handle;
		if (context.request.method === 'HEAD') {
			const range = file.partial ? 'bytes' : 'none';

			handle = response(200)(Buffer.alloc(0))
				.arrow(setHeader('Accept-Ranges')(range));
		}
		else if (file.partial && file.size > file.length) {
			handle = response(206)(file.stream)
				.arrow(mime(mimeType))
				.arrow(setHeader('Content-Length')(file.length))
				.arrow(setHeader('Content-Range')(
					`bytes=${file.start}-${file.end}/${file.size}`))
		}
		else {
			handle = response(200)(file.stream)
				.arrow(mime(mimeType))
				.arrow(setHeader('Content-Length')(file.length));
		}

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
 *	doFile :: (File -> WebPart) -> Object -> Async () WebPart
 *
 *	Reads a file from disk, then maps it to the appropriate
 *	web part by applying the provided action.
 */
function doFile(action) {
	return function(fileOptions) {
		return openFile(fileOptions).map(action);		
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
		sendFile({
			name: resolvePath(rootPath, urlMap(request.url)),
			urlPath: urlMap(request.url),
			range: getRange(request),
		}));
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