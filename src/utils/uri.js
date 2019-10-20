'use strict';

function base_uri(uri) {
	const splitOnParams = uri.split('?');
	const pathArray = splitOnParams[0].split( '/' );
	const protocol = pathArray[0];
	const host = pathArray[2];
	return protocol + '//' + host;	
}

function uri_without_params(uri) {
	const pathArray = uri.split('?');
	return pathArray[0];
}

exports.base_uri = base_uri; 
exports.uri_without_params = uri_without_params; 