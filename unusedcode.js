
const _data = require('./lib/data');

// Testing.
// @TODO Delete this.
_data.create('test', 'newFile', { 'name' : 'Bhanu Kandregula' }, function(error){
    console.log("This was the error: ", error);
});

// Testing.
// @TODO Delete this.
_data.read('test', 'newFile', function(error, data){
    console.log("This was the error: ", error);
    console.log("This was the data: ", data);
});

// Testing.
// @TODO Delete this.
_data.delete('test', 'newFile', function(error, data){
    console.log("This was the error: ", error);
});

// GHFO025F83XGV30 - $10 off.