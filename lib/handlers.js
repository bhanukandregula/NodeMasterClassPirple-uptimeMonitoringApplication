/**
 * There are the request handlers.
 */

// Require the dependencies.
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
const fs = require('fs');


// //This is for the test Twilio text.
// helpers.sendTwilioSms('5167284204', 'Bhanu Prakash', function(error){
//     if(!error){
//         console.log("***SMS Sent***");
//     }else{
//         console.log("Message could not sent, error is: ", error);
//     }

// });

// Define the Handlers.
var handlers = {

};

/**
 * From here, is for HTML handlers.
 */

// This is a Index handler.
handlers.index = function (data, callback) {
    //callback(undefined, undefined, 'html');
    // Reject any request that isn't a GET.
    if (data.method == 'GET') {

        // Prepare data for Interpolation
        var templateData = {
            'head.title': 'Uptime Monitoring - Made Simple',
            'head.description': 'We offer free simple uptime monitoring for HTTP/ HTTPS for all kinds. When site goes down, will send you Text',
            'body.class': 'index'
        };

        // Read in the index template and a string.
        helpers.getTemplate('index', templateData, function (error, string) {
            if (!error && string) {
                // Add the universal header and footer
                helpers.addUniversalTemplates(string, templateData, function (error, string) {

                    if (!error && string) {
                        callback(200, string, 'html');
                    } else {
                        callback(200, undefined, 'html');
                    }
                });
            } else {
                callback(500, undefined, 'html');
            }
        });
    } else {
        callback(405, undefined, 'html');
    }
};

// Create Account Handlers.
handlers.accountCreate = function(data, callback){
    // Reject any request that isn't a GET
    if(data.method == 'GET'){
        // Prepare data for Interpolation.
        var templateData = {
            'head.title' : 'Create an Account',
            'head.description' : 'Signup is made easy and only takes few seconds.',
            'body.class' : 'accountCreate'
        }

        // Read in the index template and a string.
        helpers.getTemplate('accountCreate', templateData, function (error, string) {
            if (!error && string) {
                // Add the universal header and footer
                helpers.addUniversalTemplates(string, templateData, function (error, string) {
                    if (!error && string) {
                        callback(200, string, 'html');
                    } else {
                        callback(500, undefined, 'html');
                    }
                });
            } else {
                callback(500, undefined, 'html');
            }
        });

    }else{
        callback(405);
    }
};

// Handler for favicon.
handlers.favicon = function (data, callback) {
    //Reject any request that isn't a GET
    if (data.method == 'GET') {
        // Read in the favicons data.
        helpers.getStaticAsset('favicon.ico', function (error, data) {
            if (!error && data) {
                // Callback the data.
                callback(200, data, 'favicon')
            } else {
                callback(500);
            }
        });
    } else {
        callback(405);
    }
};

// Serves all the public assets.
handlers.public = function (data, callback) {
    // Reject any request that isn't a GET
    if (data.method == 'GET') {
        // Get the fine name being requested.
        var trimmedAssetName = data.trimmedPath.replace('public/', '').trim();
        if (trimmedAssetName.length > 0) {
            // Read in theAsset data.
            helpers.getStaticAsset(trimmedAssetName, function (error, data) {
                if (!error && data) {
                    // Determine the content type and default to plain text.
                    var contentType = 'plain';

                    if (trimmedAssetName.indexOf('.css') > -1) {
                        contentType = 'css';
                    }
                    if (trimmedAssetName.indexOf('.png') > -1) {
                        contentType = 'png';
                    }
                    if (trimmedAssetName.indexOf('.ico') > -1) {
                        contentType = 'favicon';
                    }
                    if (trimmedAssetName.indexOf('.jpg') > -1) {
                        contentType = 'jpg';
                    }

                    // callback the data.
                    callback(200, data, contentType);

                } else {
                    callback(404);
                }
            });
        } else {
            callback(404);
        }
    } else {
        callback(405);
    }
};

/**
 * From here, is fo JSON API handlers.
 */

// Write the /users handler.
handlers.users = function (data, callback) {
    var acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405, { 'Error': 'Users handler not found' });
    }
};

// Containers for the users submethods.
handlers._users = {

};

// Users -> GET
// Required Data: phone
// Optional Data: none
handlers._users.GET = function (data, callback) {
    // Check that phone provided is valid.
    var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
    if (phone) {
        // Get the token from the headers.
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // verify the given token from hearders is avalide for thr phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            console.log("This is the TOKEN value from users.GET: ", token);
            if (tokenIsValid) {
                // Look up the user.
                _data.read('users', phone, function (error, data) {
                    if (!error && data) {
                        // Remove the hashed password from the user object, before returning it to the requester.
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, { 'Error': 'Missing required token in header or Token is invalid.' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing the phone number which is required.' });
    }
}

// Users -> POST
// Required Data: firstName, lastName, Phone, password, tosAgreement(boolean)
// Optional Data: none
handlers._users.POST = function (data, callback) {
    // check the all required fields are filled out.
    // Sanity check.
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {

        // Mak sure that user doesn't already exists.
        _data.read('users', 'phone', function (error, data) {
            if (error) {
                // Hash the password.
                const hashPassword = helpers.hash(password);

                if (hashPassword) {
                    // Create the user object
                    const userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashPassword,
                        'tosAgreement': true
                    };

                    // Store the user.
                    _data.create('users', phone, userObject, function (error) {
                        if (!error) {
                            callback(200);
                        } else {
                            console.log(500, { 'Error': 'could not create the new user.' });
                        }
                    });
                } else {
                    callback(500, { 'Error': 'could not hash the user\'s password.' });
                }

            } else {
                callback(400, { 'Error': 'User with that phone number already exists.' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required fields.' });
    }
}

// Users -> PUT
// Required Data: phone, user
// Optional data: firstName, lastName, password. (atleast one must me specified)
handlers._users.PUT = function (data, callback) {
    // Check for the required field. (phone)
    // retrieve the phone from the payload.
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone : false;

    // Check for the optional fields.
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // Error If the phone is invalid.
    if (phone) {
        //Error If nothing is sent to update
        if (firstName || lastName || password) {

            // Get the token from the headers.
            var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

            // Verify that given token is valid for the phone number.
            handlers.tokens.verifyToken(token, phone, function (tokenIsValid) {
                if (tokenIsValid) {
                    // Look up the user
                    _data.read('users', phone, function (error, userData) {
                        if (!error && userData) {
                            // update the fields which are necessary
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.lastName = lastName;
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                            // Store the new updates.
                            _data.update('users', phone, userData, function (error) {
                                if (!error) {
                                    callback(200);
                                } else {
                                    callback(500, { 'Error': 'Could not up date the user.' });
                                }
                            });
                        } else {
                            callback(400, { 'Error': 'The specified does not exists' });
                        }
                    });
                } else {
                    callback(403, { 'Error': 'Missing required token in hearder or Token is invalid.' });
                }
            });

        } else {
            callback(400, { 'Error': 'Error missing fields to update.' });
        }
    } else {
        callback(400, { 'Error': 'Missing required field.' });
    }
}

// Users -> DELETE
// Required field: phone
// ToDo: let only authenticated delete their object.
handlers._users.DELETE = function (data, callback) {
    // check that the phone number is valid.
    var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone : false;
    // Error if the phone number is valid.
    if (phone) {
        // Get the token from the headers.
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // verify the given token is valid for the phone number.
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                // Loop up the user
                _data.read('users', phone, function (error, userData) {
                    if (!error && userData) {
                        _data.delete('users', phone, function (error) {
                            if (!error) {
                                // Delete each of the checks associate with the user.
                                var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                var checksToDelete = userChecks.length;
                                if (checksToDelete > 0) {
                                    var checksDeleted = 0;
                                    var deletionErrors = false;
                                    // Lopp through the checks
                                    userChecks.forEach(function (checkId) {
                                        // Delete the check.
                                        _data.delete('checks', checkId, function (error) {
                                            if (error) {
                                                deletionErrors = true;
                                            }
                                            checksDeleted++;
                                            if (checksDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200);
                                                } else {
                                                    callback(500, { 'Error': 'Error encountered while attenptig to delete all of the users checks. All checks mayn ot have been deleted from the system sucessfully.' });
                                                }
                                            }
                                        });
                                    });
                                } else {
                                    callback(200);
                                }
                            } else {
                                callback(500, { 'Error': 'Could not delete the specified user.' });
                            }
                        });
                    } else {
                        callback(400, { 'Error': 'Could not find the specified user' });
                    }
                });
            } else {
                callback(403, { 'Error': 'Misding required token in Header or Token is invalid.' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields.' });
    }
}

// Tokens
// Write the /users handler.
handlers.tokens = function (data, callback) {
    var acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405, { 'Error': 'Users handler not found' });
    }
};

// Container for tokens.
handlers._tokens = {};

// Tokens - GET
// Required Data: id
// Optional Data: none
handlers._tokens.GET = function (data, callback) {
    // Check Id is valid or not.
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;
    console.log("This is the ID value: ", id);
    if (id) {
        _data.read('tokens', id, function (error, tokenData) {
            console.log("This is the token data: ", tokenData)
            if (!error && tokenData) {
                callback(200, tokenData);
            } else {
                console.log("This is the Error", error)
                callback(404);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required filed.' });
    }
}

// Tokens - POST
// Required data: phone, password.
// Optional data: none
handlers._tokens.POST = function (data, callback) {
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if (phone && password) {
        // Look up the users who matches the phone number.
        _data.read('users', phone, function (error, userData) {
            if (!error && userData) {
                // Hash the send password and compare it with the password in users object.
                var hashPassword = helpers.hash(password);
                if (hashPassword == userData.hashedPassword) {
                    // If valid, create a new token with random name, also set expiration date 1 hr in the future.
                    var tokenId = helpers.createRandomString('20');
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    }
                    // Store the token.
                    _data.create('tokens', tokenId, tokenObject, function (error) {
                        if (!error) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, { 'Error': 'Could not create the new token' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'password did not match the specified user' });
                }
            } else {
                callback(400, { 'Error': 'Could not find specified user.' });
            }
        });
    } else {
        callback(400, { 'Error': 'Error missing fields.' });
    }
}

// Tokens - PUT
// Required : id, extend (If extent: true - we will extent token expiry time to one more hr from that sec.) 
// Optional :
handlers._tokens.PUT = function (data, callback) {
    var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id : false;
    var extent = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if (id && extent) {
        // Look up the token.
        _data.read('tokens', id, function (error, tokenData) {
            if (!error && tokenData) {
                if (tokenData.expires > Date.now()) {
                    // set an expiration for an hour, from now.
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    // store the new updates.
                    _data.update('tokens', id, tokenData, function (error) {
                        if (!error) {
                            callback(200);
                        } else {
                            callback(500, { 'Error': 'Could not update the tokens expiration.' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Token has already expired and can not be exteded.' });
                }
            } else {
                callback(400, { 'Error': 'Could not find the specified user.' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields or fields are invalid.' });
    }
}

// Tokens - DELETE
// Required data: id
// Optional Data: none
handlers._tokens.DELETE = function (data, callback) {
    // check the id is valid or not.
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;
    if (id) {
        // Look up the token.
        _data.read('tokens', id, function (error, tokenData) {
            if (!error && tokenData) {
                // Delete the token ID from the tokens.
                _data.delete('tokens', id, function (error) {
                    if (!error) {
                        callback(200);
                    } else {
                        callback(500, { 'Error': 'Could not delete specified user.' });
                    }
                });
            } else {
                callback(400, { 'Error': 'could not find specified user.' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields.' });
    }
}

// Verify If a given token ID is currently for a given year.
handlers._tokens.verifyToken = function (id, phone, callback) {
    console.log("This is the token ID received to VerifyToken function: ", id);
    // Loop up the token.
    _data.read('tokens', id, function (error, tokenData) {
        if (!error && tokenData) {
            // check the token is for the given user, and has nor expired.
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
}

// container for checks methods.
handlers._checks = {};

//Checks.
handlers.checks = function (data, callback) {
    var acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback)
    } else {
        callback(405);
    }
}

// Checks GET
// Required data: id
// Optional data: none
handlers._checks.GET = function (data, callback) {
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;
    if (id) {
        // Look up the check
        _data.read('checks', id, function (error, checkData) {
            if (!error && checkData) {
                // Get the token from the headers.
                var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that the given token is valid, and belongs to the user who created the check.
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        // Return the check data.
                        callback(200, checkData);
                    } else {
                        callback(403, { 'Error': 'Missing token in header or Token is invalid.' });
                    }
                });
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field.' });
    }
}


// Checks POST
// Required data: protocol, url, method, successCodes, timeoutSeconds.
handlers._checks.POST = function (data, callback) {
    var protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof (data.payload.method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Check user had provided token, and look up for the user.
        // Get the tokens from the headers.
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // Look up the user by reading the token.
        _data.read('tokens', token, function (error, tokenData) {
            if (!error && tokenData) {
                var userPhone = tokenData.phone;
                // Look up for user data with the above phone number.   
                _data.read('users', userPhone, function (error, userData) {
                    if (!error && userData) {
                        var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify that the user has less than the number of max checks per user.
                        if (userChecks.length < config.maxChecks) {
                            // create a random ID for the check
                            var checkId = helpers.createRandomString('20');
                            // create the check object and include user phone.
                            var checkObject = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'protocol': protocol,
                                'url': url,
                                'method': method,
                                'successCodes': successCodes,
                                'timeoutSeconds': timeoutSeconds
                            };

                            // Save the object
                            _data.create('checks', checkId, checkObject, function (error) {
                                if (!error) {
                                    // Add the check ID to the user object.
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    //Save the new user data.
                                    _data.update('users', userPhone, userData, function (error) {
                                        if (!error) {
                                            // Return the data about the new check.
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, { 'Error': 'Could not update the user with the new user check' });
                                        }
                                    });
                                } else {
                                    callback(500, { 'Error': 'Could not create the new check.' });
                                }
                            });

                        } else {
                            callback(400, { 'Error': 'User already have max number of checks (' + config.maxChecks + ').' });
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                // 403 = status code for not authorized.
                callback(403);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required inputs or Inputs are invalid - line 454' });
    }
};


// Checks PUT
// Required data: id
// Optional data: protocol,url, methods, successCodes, timeoutSeconds (one must be sent)
handlers._checks.PUT = function (data, callback) {

    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;
    var protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof (data.payload.method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    // check to make sure if ID is valid.
    if (id) {
        // check to make sure one or more optional fields sent
        if (protocol || url || method || successCodes || timeoutSeconds) {
            // Look up fo checks.
            _data.read('checks', id, function (error, checkData) {
                if (!error && checkData) {
                    // Get the token from headers.
                    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
                    // verify that the given token is valid and belongs to the user who created a check.
                    handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                        if (tokenIsValid) {
                            // update the check where necessary.
                            if (protocol) {
                                checkData.protocol = protocol
                            }
                            if (url) {
                                checkData.url = url
                            }
                            if (method) {
                                checkData.method = method
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds
                            }

                            // store the new updates.
                            _data.update('checks', id, checkData, function (error) {
                                if (!error) {
                                    callback(200);
                                } else {
                                    callback(500, { 'Error': 'Could not update the check.' });
                                }
                            });
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Check ID did not exists.' });
                }
            });
        } else {
            callback(400, { 'Error': 'Missing fields to update' });
        }
    } else {
        callback(400, { 'Error': 'Missing required field.' });
    }
}

// Checks - DELETE
// Required Data: id
// Optional Data: none.
handlers._checks.DELETE = function (data, callback) {
    // check ID is valid.
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id : false;

    if (id) {
        // Read check ID from the collection.
        _data.read('checks', id, function (error, checkData) {
            if (!error && checkData) {
                // Get th token from headers.
                var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

                // validate token belongs to the user who created check.
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        // Delete the check.
                        _data.delete('checks', id, function (error) {
                            if (!error) {
                                //Look up for the user.
                                _data.read('users', checkData.userPhone, function (error, userData) {
                                    if (!error && userData) {
                                        var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        // Remove the delete check from the list of their checks.
                                        // Get the position of specified check in an array.
                                        var checkPosition = userChecks.indexOf(id);
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1);
                                            // Re-save the users data.
                                            _data.update('users', checkData.userPhone, userData, function (error) {
                                                if (!error) {
                                                    callback(200);
                                                } else {
                                                    callback(500, { 'Error': 'Could not update the user.' });
                                                }
                                            });

                                        } else {
                                            callback(500, { 'Error': 'Could not find the check on users object, so could not remove it.' });
                                        }
                                    } else {
                                        callback(500, { 'Error': 'Could not find the user who created.' });
                                    }
                                });
                            } else {
                                callback(500, { 'Error': 'Could not find the user who created the check, so can not delete the check.' });
                            }
                        });
                    } else {
                        callback(403, { 'Error': 'Missing required token in header or Token is invalid.' });
                    }
                });
            } else {
                callback(400, { 'Error': 'Conld not find specified check' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing Requried field.' });
    }
}

// Write the /Ping Handler.
handlers.ping = function (data, callback) {
    // Callback a HTTP status code and a Payload object.
    callback(200);
};

// Define the URL NOT found handler.
handlers.notFound = function (data, callback) {
    callback(404);
}

// Export all the handlers.
module.exports = handlers;