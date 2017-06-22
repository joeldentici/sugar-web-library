# sugar
Sugar provides a better web development experience with Node.js. A Sugar application is built by composing pure "WebParts." This is in contrast to typical web libraries and frameworks that insist you register your nasty impure effectful code with their nasty impure effectful code.

You of course aren't held to writing strictly "pure" functions in the Haskell sense, but we do reify continuations as Promises and steal some ideas from Haskell that Haskell stole from Category Theory to compose them.

The inspiration for Sugar came from [https://suave.io/](Suave) and its API is heavily influenced (it's a near copy of) by the API for Suave.

## Hello, World
Below is the classic Hello, World! application written using Sugar.

```
const Sugar = require('sugar');
const {OK} = Sugar.Successful;
const {startWebServer, defaultConfig} = Sugar.Server;

startWebServer(defaultConfig(), OK('Hello, World!'));
```

## A slightly more reasonable example

```
const Sugar = require('sugar');
const {OK} = Sugar.Successful;
const {GET, path, choose, pathMatch} = Sugar.Filters;
const {browse, sendFile} = Sugar.Files;
const {startWebServer, defaultConfig} = Sugar.Server;
const {request, asyncRequest} = Sugar;

function greet({query}) {
	if (query.name) {
		return OK(`Hello ${query.name}`);
	}
	else {
		return OK(`Please tell me your name so I can greet you.`);
	}
}

const app = choose(
	GET
		.arrow(path('/greet'))
		.arrow(request(greet)),
	GET
		.arrow(pathMatch(
			'/add/%d/%d',
			(a, b) => OK(`${a} + ${b} = ${a + b}`))
		),
	GET
		.arrow(pathStarts('/js')
			.or(pathStarts('/css'))
			.or(pathStarts('/img')))
		.arrow(browse('static_assets')),
	GET
		.arrow(asyncRequest(_ => sendFile('static_assets/index.html')))
);

startWebServer(defaultConfig(), app);
```