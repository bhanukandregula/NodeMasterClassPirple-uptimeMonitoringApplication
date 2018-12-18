/**
 * Author: Bhanu Kandregula
 * Github: www.github.com/bhanukandregula
 * Subject: This is the primary file for Uptime Monitoring application API.
 * 
 * These are server related tasks.
 */

// Require the dependensies.
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

// Instantiate server module object
var server = {};

// Instantiate the HTTP server.
server.httpServer = http.createServer(function (request, response) {
    server.unifiedServer(request, response);
});

// Instatntiate keys required for HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

// Instantiate the HTTPS server.
server.httpsServer = https.createServer(server.httpsServerOptions, function (request, response) {
    server.unifiedServer(request, response);
});

// All the server logic for both HTTP and HTTPS server - Unified server
server.unifiedServer = function (request, response) {
    // Get the URL and parse it.
    const parsedUrl = url.parse(request.url, true);

    // Get the path from the URL.
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object.
    const queryStringObject = parsedUrl.query;

    // Get the HTTP method name.
    const method = request.method;

    // Get the headers as an object.
    const headers = request.headers;

    // Get the payload, If there is any.
    const decoder = new StringDecoder('utf-8');
    var buffer = '';

    // Data will be called if there any payload from the request.
    request.on('data', function (data) {
        buffer += decoder.write(data);
    });

    // Irrespective of payload, end will call for every request.
    request.on('end', function () {
        buffer += decoder.end();

        // Choose the handler this request should go to. If one is not found, use the notFound handler.
        var chooseHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // if the request is within the public directory, use tge public handler instead.
        chooseHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chooseHandler;

        // Construct the data object to send to the handler.
        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };

        // Route the request to the Handler, specified in the router.
        chooseHandler(data, function (statusCode, payload, contentType) {

            // Determine the type of response callback to JSON.
            contentType = typeof (contentType) == 'string' ? contentType : 'json';

            // Use the status code called back by the Handler, or Default to 200
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

            // Return the response-parts that are common to content specific.
            var payloadString = '';
            
            if (contentType == 'json') {

                // Set headers to JSON.
                response.setHeader('Content-Type', 'application/json');

                // Use the payload called back by the Handler or Default to empty object.
                payload = typeof (payload) == 'object' ? payload : {};

                // Convert the payload to a String.
                // This is the payload Handler is sending back.
                payloadString = JSON.stringify(payload);
                console.log("payloadString in JSON: ", payloadString);
            }

            if (contentType == 'html') {
                // Set headers to HTML.
                response.setHeader('Content-Type', 'text/html');
                // Use the payload called back by header.
                payloadString = typeof (payload) == 'string' ? payload : '';
            }

            if (contentType == 'favicon') {
                // Set headers to HTML.
                response.setHeader('Content-Type', 'image/x-icon');
                // Use the payload called back by header.
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'css') {
                // Set headers to HTML.
                response.setHeader('Content-Type', 'text/css');
                // Use the payload called back by header.
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'png') {
                // Set headers to HTML.
                response.setHeader('Content-Type', 'image/png');
                // Use the payload called back by header.
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'jpg') {
                // Set headers to HTML.
                response.setHeader('Content-Type', 'image/jpg');
                // Use the payload called back by header.
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'plain') {
                // Set headers to HTML.
                response.setHeader('Content-Type', 'text/plain');
                // Use the payload called back by header.
                payloadString = typeof (payload) !== 'undefined' ? payload : '';
            }

            //Return the response-parts that common to all content Types.
            response.writeHead(statusCode);
            response.end(payloadString);

            // Log the Path of what user is accessing.
            // console.log('Request received on path: '+trimmedPath+ ' with '+method+' method. And with these query string parameters.', queryStringObject);
            //console.log('Request received with these headers', headers);
            //console.log('Request received with this payload: ', buffer);
            console.log('Returning this response: ', statusCode, payloadString);

        });
    });
};


// Define a request routers.
server.router = {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/delete': handlers.accountDelete,
    'session/create': handlers.sessionCreate,
    'session/delete': handlers.sessionDelete,
    'checks/all': handlers.checksList,
    'check/create': handlers.checksCreate,
    'checks/delete': handlers.checksDelete,
    'checks/edit': handlers.checksEdit,
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    'favison.ico': handlers.favicon,
    'public': handlers.public
};

// init script
server.init = function () {
    // Start the server and assign port to it.
    server.httpServer.listen(config.httpPort, function () {
        console.log(`HTTP Server is listening on PORT ${config.httpPort} in ${config.envName} environment.`);
    });

    // Start the HTTPS server and assign port to it.
    server.httpsServer.listen(config.httpsPort, function () {
        console.log(`HTTPS Server is listening on PORT ${config.httpsPort} in ${config.envName} environment.`);
    });
}


// Export the server object.
module.exports = server;