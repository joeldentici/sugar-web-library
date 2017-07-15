# Sugar Web Library #

Sugar is a web application library providing combinators to construct most of the features required by a typical Web application.

Sugar is heavily influenced by [Suave](https://suave.io).

Sugar is unopinionated as to the structure of your web application. All you need to do is provide bindings to
your services that return Asyncs.

Sugar provides combinators for handling many common problems in construction a Web application/API:

  * Authentication
  * Compression
  * Events
  * Files
  * Filtering requests
  * Handling errors
  * Output
  
Sugar provides combinators for most of the above use cases. Read [documentation.html](documentation.html) for
more information.

# CQRS #

Sugar provides combinators for structuring a CQRS application.

Please read [documentation.html](documentation.html) for more information.

Sugar.CQRS.writeService, authService, and readService allow you to quickly expose your JavaScript APIs over the web.

