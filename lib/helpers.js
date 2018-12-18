/**
 * This file is just for helpers to various tasks.
 */

// Require the dependencies.
const crypto = require('crypto');
const config = require('./config');
const https =  require('https');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');

// Container for all the helpers.
const helpers = {};

// Create a SHA256 hash.
helpers.hash = function(string){
    if(typeof(string) == 'string' && string.length > 0){
        var hash = crypto.createHmac('sha256', config.hashingSecret).update(string).digest('hex');
        return hash;
    }else{
        return false;
    }
};

// Create a function that takes arbitary string and return the JSON obect from the string.
// Parse a JSON string to an Obect, in all cases without throwing.
helpers.parseJsonToObject = function(string){
    try{
        const obj = JSON.parse(string);
        return obj;
    }catch(e){
        return {};
    }
}

// Create a funtion to generate random string to generate a Token value.
helpers.createRandomString = function(stringLength){
    stringLength = typeof(stringLength) == 'string' && stringLength > 0 ? stringLength : false;
    if(stringLength){
        // Define all the possible characters that could go into the string.
        var possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
        // start the final string.
        var string = '';
        for(i = 1; i <= stringLength; i++){
            // Get the random character from the possible characters string
            var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            // append this character to the final string.
            string += randomCharacter;
        }
        // Return the final string.
        return string;
    }else{
        return false;
    }
}

// Send an SMS via Twilio.
helpers.sendTwilioSms = function(phone, message, callback){
    // Validate the parameters.
    var phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    var message = typeof(message) == 'string' && message.trim().length >0 && message.trim().length <= 1600 ? message.trim() : false; 
    if(phone && message){
        // Configure the request payload.
        var payload = {
            'From' : config.twilio.fromPhone,
            'To' : '+1'+phone,
            'Body' : message
        };

        // Stringify the paylaod.
        var stringPayload = querystring.stringify(payload);
        // Configure the request details
        var requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate the request object. 
        var request = https.request(requestDetails, function(response){
            //console.log("This is the response from Twilio: ", response);
            // Grab the status of the sent request
            var status = response.statusCode;
            // callback successfully If the request went through
            if(status == 200 || status == 201){
                callback(false);
            }else{
                callback('Status code returned was: '+status);
            }
        });

        // Bind to error event so it donesn't get thrown
        request.on('error', function(e){
            callback(e);
        });

        // Add the payload to the request
        request.write(stringPayload);

        // End the request
        request.end();
    }else{
        callback(400, {'Error' : 'Given parameters are missing or Invalid'});
    }
}


//Get a string template.
helpers.getTemplate = function(templateName, data, callback){
    // Perform Sanity check = validations.
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data != null ? data : {};

    if(templateName){
        // Read a templae file from its directory.
        var templatesDir = path.join(__dirname,'/../templates/');
        fs.readFile(templatesDir+templateName+'.html', 'utf8', function(error, string){
            if(!error && string && string.length > 0){
                // Do interpolation on the string.
                var finalString = helpers.interpolate(string, data);
                callback(false, finalString);
            }else{
                callback('No template could be found.');
            }
        });
    }else{
        callback('A valid template name was not specified.');
    }
};

// We have to take given string and data object and find /replace all the keys within it.
helpers.interpolate = function(string, data){
    string = typeof(string) == 'string' && string.length > 0 ? string : '';
    data = typeof(data) == 'object' && data != null ? data : {};

    //Add the template globals to the data object, prepending theit key name with gloaba.
    for(var keyName in config.templateGlobals){
        if(config.templateGlobals.hasOwnProperty(keyName)){
            data['global.' +keyName] = config.templateGlobals[keyName];
        }
    }

    // For each key in the data object, insert its value into the string at the corrosponding placeholder.
    for(var key in data){
        if(data.hasOwnProperty(key) && typeof(data[key]) == 'string'){
            var replace = data[key];
            var find = '{'+key+'}';
            string = string.replace(find, replace);
        }
    }

    return string;
};  


// Add the universal header and footer to a string, and pass the provided data object to header and footer for interpolation.
helpers.addUniversalTemplates = function(string, data, callback){
    // Sanity chec fo string and object.
    string = typeof(string) == 'string' && string.length >0 ? string : '';
    data = typeof(data) == 'object' && data != null ? data : {};

    // Get the header.
    helpers.getTemplate('header', data, function(error, headerString){
        if(!error && headerString){
            // Get the footer
            helpers.getTemplate('footer', data, function(error, footerString){
                if(!error && footerString){
                    // add them all together.
                    var fullString = headerString + string + footerString;
                    callback(false, fullString);
                }else{
                    callback('could not find footer template.');
                }
            })
        }else{
            callback('We could not find the header template.');
        }
    });
}; 

// Get the contents of a public asset - static.
helpers.getStaticAsset = function(fileName, callback){
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
    if(fileName){
        var publicDir = path.join(__dirname, '/../public/');
        fs.readFile(publicDir+fileName, function(error,data){
            if(!error && data){
                callback(false,data);
            }else{
                callback('No file could be found');
            }
        });
    }else{
        callback('A valid file name was not specified.');
    }
};


// Export the container.
module.exports = helpers;