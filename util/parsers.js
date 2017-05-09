const parseQuery = exports.parseQuery = function(query) {
	return (query || '')
		.split("&")
		.map(x => x.split("="))
		.reduce((acc, x) => {
			acc[x[0]] = x[1];
			return acc;
		}, {});
}

exports.parseUrl = function(input) {
	const [url, query] = input.split("?");

	const queryFields = parseQuery(query);

	return [url, queryFields];	
}