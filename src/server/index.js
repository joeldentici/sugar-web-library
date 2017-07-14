const http = require('http');
const https = require('https');
const {parseUrl, parseQuery} = require('../util/parsers.js');
const fs = require('fs');
const Async = require('monadic-js').Async;
const {compressStream} = require('../combinators/compression.js');
const {request} = require('../sugar.js');
const {setHeader} = require('../combinators/output.js');

/**
 *	Sugar.Server
 *	written by Joel Dentici
 *	on 6/18/2017
 *
 *	This module implements the HTTP/HTTPS
 *	server functionality for Sugar.
 *
 *	This module exports two functions:
 *	startWebServer and defaultConfig
 */


/**
 *	formParsers :: Map string (Buffer -> Map string string)
 *
 *	Map content types to functions that will
 *	parse the request body.
 */
const formParsers = {
	'application/x-www-form-urlencoded': parseUrlEncodedForm,
};

/**
 *	parseUrlEncodedForm :: Buffer -> Map string string
 *
 *	Parses a form that is urlencoded by using
 *	the URI query string parser.
 */
function parseUrlEncodedForm(rawForm) {
	return parseQuery(rawForm.toString());
}

/**
 *	getFormParser :: string -> Buffer -> Map string (string | FileUpload)
 *
 *	Gets a form parser for a content type. If no
 *	parser is defined for the content type, then a parser
 *	that returns an empty form is returned.
 */
function getFormParser(contentType) {
	return formParsers[contentType] || (rawForm => {});
}

/**
 *	parseForm :: NodeHttpRequest -> Async () (Map string (string | FileUpload))
 *
 *	Parses the request body to get the form. If there is no
 *	parser for the content type of the request, then no request
 *	data is read and the form is undefined.
 */
function parseForm(req) {
	const contentType = req.headers['content-type'];
	if (formParsers[contentType]) {
		return getRawForm(req)
			.then(getFormParser(contentType));
	}
	else {
		return Async.of(undefined);
	}
}

/**
 *	getRawForm :: NodeHttpRequest -> Async () Buffer
 *
 *	Extracts the data from the Node HTTP Server Request.
 */
function getRawForm(req) {
	return Async.create((succ, fail) => {
		const buffers = [];

		req.on('data', x => {buffers.push(x);});
		req.on('end', () => succ(Buffer.concat(buffers)));
	});
}

/**
 *	parseRequest :: NodeHttpRequest -> Async () HttpRequest
 *
 *	Performs further processing on the incoming node HTTP Request
 *	before mapping it to a Sugar HTTP Request and returning it in
 *	a Async.
 */
function parseRequest(req) {
	//parse the request body to get form
	const getForm = parseForm(req);
	//parse the URL to get path and query params/arguments
	const [url, query] = parseUrl(req.url);

	//once form is parsed
	return getForm.map(form => ({
		version: req.httpVersion,
		url,
		host: req.headers.host,
		method: req.method,
		headers: req.headers,
		query,
		form,
		body: req,
	}));
}

/**
 *	createContext :: Object -> Object -> Object -> Async () HttpContext
 *
 *	Extracts and further parses the request data from the
 *	node HTTP server to create a Sugar HttpContext
 */
function createContext(req, res, config) {
	return parseRequest(req)
		.map(request => ({
			request,
			response: {
				status: 0,
				headers: {},
				content: '',
			},
			runtime: {
				https: config.httpsKey ? true : false,
				port: config.port,
				mime: config.mime,
			}
		}));
}

/**
 *	httpsConfig :: Object -> Object
 *
 *	Loads the SSL private key and signed certificate
 *	pair from disk, given the configuration object
 *	for startWebServer.
 *
 *	The returned object can be passed to the nodejs
 *	https server constructor.
 */
function httpsConfig(config) {
	let httpsConfig = {
		key: fs.readFileSync(config.httpsKey),
		cert: fs.readFileSync(config.httpsCert),
	}

	if (config.caCert) {
		httpsConfig.ca = fs.readFileSync(config.caCert);
		httpsConfig.requestCert = true;
	}

	return httpsConfig;
}

/**
 *	addServer :: HttpRequest -> WebPart
 *
 *	Adds the server response header.
 */
function addServer(request) {
	const host = request.headers.host || 'localhost';

	return setHeader('Server')(`Sugar (${host})`);
}

/**
 *	startWebServer :: (Object, WebPart, int) -> HttpServer
 *
 *	Runs a web server that processes each request
 *	through the specified Web Part.
 *
 *	The verbosity levels cause logging as follows:
 *		0 - Log errors that the application fails to handle or server fails to handle
 *		1 - Logging when server starts listening and when an error occurs
 *		2 - Logging of requests + Level 1
 *		3 - Level 2 + Logging of HttpContext before and after processing
 */
function startWebServer(config, app, verbose = 0) {
	//add the server to the response headers
	app = app.arrow(request(addServer));

	let reqID = 0;
	//handler to pass to the node server
	//for requests
	function handler(req, res) {
		const id = reqID++;
		verbose > 1 && console.log(`Accepted request ${id}, Processing...`);

		let loggedUserError = false;

		//run the app on the request
		Async.run(createContext(req, res, config)
			.tap(x => {
				verbose > 2 && console.log(`Input HttpContext for ${id}`, x);
			})
			.chain(x => 
				app(x).tapFail(e => {
					console.error("You didn't handle this error: ", e);
					loggedUserError = true;
				})
			) //then run it through the application
			.tap(x => {				
				verbose > 1 && console.log(`Request ${id} processed, sending response`);
				verbose > 2 && console.log(`Output HttpContext for ${id}`, x);
				verbose > 1 && x.response.content.on('end', () => console.log(
					`Response sent for request ${id}`));
			})
			.tap(x => {
				//write the response headers and status
				res.writeHead(x.response.status, x.response.headers);

				//get compressed content, if we are compressing
				const content = compressStream(
					x.response.headers['Content-Encoding'],
					x.response.content);

				//close the content stream if the request ends
				//while we are sending data so resources can
				//be cleaned up ASAP
				req.on('close', () => x.response.content.end());

				if (x.request.method !== 'HEAD')
					//output the content to the response
					content.pipe(res);
				else
					//end the response: HEAD requires no content be sent
					res.end();
			})
			.tapFail(e => {
				//log any error that propagated all the way up here
				if (!loggedUserError)
					console.error("Sugar failed to handle this error: ", e);
				//clearly we can't do anything about this error so
				//we should respond with an internal server error
				res.writeHead(500, {'Content-Type': 'text/plain'});
				res.end("An internal server error occurred");
			})
		);
	}

	//create the appropriate type of http server
	let server;
	if (config.httpsKey)
		server = https.createServer(httpsConfig(config), handler);
	else
		server = http.createServer(handler);

	//listen to incoming requests
	server.listen(config.port, config.host, function() {
		verbose && console.log(
			`Listening ${config.host ? config.host + ':' : ''}${config.port}`);
	});

	return server;
}

exports.startWebServer = startWebServer;

/**
 *	defaultConfig :: () -> Object
 *
 *	A constant function that returns the default Sugar
 *	application configuration object. The returned object
 *	can be modified before being passed to startWebServer to
 *	change properties of the web server.
 */
exports.defaultConfig = function() {
	return {
		port: 7842,
		mime: {
			'.ico': 'image/x-icon',
			'.css': 'text/css',
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.js': 'application/javascript',
			'.html': 'text/html',
			'.htm': 'text/html',
			'.txt': 'text/plain',
		}
	};
}
	