/**
 * There are related to the workers.
 * Workders are going to do: Gather up all the checks.
 */

// require the dependencies.
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');

// Instantiate the worker object
var workers = {};

// Look up all the checks, get their data and send to a validator.
workers.gatherAllChecks = function () {
    // Get all the check that exists in the system.
    _data.list('checks', function (error, checks) {
        if (!error && checks && checks.length > 0) {
            checks.forEach(function (check) {
                // Read the check data.
                _data.read('checks', check, function (error, originalCheckData) {
                    if (!error && originalCheckData) {
                        // pass the data to check validator, and let that function log errors as needed.
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log("This is the error: ", error);
                        console.log("Error reading one of the check of data.");
                    }
                });
            });
        } else {
            console.log("Error: could not find any checks to process.");
        }
    });
};

// Sanity-check the check data.
workers.validateCheckData = function (originalCheckData) {

    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};

    originalCheckData.id = typeof (originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;   
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;    
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not be set ( if the workers have never seen thios check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
   
    // If all the checks pass, pass the data along to the next step in the process.
    if (originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) { 
        workers.performCheck(originalCheckData);
    } else {
        console.log("One of the checks is not properly formatted, skipping it.");
    }
};

// perform the check, send the original check data and the outcome of the check process.
workers.performCheck = function(originalCheckData) {
    // prepare the initial check outcome.
    var checkOutcome = {
        'error': false,
        'responseCode': false
    };

    // Mark the outcome that not been sent yet.
    var outcomeSent = false;

    // parse the hostname and the path out of the original check data.
    var parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path; // using path, not pathname - because we want the query string.
    

    // Construct the request.
    var requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    }

    // Instantate the request object (using HTTP or HTTPS module)
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var request = _moduleToUse.request(requestDetails, function(response) {
        // Grab the status of the sent request.
        var status = response.statusCode;
        // update the check put come and pass the data along.
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutCome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the Error event so it doesn't get thrown.
    request.on('error', function (e) {
        // update the check out come and pass the data along.
        checkOutcome.error = {
            'error': true,
            'value': e
        };
        if(!outcomeSent) {
            workers.processCheckOutCome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event
    request.on('timeout', function (e) {
        // update the check out come and pass the data along.
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };
        if (!outcomeSent) {
            workers.processCheckOutCome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // End the request.
    request.end();
};

// process the check outcome, update the check data as needed, trigger an alert to the user If needed.
// Special Logic, for accomodating a check that has never been tested before. (Don't alert on it.)
workers.processCheckOutCome = function (originalCheckData, checkOutcome) {
    // Decide of the checm is up or down.
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    // Decide If an alert is warrented.
    var alertWarrented = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Update the check data.
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    // log the outcome of the check..
    var timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarrented, timeOfCheck);

    // Save the udpated.
    _data.update('checks', newCheckData.id, newCheckData, function (error) {
        if (!error) {
            // Send the new check data to the next phase in the process, if needed.
            if (alertWarrented) {
                // TO@DO - Uncomment this line, so Twiolo SMS will work.
                //workers.alertUsersToStatusChange(newCheckData);
            } else {
                console.log("Check outcome has not been changed, no alert needed.");
            }
        } else {
            console.log("Error rying to save to one of the updates.");
        }
    });
};

// Alert user to change in their check status.
workers.alertUsersToStatusChange = function(newCheckData) {
    var message = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, message, function (error) {
        if (!error) {
            console.log('Success: user was alerted to a status change in their check, via SMS: ', message);
        } else {
            console.log('could not send SMS alert to user who has a state change on their check.');
        }
    });
}

// write the workers.log function and get those write to file in system file system.
workers.log = function(originalCheckData, checkOutcome, state, alertWarrented, timeOfCheck){
    // Form the log data and write it to file.
    var logData=  {
        'check' : originalCheckData,
        'outcome' : checkOutcome,
        'state' : state,
        'alert' : alertWarrented,
        'time' : timeOfCheck
    }

    // convert object data to a string.
    var logString = JSON.stringify(logData);

    // Determine the name of the logFile.
    logFileName =  originalCheckData.id;

    // Append the log stream to the file we want to.
    _logs.append(logFileName, logString, function(error){
        if(!error){
            console.log("Logging to file succeeded");
        }else{
            console.log("Logging the file filed.");
        }
    });
}

// This is a timer to execute the worker process, once per minute.
workers.loop = function () {
    setInterval(function () {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

// Rotate a compress the log files.
workers.rotateLogs = function(){
    // List all the non compressed log files.
    _logs.list(false, function(error, logs){
        if(!error && logs && logs.length > 0){
            logs.forEach(function(logName){
                // compress the data to a diffferent file.
                var logId = logName.replace('.log','');
                var newFileId = logId+'-'+Date.now();

                _logs.compress(logId, newFileId, function(error){
                    if(!error){
                        // Truncate the log.
                        _logs.truncate(logId, function(error){
                            if(!error){
                                console.log('Success trucncating log file.');
                            }else{
                                console.log('Error truncating log File.');
                            }
                        });
                    }else{
                        console.log('Error compressing one of the log files***.', error);
                    }
                });
            });
        }else{
            console.log('Could not find any rotation logs to compress.');
        }
    });
};

// This is a timer tomexecute logRotation process once per day.
workers.logRotationLoop = function(){
    setInterval(function(){
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24)
};

// Init the worker.
workers.init = function () {
    // Execute all the checks, as soon as it starts up.
    workers.gatherAllChecks();

    // call the loops so the checks will execute later on.
    workers.loop();

    // compress all the logs immeadiatly.
    //workers.rotateLogs();

    // Call the compression loop, so logs will compressed later on.
    //workers.logRotationLoop();
}

// Export the modules.
module.exports = workers;
