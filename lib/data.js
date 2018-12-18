/**
 * This file to storing and editing data.
 */

// Require the file systems.
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module, which is to be expoerted.
const lib = {};

// Base directory for the data folder. 
lib.baseDir = path.join(__dirname, '/.././.data/'); 

// Write a data to file.
lib.create = function(dir, file, data, callback){
    
    // Open the file for writing.
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', function(error, fileDescriptor){
        console.log(error);
        if(!error && fileDescriptor){
            // Covert data to string.
            const stringData = JSON.stringify(data);
            // Write data to file and close it.
            fs.writeFile(fileDescriptor, stringData, function(error){
                if(!error){
                    fs.close(fileDescriptor, function(error){
                        if(!error){
                            callback(false);
                        }else{
                            callback('Error closing new file.');
                        }
                    });
                }else{
                    callback('Error writing to new file.');
                }
            });

        }else{
            callback('Could not create a new file, It may already exists.')
        }
    });
}

// Read data from a file.
lib.read = function(dir, file, callback){
    fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf8', function(error, data){
        // If not Error and there is data
        if(!error && data){
            var parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        }else{
            callback(error, data);
        }
    });
}

// Update data which in a file.
lib.update = function(dir, file, data, callback){
    //Open the file for writing.
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', function(error, fileDescriptor){
        if(!error && fileDescriptor){
            // convert data to string.
            const stringData = JSON.stringify(data);
            //truncate the file.
            fs.ftruncate(fileDescriptor, function(error){
                if(!error){
                    // write to the file and close it.
                    fs.writeFile(fileDescriptor, stringData, function(error){
                        if(!error){
                            fs.close(fileDescriptor, function(error){
                                if(!error){
                                    callback(false);
                                }else{
                                    callback("Error closing the file.");
                                }
                            });
                        }else{
                            callback("Error writing to existing file.");
                        }
                    });
                }else{
                    callback("Error - Truncating file.");
                }
            });
        }else{
            callback("Could not open the file for updating.");
        }
    }); 
}

// Deleting a file.
lib.delete = function(dir, file, callback){
    // Unlinking - removing file from the file system.
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', function(error){
        if(!error){
            callback(false);
        }else{
            callback("We have trouble deleting the file.");
        }
    });
}

// List all the files in a directory.
lib.list = function(dir, callback){
    fs.readdir(lib.baseDir+dir+'/', function(error,data){
        if(!error && data && data.length > 0){
            var trimmedFileNames = [];
            data.forEach(function(fileName){
                trimmedFileNames.push(fileName.replace('.json', ''));
            });
            callback(false, trimmedFileNames);
        }else{
            callback(error, data);
        }
    });
}

// Export the module.
module.exports = lib;