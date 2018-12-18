/**
 * Author: Bhanu Kandregula
 * Subject: This file is to create and export configuration variables.
 */

const environments = {};

// Create a Staging (defualt) environment.
environments.staging = {
    'httpPort': 3000,
    'httpsPort' : 3001,
    'envName': 'staging',
    'hashingSecret' : 'thisIsASecret',
    'maxChecks' : 5,
    'twilio' : {
        'accountSid' : 'AC2a0c26cd31e7e0c308afb40ec48fd9e1',
        'authToken' : 'd633385160331f3c70db974b33bc02d9',
        'fromPhone' : '5866304204'
    },
    'templateGlobals' : {
        'appName' : 'UptimeChecker',
        'companyName' : 'NotARealCompany, Inc.',
        'yearCreated' : '2018',
        'baseUrl' : 'http://localhost:3000'
    }
}

// Create a profuction object.
environments.production = {
    'httpPort': 5000,
    'httpsPort' : 5001,
    'envName': 'production',
    'hashingSecret' : 'thisIsAlsoASecret',
    'maxChecks' : 5,
    'twilio' : {
        'accountSid' : 'AC2a0c26cd31e7e0c308afb40ec48fd9e1',
        'authToken' : 'd633385160331f3c70db974b33bc02d9',
        'fromPhone' : '5866304204'
    },
    'templateGlobals' : {
        'appName' : 'UptimeChecker',
        'companyName' : 'NotARealCompany, Inc.',
        'yearCreated' : '2018',
        'baseUrl' : 'http://localhost:5000'
    }
}

// Determine which environment should be passed as a command line argument. 
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that currentEnvironment value is one of the environments above.
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module.
module.exports = environmentToExport;
