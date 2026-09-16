
SMART on FHIR JavaScript Library
================================

This is a JavaScript library for connecting SMART apps to FHIR servers.
It works both in modern browsers and on the server (Node 18+).

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
- https://cdn.jsdelivr.net/npm/fhirclient@3.0.0/bundle/fhir-client.js
- https://cdn.jsdelivr.net/npm/fhirclient@3.0.0/bundle/fhir-client.min.js


## Browser Usage

In the browser you typically have to create two separate pages that correspond to your
`launch_uri` (Launch Page) and `redirect_uri` (Index Page).

### As Library

```html
<!-- launch.html -->
<script src="https://cdn.jsdelivr.net/npm/fhirclient/bundle/fhir-client.min.js"></script>
<script>
FHIR.oauth2.authorize({
    "client_id": "my_web_app",
    "scope": "patient/*.read"
});
</script>

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

```js
// Frontend Usage:
// -----------------------------------------------------------

// Frontend - ESM Module or TypeScript
import { authorize, ready } from "fhirclient/browser"

// Frontend - CommonJS Module
const { authorize, ready } = require("fhirclient/browser")

// Launch page or route
authorize({
    "client_id": "my_web_app",
    "scope": "patient/*.read"
});

// Redirect page or route
ready()
.then(client => client.request("Patient"))
.then(console.log, console.error);


// Backend Usage:
// -----------------------------------------------------------
// Backend - ESM Module or TypeScript
import { smart } from "fhirclient/node"

// Backend - CommonJS Module
const { smart } = require("fhirclient/node")

// Your launch url route
app.get("/launch", (req, res) => {
    smart(req, res).authorize({
        "client_id": "my_web_app",
        "scope": "patient/*.read"
    });
});

// Your redirect url route
app.get("/", (req, res, next) => {
    smart(req, res).ready()
        .then(client => client.request("Patient"))
        .then(res.json)
        .catch(next);
});
```


### [Read the full documentation](http://docs.smarthealthit.org/client-js/).

<br/>

## License
Apache 2.0


