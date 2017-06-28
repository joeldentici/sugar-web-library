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
 *	getFormParser :: string -> Buffer -> Map string string
 *
 *	Gets a form parser for a content type. If no
 *	parser is defined for the content type, then a parser
 *	that returns an empty form is returned.
 */
function getFormParser(contentType) {
	return formParsers[contentType] || (rawForm => {});
}

/**
 *	getRawForm :: NodeHttpRequest -> Promise Buffer
 *
 *	Extracts the data from the Node HTTP Server Request.
 */
function getRawForm(req) {
	return new Promise((res, rej) => {
		const buffers = [];
		req.on('data', x => {buffers.push(x);});
		req.on('end', () => res(Buffer.concat(buffers)));
	});
}

/**
 *	parseRequest :: NodeHttpRequest -> Promise HttpRequest
 *
 *	Performs further processing on the incoming node HTTP Request
 *	before mapping it to a Sugar HTTP Request and returning it in
 *	a Promise.
 */
function parseRequest(req) {
	//raw request body
	const rawForm = getRawForm(req);
	//parse the request body to get form
	const form = rawForm.then(getFormParser(req.headers['content-type']));
	//TODO: parse the request body to get files
	const files = Promise.resolve([]);
	//parse the URL to get path and query params/arguments
	const [url, query] = parseUrl(req.url);

	const ready = Promise.all([form, files, rawForm]);

	//once form and files are parsed
	return ready.then(([form, files, rawForm]) => ({
		version: req.httpVersion,
		url,
		host: req.headers.host,
		method: req.method,
		headers: req.headers,
		query,
		form,
		files,
		rawForm
	}));
}

/**
 *	createContext :: Object -> Object -> Object -> Promise HttpContext
 *
 *	Extracts and further parses the request data from the
 *	node HTTP server to create a Sugar HttpContext
 */
function createContext(req, res, config) {
	return parseRequest(req)
		.then(request => ({
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
 *	startWebServer :: Object -> WebPart -> HttpServer
 *
 *	Runs a web server that processes each request
 *	through the specified Web Part.
 */
function startWebServer(config, app) {
	//add the server to the response headers
	app = app.arrow(request(addServer));

	//handler to pass to the node server
	//for requests
	function handler(req, res) {
		//create context for the request
		createContext(req, res, config)
			.then(x => Async.run(app(x))) //then run it through the application
			.then(x => {
				//write the response headers and status
				res.writeHead(x.response.status, x.response.headers);

				//get compressed content, if we are compressing
				const content = compressStream(
					x.response.headers['Content-Encoding'],
					x.response.content);

				//output the content to the response
				content.pipe(res);
			})
			.catch(x => {
				//log any error that propagated all the way up here
				console.log("A serious error occurred", x);
				//clearly we can't do anything about this error so
				//we should respond with an internal server error
				res.writeHead(500, headers({'Content-Type': 'text/plain'}));
				res.end("An internal server error occurred");
			});
	}

	//create the appropriate type of http server
	let server;
	if (config.httpsKey)
		server = https.createServer(httpsConfig(config), handler);
	else
		server = http.createServer(handler);

	//listen to incoming requests
	server.listen(config.port);

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
		}
	};
}
	