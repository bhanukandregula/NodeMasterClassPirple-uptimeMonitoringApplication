/**
 * This is the primary file for thr API.
 * API - Application programming interface.
 */

// require the dependencies.
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare the app
const app = {};

// Initialize the function, this function will call the server and worker files.
app.init = function(){
    // start the server
    server.init();

    // start the worker
    workers.init();
};

// Execute the function.
app.init();

// Export the app.
module.exports = app;