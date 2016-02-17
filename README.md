SMART on FHIR JavaScript Client Library
=======================================

## Building

To build the library, you will need Grunt and NPM. Once you
have all the dependencies in place, you can build the library
with the `grunt` command.

Here are the exact steps to build the client library
on Ubuntu 14.04:

```
sudo apt-get update
sudo apt-get -y install git npm
sudo ln -s "$(which nodejs)" /usr/bin/node
git clone https://github.com/smart-on-fhir/client-js
cd client-js
npm install
sudo npm install -g grunt-cli
grunt
```

If all goes well, the client library will be available in the
`dist` directory in multiple variants as follows:

* `fhir-client.js` - complete client library with jQuery and fhir.js included (no external dependencies)
* `fhir-client-jquery.js` - client library using jQuery, jQuery and fhir.js not included
* `fhir-client-angularjs.js` - client library using AngularJS, AngularJS and fhir.js not included

## Usage

For usage examples and further documentation, please visit http://docs.smarthealthit.org/clients/javascript/
