
SMART on FHIR JavaScript Library
================================

This is a JavaScript library for connecting SMART apps to FHIR servers.
It works both in modern browsers and on the server (Node 18+).


[![NodeJS Tests](https://github.com/smart-on-fhir/client-js/actions/workflows/node.yml/badge.svg?branch=master)](https://github.com/smart-on-fhir/client-js/actions/workflows/node.yml)
[![Browser Tests](https://github.com/smart-on-fhir/client-js/actions/workflows/browser.yml/badge.svg?branch=master)](https://github.com/smart-on-fhir/client-js/actions/workflows/browser.yml)
[![Coverage Status](https://coveralls.io/repos/github/smart-on-fhir/client-js/badge.svg?branch=master)](https://coveralls.io/github/smart-on-fhir/client-js?branch=master)
[![npm version](https://badge.fury.io/js/fhirclient.svg)](https://badge.fury.io/js/fhirclient)
[![types](https://badgen.net/npm/types/fhirclient)](https://badgen.net/npm/types/fhirclient)
[![node](https://badgen.net/npm/node/fhirclient)](https://badgen.net/npm/node/fhirclient)
[![downloads](https://badgen.net/npm/dt/fhirclient)](https://www.npmtrends.com/fhirclient)

## Table of Contents
---
- [Installation](#installation)
- [Browser Usage](#browser-usage)
- [Server Usage](#server-usage)
    - [NodeJS API Details](node.md)
- [SMART API](#smart-api)
    - [Full Documentation](api.md)
- [Client API](#client)
    - [Full Documentation](client.md)
- [API Documentation](typedoc)
- [Working with multiple windows](targets.md)
- [Connecting to open servers and/or multiple servers](open_servers.md)
- [Contributing and Development](#contributing-and-development)
- [Browser Examples](https://docs.smarthealthit.org/client-js-examples/)
- [Request examples](http://docs.smarthealthit.org/client-js/request.html)
- [Example request calls](fhirjs-equivalents.md)
- Server Examples
    - [Express Example](https://github.com/smart-on-fhir/client-js-examples/blob/master/server/express/index.js)
    - [Native Example](https://github.com/smart-on-fhir/client-js-examples/tree/master/server/native)
    - [HAPI Example](https://github.com/smart-on-fhir/client-js-examples/blob/master/server/hapi/index.js)
    - [Express + fhir.js Example](https://github.com/smart-on-fhir/client-js-examples/blob/master/server/express_and_fhirjs/index.js)
    

<br/>
<br/>


## Installation

### From NPM
```sh
npm i fhirclient
```
### From CDN
Include it with a `script` tag from one of the following locations:

From NPM (latest version):
- https://cdn.jsdelivr.net/npm/fhirclient/bundle/fhir-client.js
- https://cdn.jsdelivr.net/npm/fhirclient/bundle/fhir-client.min.js

From NPM (specific version):
- https://cdn.jsdelivr.net/npm/fhirclient@3.0.0-beta.1/bundle/fhir-client.js
- https://cdn.jsdelivr.net/npm/fhirclient@3.0.0-beta.1/bundle/fhir-client.min.js


## Browser Usage

In the browser you typically have to create two separate pages that correspond to your
`launch_uri` (Launch Page) and `redirect_uri` (Index Page).

### As Library

**Launch Page**
```html
<!-- launch.html -->
<script src="https://cdn.jsdelivr.net/npm/fhirclient/bundle/fhir-client.min.js"></script>
<script>
FHIR.oauth2.authorize({
    "client_id": "my_web_app",
    "scope": "patient/*.read"
});
</script>
```

**Index Page**
```html
<!-- index.html -->
<script src="https://cdn.jsdelivr.net/npm/fhirclient/bundle/fhir-client.min.js"></script>
<script>
FHIR.oauth2.ready()
    .then(client => client.request("Patient"))
    .then(console.log)
    .catch(console.error);
</script>
```

### As Module
If you are using a bundler like Webpack, Rollup, Parcel, or Vite
you can import the library as module:
**Launch Page**
```js
// Using ESM syntax
import { authorize } from "fhirclient/browser";

// OR Using CommonJS syntax
// const { authorize } = require("fhirclient/browser");

authorize({
    "client_id": "my_web_app",
    "scope": "patient/*.read"
});
```

**Index Page**
```js
// Using ESM syntax
import { ready } from "fhirclient/browser";

// OR Using CommonJS syntax
// const { ready } = require("fhirclient/browser");

ready()
    .then(client => client.request("Patient"))
    .then(console.log)
    .catch(console.error);
```


> NOTE: When the library is used as module it will not create a global `FHIR` object as it does when included as script. If you want to be able to use it globally, you can export it yourself like so:

```ts
import FHIR from "fhirclient/browser";

// in JavaScript:
window.FHIR = FHIR;

// In TypeScript:
(window as any).FHIR = FHIR;
```

## Server Usage
The server is fundamentally different environment than the browser but the
API is very similar. Here is a simple Express example:
```js
// Using ESM syntax
import { smart } from "fhirclient/node";

// OR Using CommonJS syntax
const { smart } = require("fhirclient/node");

// This is what the EHR will call
app.get("/launch", (req, res) => {
    smart(req, res).authorize({
        "client_id": "my_web_app",
        "scope": "patient/*.read"
    });
});

// This is what the Auth server will redirect to
app.get("/", (req, res) => {
    smart(req, res).ready()
        .then(client => client.request("Patient"))
        .then(res.json)
        .catch(res.json);
});
```
Read more at the [NodeJS API Details](node.md).

## SMART API
The SMART API is a collection of SMART-specific methods (`authorize`, `ready`, `init`) for app
authorization and launch. If you are working in a browser, the SMART API is automatically created,
and available at `window.FHIR.oauth2`. In NodeJS, the library exports a function that should be
called with a http request and response objects, and will return the same SMART API as in the browser. 

```js
// BROWSER
const smart = FHIR.oauth2;
smart.authorize(options);

// SERVER
import { smart } from "fhirclient/node";
smart(request, response).authorize(options);
```
Read the [SMART API Documentation](api.md)


   

## Client
This is a FHIR client that is returned to you from the `ready()` or the `init()`
SMART API calls. You can also create it yourself if needed. For example, there
is no need to authorize against an open FHIR server. You can skip that and start
by creating a client instance:
```js
// BROWSER
const client = FHIR.client({
    serverUrl: "https://r4.smarthealthit.org"
});

// SERVER
const client = fhirClient(req, res).client({
    serverUrl: "https://r4.smarthealthit.org"
});
```

The client instance exposes a super-powered `request` method that you use to query
the FHIR server and a bunch of other useful utilities and methods.
[Read the full Client API docs](client.md).


<!-- ## Debugging
This library uses the [debug](https://www.npmjs.com/package/debug) module.

To enable debug logging in Node use the `DEBUG` env variable:
```sh
DEBUG='FHIR.*' node my-app
```
In the browser execute this in the console and then reload the page:
```js
localStorage.debug = "FHIR.*"
``` -->


