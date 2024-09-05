# Using client-js in Node

The API for node is exactly the same as for the browsers, with the exception of
how the SMART API object is created. In the browser, the SMART API is available
in the global scope at `window.FHIR.oauth2`. In Node, the `fhirclient` module
exports a function that you need to call to obtain the same SMART API object.

> This will not work out of the box if your request object does not have a `session` object property that we can write to. This means that you may need use a middleware or plugin to provide that session support. See [sessions](#sessions).

## SMART API
This is very simple collection of three functions - `authorize`, `ready` and `init`.
These are the exact same functions that we use in the browser. The only thing they
do differently under the hood is how they store data in a session and how they
handle redirects. Here is how this API object is created:

```js
const smart = require("fhirclient");

// Inside a route handler
smart(request, response[, storage]) // -> { authorize, ready, init }
```

### authorize(options)
Call this in your launch_uri route handler to start the authorization flow:
```js
const smart = require("fhirclient");

// inside your launch_uri route handler
smart(request, response).authorize({
    "clientId": "my_web_app",
    "scope"   : "launch patient/*.read openid fhirUser"
});
```

### ready()
Call this in your redirectUri route handler to complete the authorization flow
and obtain a FhirClient instance:
```js
const smart = require("fhirclient");

// inside your redirectUri route handler
smart(request, response).ready(client => client.request("Patient"));
```

### init(options)
Alternatively, you can use `init` to handle everything in single route (only if
your launch_uri is the same as your redirectUri). This method is not available
with HAPI!
```js
const smart = require("fhirclient");

// inside your route handler
smart(request, response).init({
    "clientId": "my_web_app",
    "scope"   : "launch patient/*.read openid fhirUser"
}).then(client => client.request("Patient"));
```

## Examples
- [Example with Express](https://codesandbox.io/s/jovial-dew-c0che)
- [Example with no dependencies](https://codesandbox.io/s/brave-wildflower-q4mhq)


## Sessions
If you use Express with `express-session`, or HAPI with `hapi-server-session`,
or anything else that will ad a `session` object to your http request objects,
then this library should work fine. Otherwise (or if you prefer some alternative
storage), you will have to create custom session storage for storing the SMART
state.

A valid storage object must implement the following interface:
```js
get(key: string): Promise<any> // returns the value or undefined
set(key: string, value: any): Promise<any> // returns the value
unset(key: string): Promise<Boolean> // returns !!success
```

The default storage implementation is [here](https://github.com/smart-on-fhir/client-js/tree/master/src/storage/ServerStorage.ts).

Once you have your custom storage, you can just pass it as third argument to the
function that creates the SMART API:
```js
smart(request, response, myStorage).authorize(options)
```

Most of the time you would need to know more about the current request and
response in order to create a storage instance. That is why passing a storage
factory function is the recommended way:
```js
function createStorage({ request, response }) {
    return new AwesomeCustomStorage(request, response);
}

// inside a route handler
smart(request, response, createStorage).authorize(options)
```

For working example of custom session storage see [this example](https://codesandbox.io/s/brave-wildflower-q4mhq).


## Adapters
This library uses the concept of adapter to provide support for different environments
like Browsers, NodeJS, Express and HAPI. More adapters can be added to support other
frameworks or environments (Electron would be nice addition). PRs are welcome!

An adapter is a class that has a few methods for doing environment-specific things, including:
- Define how to store data in session.
- Define how to handle redirects.
- Define how to find out what the "current url" is.
- Optionally, define how to handle relative URLs.

The adapters are located [here](https://github.com/smart-on-fhir/client-js/tree/master/src/adapters). They all extend one abstract base class (`BaseAdapter`).

In Node `require("fhirclient")` loads the default adapter for Node and/or Express.
To use another adapter load it like so:
```js

// NOTE
// require("fhirclient/lib/entry/hapi") is the same as require("fhirclient/lib/adapters/HapiAdapter").default.smart;
// but it is cleaner and comes with proper type definitions
const smart = require("fhirclient/lib/entry/hapi");


// inside your redirectUri route handler
smart(request, h).ready(client => client.request("Patient"));
```
Note how in the above example the signature of the `smart` function has changed
to `smart(request, h)` which makes more sense in HAPI. This is also defined by the adapter.

See the complete [HAPI Example](https://codesandbox.io/s/fhir-client-hapi-myq5q)


