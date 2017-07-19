# Sugar Web Library
Sugar is a web application library for Node.js providing combinators to solve most of the problems faced in creating a typical Web application.

Sugar is heavily influenced by [Suave](https://suave.io) and borrows some of its API. This is not a replica of it though, there are some differences.

Sugar is not a framework and is unopinionated. Sugar provides you a way to easily expose an interface to your own code over HTTP. All you need to do is provide bindings to your services that return `Async`s. Sugar is built using `monadic-js`, which provides an implementation of this. It has only been tested using this implementation as well. If you create bindings to your service that return Promises or another implementation of `Async` (also known as lazy Future or Task) that you can turn into a Promise, you can easily convert them to a `monadic-js.Async` with `Async.fromPromise`. See the examples below to learn how to connect non-Sugar code to Sugar code.

### What Sugar does for you
Sugar provides combinators and operators for handling many common tasks when constructing a Web application/service:

  * Authentication
  * Compression
  * Events
  * Files
  * Filtering requests
  * Handling errors
  * Output
  * Composing the above
  
Keep reading to see how you can use these things.

## Installation
Currently not on NPM. First `monadic-js` needs to be completed and put on NPM.

Run `npm install --save sugar-web-library`.

## Hello, World!
Writing "Hello, World!" with Sugar is very easy, just put the following into a JavaScript file:

```js
const Sugar = require('sugar-web-library');
const {OK} = Sugar.Combinators.Successful;
const {startWebServer, defaultConfig} = Sugar.Server;

startWebServer(defaultConfig(), OK('Hello, World!'));
```

Run that file with node. You can open a browser and go to `http://localhost:7842` or any path on that host/port and you will see the text "Hello, World!"

## Composing "WebParts"
Before we show some more complicated examples, it will be useful to know how we can build bigger applications out of smaller applications. In Sugar, a web application or web service is just a `WebPart` and we can combine small `WebPart`s together to get big `WebPart`s. Because of this, you can take any Sugar web application or web service, and without modifying it in any way whatsoever, include it in a larger application or service! (Ok, fine, in practice it isn't as perfect as in theory, but it does work pretty well). Each `WebPart`, as you will see encapsulates an action that can be performed in resolving an HTTP request. If you give your `WebPart`s semantic names, then what you will end up with is a nice executable description of the control flow of your web application/service with terms from its own problem/business domain.

In the "Hello, World!" example above, `OK` is an example of a `WebPart`. What is a `WebPart`? It is just a function whose type (using HM type signatures from here on out) is `HttpContext -> Async Error HttpContext`. `Async` is of course an asynchronous computation whose execution has been deferred.

What is an `HttpContext`? It represents the state of an HTTP request that we are currently constructing a response to. It is composed of an `HttpRequest`, an `HttpResponse`, an `HttpRuntime`, and any other fields that a combinator may decide to put on during processing. An `HttpRequest` contains information about the HTTP request that was received by the server. An `HttpResponse` contains the status code, response headers, and response content which are the components we need to send a response back to the client. An `HttpRuntime` contains information about the server configuration the application is being ran under. You can therefore think of `HttpContext` as sort of a combination of what the `Reader` and `State` monad give you (if you are familiar with them) -- pure configuration passing and pure stateful computation threading with all the ugliness hidden. This is all wrapped up as an `Async` which gives us error handling and asynchronous execution.

Before we learn how to compose `WebPart`s, we need to recognize exactly what we are trying to solve by composing them. One thing we would like to do is run a `WebPart` on a context, and then run another one on the resulting context if it is successful. With this we can perform filtering and incrementally build up a response. Another thing we would like to do is choose between `WebPart`s. A simple way to do this is to run the first `WebPart` on a context, and if it is successful, stop with its result. Otherwise we will run the second, and the third, and so on until one is successful.

If you spend too much time reading about or using Haskell, Scala, or any other language with monads baked in, you may have noticed that the type for `WebPart` looks exactly like `Monad m => a -> m b`, where `a = b = WebPart` and `m = Async Error`, which is of course the type of a monadic function. If so, you probably already guessed how we will be composing these things: Kleisi composition, `>=>`. This operator takes two monadic functions, which `WebPart`s are, and composes them from left-to-right: `(>=>) :: Monad m => (a -> m b) -> (b -> m c) -> (a -> m c)`. Because `a = b = c = HttpContext`, what we wind up with is a new function that is `HttpContext -> Async Error HttpContext`. In other words, we get another `WebPart`. What this resulting `WebPart` will do is apply an `HttpContext` to the left `WebPart` to get a second `HttpContext` and then apply the right `WebPart` to the second `HttpContext` to get the resulting `HttpContext`. Since this is happening under `Async`'s monadic bind/chain, if the left `WebPart` fails, then the right `WebPart` is not applied.

We also have to deal with choice and for that we have two styles. We can use the `Sugar.Combinators.Filters.choose` combinator which accepts any number of WebParts and runs them on a request until one of them doesn't give an error result. The other option that we have is to use the alternative operator `<|>`: `(<|>) :: Alternative f => (a -> f b) -> (a -> f c) -> (a -> f (b | c))`. With `WebPart`s, this means we apply the first `WebPart`, and if it is successful we don't apply the second `WebPart`. If it is not successful, then we apply the second `WebPart`.

It turns out that `<|>` and `>=>` are a very powerful combination and mostly all you need to compose `WebPart`s. There are other higher-order combinators besides `choose` which provide functions that `<|>` and `>=>` don't though.

Now we are ready for more examples.

## More examples
Todo: add more examples.

## CQRS
Sugar provides combinators for structuring a CQRS application. Unlike the rest of Sugar, these are highly opinionated and force you to follow a very strict structure. Despite this strictness, `Sugar.CQRS.{writeService,authService,readService}` allow you to quickly expose your JavaScript APIs over the web.

## More information
Please read [documentation.html](documentation.html) for more information.

## Contributing
Contributions are welcome. Currently just follow the standard fork-commit-push-pull request model. If this gets attention and people want to collaborate I will start an organization for this and we can start coming up with actual guidelines for style and contribution.
