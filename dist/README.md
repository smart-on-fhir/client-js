SMART on FHIR JavaScript Library
================================

This is a JavaScript library for connecting SMART apps to FHIR servers.
It works both in browsers (IE 10+) and on the server (Node 10+).


[![NodeJS Tests](https://github.com/smart-on-fhir/client-js/actions/workflows/node.yml/badge.svg?branch=master)](https://github.com/smart-on-fhir/client-js/actions/workflows/node.yml)
[![Browser Tests](https://github.com/smart-on-fhir/client-js/actions/workflows/browser.yml/badge.svg?branch=master)](https://github.com/smart-on-fhir/client-js/actions/workflows/browser.yml)
[![Coverage Status](https://coveralls.io/repos/github/smart-on-fhir/client-js/badge.svg?branch=master)](https://coveralls.io/github/smart-on-fhir/client-js?branch=master)
[![npm version](https://badge.fury.io/js/fhirclient.svg)](https://badge.fury.io/js/fhirclient)
[![types](https://badgen.net/npm/types/fhirclient)](https://badgen.net/npm/types/fhirclient)
[![node](https://badgen.net/npm/node/fhirclient)](https://badgen.net/npm/node/fhirclient)
[![downloads](https://badgen.net/npm/dt/fhirclient)](https://www.npmtrends.com/fhirclient)


<br/><br/>


## Installation

### From NPM
```sh
npm i fhirclient
```
### From CDN
Include it with a `script` tag from one of the following locations:

From NPM Release:
- https://cdn.jsdelivr.net/npm/fhirclient/build/fhir-client.js
- https://cdn.jsdelivr.net/npm/fhirclient/build/fhir-client.min.js

Latest development builds from GitHub:
- https://combinatronics.com/smart-on-fhir/client-js/master/dist/build/fhir-client.js
- https://combinatronics.com/smart-on-fhir/client-js/master/dist/build/fhir-client.min.js


## Browser Usage

In the browser you typically have to create two separate pages that correspond to your
`launch_uri` (Launch Page) and `redirectUri` (Index Page).

### As Library

```html
<!-- launch.html -->
<script src="./node_module/fhirclient/build/fhir-client.js"></script>
<script>
FHIR.oauth2.authorize({
    "clientId": "my_web_app",
    "scope": "patient/*.read"
});
</script>

<!-- index.html -->
<script src="./node_module/fhirclient/build/fhir-client.js"></script>
<script>
FHIR.oauth2.ready()
    .then(client => client.request("Patient"))
    .then(console.log)
    .catch(console.error);
</script>
```

### As Module
```js
import FHIR from "fhirclient"

// Launch Page
FHIR.oauth2.authorize({
    "clientId": "my_web_app",
    "scope": "patient/*.read"
});

// Index Page
FHIR.oauth2.ready()
    .then(client => client.request("Patient"))
    .then(console.log)
    .catch(console.error);
```

## Server Usage
The server is fundamentally different environment than the browser but the
API is very similar. Here is a simple Express example:
```js
const fhirClient = require("fhirclient");

// This is what the EHR will call
app.get("/launch", (req, res) => {
    fhirClient(req, res).authorize({
        "clientId": "my_web_app",
        "scope": "patient/*.read"
    });
});

// This is what the Auth server will redirect to
app.get("/", (req, res) => {
    fhirClient(req, res).ready()
        .then(client => client.request("Patient"))
        .then(res.json)
        .catch(res.json);
});
```


### [Read the full documentation](http://docs.smarthealthit.org/client-js/).

<br/>

## License
Apache 2.0


