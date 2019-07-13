# Migration Instructions

This document describes the most important changes that might be required
in order to update an old SMART app to support new versions of the `fhirclient`
library.

## Migrating to v2+

There are lots of changes in v2, compared to the older versions. It might be a
good idea to start by reading [this document](v2.md).

> This only covers browser-related changes, since versions below 2 were not server-compatible.


### Load the correct version
First make sure that you are loading the correct version of the library
through the script tags. For example, this should load the latest development build:
```html
<script src="https://cdn.jsdelivr.net/npm/fhirclient/build/fhir-client.js"></script>
```

### FHIR.oauth2.authorize()
    
In your launch page you should have a call to `FHIR.oauth2.authorize()`.
This should work without any changes for EHR launch. For Standalone Launch,
you probably  have something like:
```js
FHIR.oauth2.authorize({
    client: {
        client_id: "...",
        scope: "..."
        },
        server: "https://my-launch-url"
})
```
For v2 you need to change that to:
```js
FHIR.oauth2.authorize({
    client_id: "...",
    scope: "...",
    iss: "https://my-launch-url"
})
```

### FHIR.oauth2.ready()
This is where apps are initialized. You probably call this with
one or two callback arguments like:
```js
FHIR.oauth2.ready(onSuccess, onError);
```
In v2 this is acceptable, but `ready` returns a `Promise` and we
advise you to change it to:
```js
FHIR.oauth2.ready().then(onSuccess).catch(onError);
```
This is just for clarity. Even if you keep the old signature (`ready(onSuccess, onError)`)
it will be converted internally to `ready().then(onSuccess).catch(onError)`. The important
part is that `onSuccess` now becomes part of the promise chain and as such, it's return
value will be passed to any function that might be chained after that.

At this point, review the code of those two callback and consider
the following:
- `onError` is now a promise rejection handler. As such, it will
always be called with single argument that is an Error instance
(no more multiple argument or string messages or custom objects).
- `onSuccess` is now part of the promise chain. If you throw an
an error or return a rejected promise, the error should propagate
to your `onError function`
- You can return a `Promise` from `onSuccess` and it will be awaited for.

### FHIR queries
Once you have the SMART part (`authorize` and `ready`) working, it
is time to proceed to the FHIR queries. Almost every http request
made by this library before v2 was sent through `fhir.js`. Since v2,
we recommend switching to the built-in `request` function which comes
with some benefits. See [fhir.js integration](README.md#fhirjs-integration)

> If you want to continue using fhir.js, you will have to include it in the
    page. Since we provide a `fetch` polyfill, the native fhir.js build can be used.
    We have tested our fhir.js integration with native build of fhir.js version
    0.0.20 (available [here](https://raw.githubusercontent.com/smart-on-fhir/client-js/master/lib/nativeFhir.js)).
    This can still bring in some incompatibilities, so another option would be
    to try our fork of fhir.js that was included in older versions of the
    `fhirclient` library. You can grab it from [here](https://github.com/smart-on-fhir/client-js/blob/9e77b7b26b5d7dff7e65f25625441e0905f84811/lib/jqFhir.js),
    but note that it will also require jQuery to be included in the page.

#### patient.read()
Most of the apps are using information about the
selected patient, so you probably have a call like `client.patient.read()`
somewhere in your code. That should work in v2, but it returns a `Promise`
instead of `jQuery.Deferred`. This means that things like:
```js
patient.read().done(...).fail(...).always(...)
```
must be changed to:
```js
patient.read().then(...).catch(...).finally(...)
```

#### Other read requests
Other requests should be convertible to `client.request()`. We can't
cover every possible scenario, but we can provide an example for one use case
that seems to be very common - fetching patient observations.
```js
FHIR.oauth2.ready()

    .then(client => {

        const query = new URLSearchParams();
        query.set("patient", client.patient.id);
        query.set("_count", 100); // fetch fewer pages if the server supports it
        query.set("code", [
            'http://loinc.org|29463-7', // weight
            'http://loinc.org|3141-9' , // weight
            'http://loinc.org|8302-2' , // Body height
            'http://loinc.org|8306-3' , // Body height - lying
            'http://loinc.org|8287-5' , // headC
            'http://loinc.org|39156-5', // BMI
            'http://loinc.org|18185-9', // gestAge
            'http://loinc.org|37362-1', // bone age
            'http://loinc.org|11884-4'  // gestAge
        ].join(","));

        return client.request("Observation?" + query, {
            pageLimit: 0,   // get all pages
            flat     : true // return flat array of Observation resources
        }).then(observations => {
            const getObservations = client.byCodes(observations, "code");
            console.log("height", getObservations("8302-2", "8306-3"));
            console.log("weight", getObservations("29463-7", "3141-9"));
            // ...
        });
    })
    
    .catch(console.error);
```
See [this](./fhirjs-equivalents) for other examples.

#### Common write requests
The v2 client includes convenience wrappers for FHIR create, update, delete operations.

For example:
```js
client.api.update({resource: resource})
```
can be changed to:
```js
client.update(resource)
```

Here are examples for create and delete:
```js
client.create(resource)
```
```js
client.delete("Patient/123")
```

#### Other write requests
Other write requests should be converted to `client.request()`.
See [this](./fhirjs-equivalents) for examples.

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
