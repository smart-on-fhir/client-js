# Migration Instructions

This document describes the most important changes that might be required
in order to update an old SMART app to support new versions of the `fhirclient`
library.

## Migrating to v3+
The latest major version is v3. It includes some breaking changes, but
most apps should be able to upgrade with minimal changes.

How to import the library
--------------------------------
The library is now also published as ES module. This means that if you are
using a bundler like Webpack, Rollup, Parcel or Vite you can import it as
module.

Client-side via script tag:
```html
<script src="https://cdn.jsdelivr.net/npm/fhirclient/bundle/fhir-client.min.js"></script>
<script>
FHIR.oauth2.authorize(options);
</script>
```

Client-side ESM or TS:
```js
import { authorize } from "fhirclient/browser";
authorize(options);
```

Client-side CommonJS:
```js
const { authorize } = require("fhirclient/browser");
authorize(options);
```

Server-side CommonJS:
```js
const { smart } = require("fhirclient/node");
smart(request, response).authorize(options);
```

Server-side ESM or TS:
```js
import { smart } from "fhirclient/node";
smart(request, response).authorize(options);
```

**BREAKING CHANGE:**
You must import from specific entry points depending on your environment.
Do NOT import from `"fhirclient"` directly, as that will not work!

Examples:

```js
// FRONTEND 
import { authorize } from "fhirclient/browser"; // for ESM/TS projects
const { authorize } = require("fhirclient/browser"); // for CommonJS projects

// BACKEND
import { authorize } from "fhirclient/node"; // for Node.js / Express integration using ESM/TS
import { authorize } from "fhirclient/hapi"; // for HAPI integration using ESM/TS
const { authorize } = require("fhirclient/node"); // for Node.js / Express integration using CommonJS
const { authorize } = require("fhirclient/hapi"); // for HAPI integration using CommonJS

// WRONG - will not work
import { authorize } from "fhirclient"; // will not work
const { authorize } = require("fhirclient"); // will not work
```

No more polyfills and old browsers
--------------------------------
- The library now targets modern browsers (ES6+). This means that if you need
  to support older browsers (like IE11) you will need to include polyfills in
  your app.
- The library no longer includes polyfills for `fetch`, `AbortController`,
  `Request`, `Response`, `Headers`, and `WebCrypto`.

### Other Changes

#### Client state
The old client had a `state` and a `tokenResponse` properties. Now the
`tokenResponse` is part of the state. This means that read tokenResponse
values the code needs to be updated like so:

```js
// old
const needPatientBanner = client.tokenResponse.need_patient_banner;

// new
const needPatientBanner = client.state.tokenResponse.need_patient_banner;
```
