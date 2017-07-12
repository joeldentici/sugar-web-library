/*
To test:

node test.js > /dev/null

There should be no output.

*/

const Sugar = require('../src/sugar.js');

const test = {
	jwt: () => require('./jwt.ejs'),
	events: () => require('./events.ejs'),
};

const [arg] = process.argv.slice(2);

if (arg)
	test[arg]();
else
	Object.keys(test).forEach(key => test[key]());