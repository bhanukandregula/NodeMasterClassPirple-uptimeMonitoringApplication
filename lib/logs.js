/**
 * This is a lib for storing and rotataing the logs.
 */

// require the dependencies.
const fs =  require('fs');
const path = require('path');
const zlib = require('zlib');

//container for the module.
var lib = {

};

// Base directory for the logs folder.
lib.baseDir = path.join(__dirname, '/../.logs/'); 

// Append a string to the file, also create a file if this doesn't exists.
lib.append = function(file, string, callback){
    // Opening the file for appending.
    fs.open(lib.baseDir+file+'.log', 'a', function(error, fileDescriptor){
        if(!error && fileDescriptor){
            // Append to the file and close it.
            fs.appendFile(fileDescriptor, string +'\n', function(error){
                if(!error){
                    fs.close(fileDescriptor, function(error){
                        if(!error){
                            callback(false);
                        }else{
                            callback('Error closing file that was being appended.');
                        }
                    });
                }else{
                    callback('Error appending to the file.');
                }
            });
        }else{
            callback('Could not open file for appending.');
        }
    });
};

// list all the logs and optionally include the compressed logs.
lib.list = function(includeCompressedLogs, callback){
    fs.readdir(lib.baseDir, function(error,data){
        if(!error && data && data.length > 0){
            var trimmedFileName = [];
            data.forEach(function(fileName){
                // Add the .log files.
                if(fileName.indexOf('.log') > -1){
                    trimmedFileName.push(fileName.replace('.log',''));
                }

                // Add on the .gz files.
                if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs){
                    trimmedFileName.push(fileName.replace('.gz.b64',''));
                }  
                callback(false, trimmedFileName); 
            });
        }else{
            callback(error, data);
        }
    });
};

// compress the contents of one .log file into .gz.b64 file with in the same directory.
lib.compress = function(logId, newFileId, callback){
    var sourceFile = logId+'.log';
    var destinationFile = newFileId+'.gz.b64';

    // Read the source file.
    fs.readFile(lib.baseDir+sourceFile,'utf8',function(error, inputString){
        if(!error && inputString){
            // compress the data usng zzip. zzip comes with the zlib directory.
            zlib.gzip(inputString, function(error, buffer){
                if(!error && buffer){
                    // send the data to the destination file.
                    fs.open(lib.baseDir+destinationFile,'wx',function(error, fileDescriptor){
                        if(!error && fileDescriptor){
                            // write to the destination file.
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(error){
                                if(!error){
                                    // close the destination file.
                                    fs.close(fileDescriptor, function(error){
                                        if(!error){
                                            callback(false);
                                        }else{
                                            callback(error);
                                        }
                                    });
                                }else{
                                    callback(error);
                                }
                            });
                        }else{
                            callback(error);
                        }
                    });
                }else{
                    callback(error);
                }
            });
        }else{
            callback(error);
        }
    });
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function(fileId, callback){
    var fileName =  fileId+ '.gz.b64';
    fs.readFile(lib.baseDir+fileName, 'utf8', function(error, string){
        if(!error && string){
            // Decompress the data.
            var inputBuffer = Buffer.from(string, 'base64');
            zlib.unzip(inputBuffer, function(error, outputBuffer){
                if(!error && outputBuffer){
                    // callback in general.
                    string = outputBuffer.toString();
                    callback(false, string);
                }else{
                    callback(error);
                }
            });
        }else{
            callback(error);
        }
    });
};

// This is a function for Truncating a log file.
lib.truncate = function(logId, callback){
    fs.truncate(lib.baseDir+logId+'.log', 0, function(error){
        if(!error){
            callback(false);
        }else{
            callback(error);
        }
    });
};

// Export the module object.
module.exports = lib;