# Sugar Web Library Documentation

## Modules:
Click a module name below to see its documentation

* [Sugar](#sugar)
* [Sugar.Combinators.Authentication](#sugar-combinators-authentication)
* [Sugar.Combinators.Compression](#sugar-combinators-compression)
* [Sugar.Combinators.CQRS](#sugar-combinators-cqrs)
* [Sugar.Combinators.Events](#sugar-combinators-events)
* [Sugar.Combinators.Files](#sugar-combinators-files)
* [Sugar.Combinators.Filters](#sugar-combinators-filters)
* [Sugar.Combinators.Intermediate](#sugar-combinators-intermediate)
* [Sugar.Combinators.Misc](#sugar-combinators-misc)
* [Sugar.Combinators.Output](#sugar-combinators-output)
* [Sugar.Combinators.Proxy](#sugar-combinators-proxy)
* [Sugar.Combinators.Redirection](#sugar-combinators-redirection)
* [Sugar.Combinators.RequestErrors](#sugar-combinators-requesterrors)
* [Sugar.Combinators.ServerErrors](#sugar-combinators-servererrors)
* [Sugar.Combinators.Successful](#sugar-combinators-successful)
* [Sugar.Server](#sugar-server)
* [Sugar.Utility.JWT](#sugar-utility-jwt)
* [Sugar.Utility.Parsers](#sugar-utility-parsers)
## Sugar
<a name="sugar"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Sugar exports all the submodules used by the web application
library.

A few useful combinators to dynamically use WebParts
are provided in this module directly.
#### asyncContext :: (HttpContext &#8594; Async WebPart) &#8594; WebPart

See asyncRequest
#### asyncRequest :: (HttpRequest &#8594; Async e WebPart) &#8594; WebPart

Like request, but the function provided returns a promise
for a WebPart instead of a WebPart. This allows the function
to perform asynchronous handling of the HttpRequest (such as
loading a file, making some network request, etc.), and only
worry about calling a combinator to construct a WebPart, and
not have to worry about piping the context in themselves.
#### context :: (HttpContext &#8594; WebPart) &#8594; WebPart

See request, but lets the application inspect
the context instead.
#### File :: {size: int, stream: ReadableStream, name: int}

A File can be processed by Sugar.Combinators.Files.{send,download}
into a WebPart that sends/downloads the file.
#### FileUpload :: {name: string, stream: ReadableStream}

An object that represents a file upload field in a form.
#### Form :: Map string (string | FileUpload)

An object whose fields are either string values
or file uploads.
#### HttpContext :: {request: HttpRequest, response: HttpResponse, runtime: HttpRuntime}

An HttpContext represents the state of an HttpRequest and the response
that is being built, as it is processed by a Sugar application.
#### HttpRequest :: Object

An object with the following properties:

`version - string`
`url - string`
`host - string`
`method - string`
`headers - Map string string`
`query - Map string string`
`form - Form`
`body - ReadableStream`

This represents the HttpRequest that was received by Sugar from
the underlying node http/https server, after some processing.
#### HttpResponse :: {status: int, headers: Map string string, content: ReadableStream}

An object representing what will be sent to the browser/client.
#### HttpRuntime :: {https: bool, port: int, mime: Map string string}

An object representing configuration of the server that might be used
to change the behavior of the application.
#### request :: (HttpRequest &#8594; WebPart) &#8594; WebPart

Allows application code to easily get access to
an outstanding HttpRequest and return a WebPart
based off of it.
#### WebPart :: HttpContext &#8594; Async e HttpContext

WebPart is the type used to construct Sugar applications.

WebParts can be constructed and combined using WebPartCombinators
#### WebPartCombinator :: ...(any &#8594;) WebPart

Any type of a function that ultimately results in a WebPart when
fully applied.

This means both constructors of WebParts and functions that combine
WebParts are considered combinators for the purpose of the documentation
of this library.
## Sugar.Combinators.Authentication
<a name="sugar-combinators-authentication"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Provides combinators for performing
basic HTTP authentication/authorization.

More advanced authentication and authorization
schemes are left to the user to implement for
their own applications or frameworks.
#### authenticateBasic :: (string &#8594; string &#8594; bool) &#8594; WebPart &#8594; WebPart

See authenticateBasicAsync. This is the same thing but for a validation
function that is not asynchronous.
#### authenticateBasicAsync :: (string &#8594; string &#8594; Async () bool) &#8594; WebPart &#8594; WebPart

Returns a WebPart that will allow the user to access the provided WebPart
if they provided credentials that pass the provided test. Otherwise,
the user is provided an HTTP 401 Unauthorized response with a Basic
authentication challenge.
#### authenticateJWT :: (string, string, string, IBlackList) &#8594; (WebPart, (Error &#8594; WebPart)?) &#8594; WebPart

Constructs a WebPart that uses the JWT library to authenticate
the Authorization header. If the token is authenticated, the
payload is placed on the HttpContext as userToken.

If authentication succeeds, the specified WebPart is ran,
otherwise an appropriate error WebPart is ran.

TODO: This should also take an errMapper
#### IBlackList :: Object

An IBlackList is an object with a <code>check</code>
method that takes the payload of a JWT and returns an
<code>Async e ()</code>.

If the returned <code>Async e ()</code> is an error,
then we should forbid the request, even though we issued
the token originally.

The black list that is used should be stored in a quick
access way (such as in process or in an in memory data store).
#### parseAuthHeader :: string &#8594; (string, string, string)

Decodes the HTTP basic authorization header to extract
the authorization type, username, and password.
## Sugar.Combinators.Compression
<a name="sugar-combinators-compression"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Provides combinators for performing
compression on responses.
#### addCompression :: HttpRequest &#8594; WebPart

Adds compression to the HttpResponse if
the request accepts a supported encoding.
#### compress :: WebPart

Adds compression to the response, if the
requestor supports it.
#### compressionStreams :: Map string TransformStream

Map encoding types to compression stream constructors.
#### compressStream :: string &#8594; ReadableStream &#8594; ReadableStream

Compresses the provided stream with the compression
algorithm for the provided encoding.
#### supportedCompression :: Set string

Set of supported compression type.
## Sugar.Combinators.CQRS
<a name="sugar-combinators-cqrs"></a>
**Written By:** Joel Dentici

**Written On:** 7/13/2017

This module provides combinators for creating
CQRS applications and services.

These combinators take objects that fulfill an
interface for some service type and return WebParts
that expose those services over HTTP. They also perform
authentication of user details associated with the request,
using JWT.
#### Authenticator :: (WebPart, IErrorMapper) &#8594; WebPart

A WebPart combinator that checks user credentials before
applying the WebPart it receives.

This should perform the opposite operation of whatever your
IAuthenticator performs.
#### AuthInformation :: (string, string, string)

Auth information is used to construct a JWT
#### authService :: (string, string, string) &#8594; (string, IAuthService, IErrorMapper, int) &#8594; WebPart

Constructs a combinator for creating a specialized service that authenticates
user credentials. This function works exactly like writeService, but works with
an IAuthService (which can also be an IWriteService).

The request must match the specified path and must be a POST request. The error
mapper is used to map errors to WebParts. The integer argument specifies the amount
of time in milliseconds after which the token will expire.

The results returned by the WebPart will be JWT that have been encoded, in a text/plain
response.

NOTE: This is not for the service that provides user account management. Although
you can use the same JavaScript service object (ie, it implements IAuthService and
one or more of IWriteService, IQueryService) to provide that functionality as the one
you use for authentication, you must construct additional writeService and readService
WebParts to hook it into Sugar.
#### AuthServiceInfo :: Object

A configuration object with all the properties of ServiceInfo,
plus an integer expiration time

properties: path, service, resultMapper, errorMapper, expirationTime
#### CryptoInformation :: (string, string, string, IBlackList?)

Crypto information is used to construct an authentication
WebPart combinator.
#### IAuthenticator :: Object

An IAuthenticator is an Object with a <code>createToken</code>
method that takes a first argument of any type and
a second argument of expiration time (int). The result is an
<code>Either AuthenticationError string</code>.

This should perform the opposite operation of whatever your
Authenticator performs.
#### IAuthService :: Object

An IAuthService is an object with an <code>authenticate</code>
method, which takes a single object argument. The service uses
this to authenticate a user.

This method returns an <code>Async e a</code> where <code>e</code>
is the type handled by an IErrorMapper and <code>a</code> is the
type for whatever claims you intend to pass back to a client and
use for authorization at a later time.
#### IErrorMapper :: e &#8594; WebPart

An IErrorMapper is a function that takes
an error and returns a WebPart. It should case the error on
the expected errors to determine what WebPart to construct.

You may use whatever content-type you want for your error handler
WebParts, but you may make it more difficult to implement client
applications if you use different types.
#### IQueryService :: Object

An IQueryService is an object with an <code>query</code> method,
which takes a two object arguments. The first specifies the arguments
for the query and the second contains the details of the user's token,
or is undefined if authentication is not being used.

The method returns an <code>Async e a</code> where <code>e</code>
is the type handled by an IErrorMapper and <code>a</code> is the
type for a successful result. The WebPart combinator queryService
performs some special handling on a non-error result:

If the result is a file, we send it using the File combinators
If the result is a event stream (observable), we send it using the Event combinators
Otherwise the result is a type that can be JSON serialized, and we send it
in a normal OK 200 response with the application/json content-type
#### IResultMapper :: r &#8594; WebPart

Like IErrorMapper, but for actual results.
#### IWriteService :: Object

An IWriteService is an object with an <code>execute</code>
method, which takes two object arguments. The first is
the command to run and the second is the user payload.

The <code>execute</code> method returns an Async e a
where e is a type handled by the IErrorMapper and a is
a type that can be JSON serialized.
#### makeAuth :: CryptoInformation | Authenticator &#8594; Authenticator | null

Makes an authenticator from the CryptoInformation, if it is valid,
or returns null.

If an Authenticator is provided, it is returned.
#### queryService :: (string, string, string, IBlackList) &#8594; (string, IQueryService, IErrorMapper) &#8594; WebPart

Constructs a combinator that wraps IQueryServices into WebParts.

If the crypto information is undefined, then no authentication is used on the
returned WebParts. Just like in writeService, it is up to the IQueryService to
perform authorization on protected queries.

GET and HEAD requests at the specified path will be allowed through.

The result of the IQueryService will be mapped into a WebPart as follows
Errors go through the specified IErrorMapper
Files get downloaded
Event streams/Observables get turned into server-sent events
Anything else gets serialized to JSON and sent as 200 OK.
#### ServiceInfo :: Object

Service info is a configuration object that specifies
the path (string), IWriteService | IAuthService | IQueryService,
an IErrorMapper, and a IResultMapper. The result mapper
and error mapper are optional. The default error mapper
will try your error mapper first, and on anything else
JSON serialize the error message. The default result mapper
behavior varies on combinator type.

properties: path, service, resultMapper, errorMapper
#### writeService :: CryptoInformation | Authenticator &#8594; ServiceInfo &#8594; WebPart

Constructs a combinator that wraps services in a WebPart.

This constructor takes a tuple of private key, public key,
and algorithm to be used for JWT authentication. The returned
combinator takes a path, IWriteService and IErrorMapper.

The resulting WebPart after applying the combinator will filter
out non-POST method requests that don't match the path for the
service, as well as any requests that cannot be authenticated. It
is of course up to the service to authorize commands before processing
them.

The result of a successful command will be a JSON encoded value in a 200 OK
response. The result of a failed command depends on what the provided error
mapper does to handle it.
## Sugar.Combinators.Events
<a name="sugar-combinators-events"></a>
**Written By:** Joel Dentici

**Written On:** 7/13/2017

This module provides combinators to turn
JavaScript event streams (Rx Observables)
into HTTP event streams.

Responses from these combinators use the
server-sent events specification.
#### toEventStream :: Observable a &#8594; WebPart

Creates a WebPart that subscribes to the observable
and emits its events using server-sent events.

This should be used for each request that wants an
event stream.
## Sugar.Combinators.Files
<a name="sugar-combinators-files"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Functions for interacting with the filesystem
and combinators for serving static files. These
combinators can also be used with a custom file loading
scheme (see below).

Files are represented as an object containing a suggested name
for the file, a readable stream of the file's contents, and the
size in bytes of the file. If you construct an object like this,
it can be provided to the send or download combinators, depending
on what you would like the user's browser to do with the file (note
that the browser can choose to ignore the headers set by download
and not actually download the file to the file system).
#### browse :: (string, (string &#8594; string)) &#8594; WebPart

Returns a WebPart that allows the user to
browse a portion of the file system. Takes
the root path to browse at and a function to map
paths. Handles path resolution.
#### browsePath :: (string, string) &#8594; WebPart

Browse relative to the rootPath on the file system, excluding
startPath from the URL.
#### createFile :: (string, ReadableStream, int, RangeObject) &#8594; File

Creates a new File object using the specified parameters.

If a range is specified, the File will be sent as a partial
response when send is used.
#### directoryListing :: (string, string, RangeObject) &#8594; Async Error File

Creates an HTML directory listing from a directory.
#### displaySize :: int &#8594; string

Returns a human readable representation
of the provided size (which should be in bytes)
#### doFile :: (File &#8594; WebPart) &#8594; Object &#8594; Async Error WebPart

Reads a file from disk, then maps it to the appropriate
web part by applying the provided action.
#### download :: File &#8594; WebPart

Web Part that will cause a typical web browser to download
a file with a specified file name. The file is sent in an HTTP 200 OK
response. This is equivalent to send, but will attempt to force a browser
to download the file and will suggest that the browser uses the file name
provided by the file object.
#### downloadFile :: string &#8594; Async Error WebPart

Loads a file from disk asynchronously and then maps it
to a web part that will download the file.
#### emoji :: String

A base64 encode string containing the emoji font we use for the directory
and file icons. It is a bit unfortunate that we are loading a whole font
for two unicode characters.

This is done so we don't need to worry about handling some strange route
to load the font -- we just send it inline with the directory listing.
#### getRange :: HttpRequest &#8594; RangeObject

Parses the range header of an HTTP Request and
returns an object containing the range.
#### openFile :: Object &#8594; Async Error File

Opens a file on the local filesystem.
#### readdir :: string &#8594; Async Error [string]

Reads the files in a directory.
#### resolvePath :: (string, string) &#8594; string

Resolves the file name provided relative to the root
path provided. The resulting path is guaranteed to be
a subpath of the rootPath.
#### send :: File &#8594; WebPart

WebPart that send the byte stream contained in the file object
to the client. Sent in an HTTP 200 OK or 206 Partial response.

If the File is a partial File, then a partial response will be
sent.

The Content-Type header will be set as follows:

If the extension in file.name is in context.runtime.mime
then the mime type will be used

Otherwise, 'application/octet-stream' will be used, which
will cause most browsers to download the file
#### sendFile :: string &#8594; Async Error WebPart

Loads a file from disk asynchronously and then maps it
to a web part that will send the file.
#### stat :: string &#8594; Async Error Stat

Stats a file on the local filesystem.
#### toHTML :: [(string, Stat)] &#8594; string

Given a directory listing (a list of tuples of
file names and stats), creates an HTML representation
of the directory that supports navigation.
## Sugar.Combinators.Filters
<a name="sugar-combinators-filters"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Combinators for filtering requests by
the information contained within them.
#### choose :: [WebPart] &#8594; WebPart

Picks from a list of WebParts by choosing the first WebPart that
accepts the HttpContext provided.
#### DELETE :: WebPart

Filters out requests that are not HTTP DELETE
#### extract :: string &#8594; string &#8594; [int|number|string]

Extracts arguments from a text path that match
parameters in a pattern path, in the style of
scanf.
#### GET :: WebPart

Filters out requests that are not HTTP GET
#### HEAD :: WebPart

Filters out requests that are not HTTP HEAD
#### method :: string &#8594; WebPart

Create a WebPart that filters on an HTTP Method.
#### path :: string &#8594; WebPart

Filters out requests whose URI does not match
the provided URI.
#### pathMatch :: string &#8594; (...int|number|string &#8594; WebPart) &#8594; WebPart

Matches a pattern in the style of scanf in the request's
path, extracts the arguments from the path, and passes them to
the provided function to get the resulting web part.
#### pathStarts :: string &#8594; WebPart

Filters out requests whose URI does not start
with the provided URI.
#### POST :: WebPart

Filters out requests that are not HTTP POST
#### PUT :: WebPart

Filters out requests that are not HTTP PUT
#### test :: (HttpContext &#8594; boolean) &#8594; string &#8594; WebPart

Useful to create combinators that test the current
request context for some property to filter requests.

If the predicate returns true for a request, then the
composition path on the returned combinator will be
followed. Otherwise, the returned combinator will fail
to match the request and signal an error.
## Sugar.Combinators.Intermediate
<a name="sugar-combinators-intermediate"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Combinators for serving HTTP 1xx status responses
#### CONTINUE :: WebPart
#### SWITCHING_PROTO :: WebPart
## Sugar.Combinators.Misc
<a name="sugar-combinators-misc"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Miscellaneous combinators that don't really
fit into any other specific module.
#### timeout :: int &#8594; WebPart &#8594; WebPart

Creates a web part that will time out if the specified
web part does not complete processing in the specified
timespan (milliseconds).

The provided WebPart will not be cancelled as it will
have already started processing. Typically you shouldn't
use this anyway and your timeouts should happen in your code.
## Sugar.Combinators.Output
<a name="sugar-combinators-output"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Provides combinators for creating and
modifying HTTP responses.
#### encoding :: string &#8594; WebPart

Sets the content encoding. This will cause
compression of the output stream to occur.
#### mime :: string &#8594; WebPart

Web Part that sets the
Content-Type header for the HTTP response
#### response :: int &#8594; Buffer | ReadableStream &#8594; WebPart

General purpose HTTP response web part that accepts the HTTP status
code, and the response content. The response content can be in the
form of a byte buffer, or a File, which consists of a ReadableStream,
file name, mime type, and file size.
#### setHeader :: string &#8594; string &#8594; WebPart

Web Part that sets an HTTP response header to a given
value.
#### text :: int &#8594; string &#8594; WebPart

Like response, but also sets the content type to
text/plain.
## Sugar.Combinators.Proxy
<a name="sugar-combinators-proxy"></a>
**Written By:** Joel Dentici

**Written On:** 8/2/2017

Combinators for proxying HTTP requests to another
server.
#### HttpRequestInfo :: Object

An object with the following properties:

url - string
method - string
headers - string

These properties specify how the proxy agent
will make the proxied request. The data for the
request will be the same as the original.
#### proxy :: (HttpRequest &#8594; HttpRequestInfo) &#8594; WebPart

Proxy an HTTP request. The specified function is applied
to every request to get an object describing where to make
the proxied request.

The data for the proxied request is exactly that of the
original request. Due to this, you must set `parseForm` to
false in your Sugar server config. To use form parsing with
a server that does proxying, you must manually parse each form
in your routes. If you do not set `parseForm` to false, then there
will be no data left to pipe to the proxied request. At a later time,
we may buffer the request body when automatically parsing a form, thus
making a new request body stream available.
## Sugar.Combinators.Redirection
<a name="sugar-combinators-redirection"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Combinators for HTTP 3xx status responses.
#### FOUND :: URI &#8594; WebPart

HTTP 302 Moved Temporarily response that
indicates the resource can temporarily be
found at the provided uri.
#### MOVED_PERMANENTLY :: URI &#8594; WebPart

HTTP 301 Moved Permanently response that
indicates the resource has been moved
#### NOT_MODIFIED :: WebPart

HTTP 304 Not Modified Web Part response. The
browser should load the requested resource from
its cache.
#### redirect :: URI &#8594; WebPart

Temporarily moved response with body for browsers
that do not perform automatic redirection.
## Sugar.Combinators.RequestErrors
<a name="sugar-combinators-requesterrors"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Combinators for serving 4xx status
HTTP responses.
#### BAD_REQUEST :: string &#8594; WebPart

HTTP status 400 response with text/plain content type.

Used when a request is malformed.
#### challenge :: WebPart

HTTP status 401 Basic Challenge.
#### CONFLICT :: string &#8594; WebPart

HTTP status 409 response with message to client.
#### FORBIDDEN :: string &#8594; WebPart

HTTP status 403 response with message to client.

Used when access to a resource is forbidden to the
client and authorization will not gain them access.
#### GONE :: string &#8594; WebPart

HTTP status 410 response with message to client.

Used when a resource cannot be located, but we know
that it previously existed.
#### METHOD_NOT_ALLOWED :: string &#8594; WebPart

HTTP status 405 response with message to client.

Used when an HTTP method is not allowed for some
URI.
#### NOT_ACCEPTABLE :: string &#8594; WebPart

HTTP status 406 response with message to client.

The response is of a type that the client does
not accept, but the server otherwise processed
the request properly.
#### NOT_FOUND :: string &#8594; WebPart

HTTP status 404 response with text/plain content type.

Used when a resource cannot be located.
#### PRECONDITION_REQUIRED :: string &#8594; WebPart

HTTP status 428 response with message to client.

Sent when the server requires the request to be conditional.
#### REQUEST_TIMEOUT :: string &#8594; WebPart

HTTP status 408 response with message to client.

Used when the servers determines that processing
a request is taking to long and decides to terminate
it.
#### TOO_MANY_REQUEST :: string &#8594; WebPart

HTTP status 429 response with message to client.

Used with rate limiting schemes to prevent clients
from sending too many requests in a short period of
time.
#### UNAUTHORIZED :: string &#8594; WebPart

HTTP status 401 response requesting basic authentication
for a resource from a client.
#### UNPROCESSABLE_ENTITY :: string &#8594; WebPart

HTTP status 422 response with message to client.

Used when the server can parse the request, but cannot
process it (it is semantically meaningless, but syntactically
meaningful).
#### UNSUPPORTED_MEDIA_TYPE :: string &#8594; WebPart

HTTP status 415 response with message to client.

Used when the server does not recognize the content
type of the request body.
## Sugar.Combinators.ServerErrors
<a name="sugar-combinators-servererrors"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Combinators for serving 5xx status HTTP responses
#### BAD_GATEWAY :: string &#8594; WebPart

HTTP 502 Bad Gateway. An upstream server
returned an invalid response when this
server was acting as a gateway.
#### GATEWAY_TIMEOUT :: string &#8594; WebPart

HTTP 504 Gateway Timeout. An upstream server
did not respond in a timely manner when this
server was acting as a gateway.
#### INTERNAL_ERROR :: string &#8594; WebPart

HTTP 500 Status Internal Service Error
response. Used when an unexpected error
occurs and no more information exists to
give a better error.
#### INVALID_HTTP_VERSION :: string &#8594; WebPart

505 HTTP Version Not Supported. The server
does not support the version of the HTTP
protocol used in the request.
#### NOT_IMPLEMENTED :: string &#8594; WebPart

HTTP 501 Not Implemented Error. The
requested service is not yet available,
but is likely to be implemented in the
future.
#### SERVICE_UNAVAILABLE :: string &#8594; WebPart

HTTP 503 Service Unavailable. The server is
not currently available.
## Sugar.Combinators.Successful
<a name="sugar-combinators-successful"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

Combinators for serving HTTP 2xx status responses.
#### ACCEPTED :: string &#8594; WebPart

HTTP status 202 response
#### CREATED :: string &#8594; WebPart

HTTP status 201 response
#### NO_CONTENT :: WebPart

HTTP status 204 response
#### OK :: string &#8594; WebPart

HTTP status 200 response with text/plain content type
## Sugar.Server
<a name="sugar-server"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

This module implements the HTTP/HTTPS
server functionality for Sugar.

This module exports two functions:
startWebServer and defaultConfig
#### addDefaults :: HttpRequest &#8594; WebPart

Adds the default headers.
#### createContext :: Object &#8594; Object &#8594; Object &#8594; Async () HttpContext

Extracts and further parses the request data from the
node HTTP server to create a Sugar HttpContext
#### defaultConfig :: () &#8594; Object

A constant function that returns the default Sugar
application configuration object. The returned object
can be modified before being passed to startWebServer to
change properties of the web server.
#### formParsers :: Map string (Buffer &#8594; Async Error (Map string (string | FileUpload)))

Map content types to functions that will
parse the request body.
#### getRawForm :: NodeHttpRequest &#8594; Async () Buffer

Extracts the data from the Node HTTP Server Request.
#### httpsConfig :: Object &#8594; Object

Loads the SSL private key and signed certificate
pair from disk, given the configuration object
for startWebServer.

The returned object can be passed to the nodejs
https server constructor.
#### parseForm :: NodeHttpRequest &#8594; Async Error (Map string (string | FileUpload))

Parses the request body to get the form. If there is no
parser for the content type of the request, then no request
data is read and the form is undefined.
#### parseJSONForm :: Buffer &#8594; Async () (Map string string)

Parses a form that is encoded as JSON.
#### parseMultiPartForm :: Buffer &#8594; Async Error (Map string (string | FileUpload))

Parses a multipart/form-data form.
#### parsePlainTextForm :: Buffer &#8594; Async () (Map string string)

Parses a plain text form.
#### parseRequest :: NodeHttpRequest &#8594; Async () HttpRequest

Performs further processing on the incoming node HTTP Request
before mapping it to a Sugar HTTP Request and returning it in
a Async.
#### parseUrlEncodedForm :: Buffer &#8594; Async () (Map string string)

Parses a form that is urlencoded by using
the URI query string parser.
#### startWebServer :: (Object, WebPart, int) &#8594; HttpServer

Runs a web server that processes each request
through the specified Web Part.

The verbosity levels cause logging as follows:
0 - Log errors that the application fails to handle or server fails to handle
1 - Logging when server starts listening and when an error occurs
2 - Logging of requests + Level 1
3 - Level 2 + Logging of HttpContext before and after processing
## Sugar.Utility.JWT
<a name="sugar-utility-jwt"></a>
**Written By:** Joel Dentici

**Written On:** 7/12/2017

Provides an implementation of JSON Web
Tokens.
#### algs :: Map string ((string, string) &#8594; JWTAlgorithm)

Constructors for the cryptographic algorithms used by JWT
#### authenticateToken :: JWT &#8594; (string, string) &#8594; Either Error Object

Verifies that the provided JSON web token was signed by
our key.

If verification succeeds, the payload portion of the token
is returned. Otherwise, an error is returned.
#### AuthError :: string &#8594; AuthenticationError

Creates an authentication error with the
specified reason for failing.
#### createToken :: JWT &#8594; (Object, string) &#8594; Either Error string

Creates a JSON web token. If successful, the JWT is returned
as a '.' separated base64 string that can be passed to
authenticateToken.
#### decode :: string &#8594; Either Error Object

Decodes a base64 string to a JavaScript
object.
#### encode :: Object &#8594; string

Encodes a JavaScript object to a
base64 string.
#### hmacsha :: int &#8594; (string, string) &#8594; JWTAlgorithm

Constructs an HMAC SHA-bits JWTAlgorithm.

This will create a message authentication code for the signature
using the private key. As HMAC SHA are hash MAC algorithms, we simply
verify the MAC when authenticating a token by hashing it again and
comparing the MACs. We do not use the public key at all.
#### JWT :: (string, string) &#8594; JWT

Constructs a JWT that uses the specified
private and public keys for signing and verification
(unless HMACs are used, in which case only the private
key is used).
#### new :: (string, string) &#8594; JWT

Constructs a JWT
#### split :: Object &#8594; Either Error [string]

Attempt to split the incoming token.
## Sugar.Utility.Parsers
<a name="sugar-utility-parsers"></a>
**Written By:** Joel Dentici

**Written On:** 6/18/2017

This module provides functions to parse
incoming request data.

Node's http module already does most of the parsing of the HTTP request,
but these functions allow us to do some of the additional
parsing that allows providing the application developer with request
parameters (form data, query string data, etc.).
#### parsePlain :: string &#8594; Map string string

Parses a text/plain encoded form, which is the same
as parsing a URI encoded form, but without decoding
any special symbols (I believe this is someone trying
to get unicode in with a charset (utf-8) instead of
encoding the unicode to ascii).

This is not widely used and only implemented because
a few other servers implement it.
#### parseQuery :: string &#8594; Map string string

Takes a URI Encoded form and parses it into
a map of key-value string pairs (actually an object).

TODO: This needs to decode characters, consider using
Node query module.
#### parseUrl :: string &#8594; (string, Map string string)

Takes a URI and splits it into the URI and query string
components, and parses the query string.
