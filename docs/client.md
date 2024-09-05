# Client
This is a FHIR client that is returned to you from the `ready()` call of the SMART API. You can also create it yourself if needed:
```js
// BROWSER
const client = FHIR.client("https://r4.smarthealthit.org");

// SERVER
const client = smart(req, res).client("https://r4.smarthealthit.org");
```
It exposes the following API:

### client.request(uri: String [, fhirOptions: Object]) `Promise<Object>`<br/>client.request(url: URL [, fhirOptions: Object]) `Promise<Object>`<br/>client.request(options: Object [, fhirOptions: Object]) `Promise<Object>`

> This is the single most important method. Please see the **[live examples](http://docs.smarthealthit.org/client-js/request.html)**.

The first argument can be one of:
- **String** - either the full url, or a path that will be rooted at the FHIR baseUrl.
- **URL** - an URL instance.
- **Object** - options that must contain an `url` property (`String|URL`). Any other properties will be passed to the underlying `fetch()` call.


The **fhirOptions** object is optional and can contain the following properties:

- **pageLimit** `Number` - When you request a Bundle, the result will typically come back in pages and you will only get the first page. You can use `pageLimit` greater than `1` to request multiple pages. For example `pageLimit: 3` will give you the first 3 pages as array. To fetch all the available pages you can set this to `0`.
    - Defaults to `1`.
    - Ignored if the response is not a `Bundle`.
- **onPage** `Function` - When you fetch multiple pages the resulting array may be very large, requiring a lot of time and memory. It is often better if you specify a page callback instead. The `onPage` callback will be called once for each page with the page Bundle as it's argument. If you use `resolveReferences` and `graph: false`, the references will be passed to `onPage` as second argument.
    - If `onPage` returns a promise it will be awaited for, meaning that no more pages will be fetched until the `onPage` promise is resolved.
    - If `onPage` returns a rejected promise or throws an error, the client will not continue fetching more pages.
    - If you use `onPage` callback, the promise returned by `request()` will be resolved with `null`. This is to avoid building that huge array in memory. By using the `onPage` option you are stating that you will handle the result one page at a time, instead of expecting to receive the big combined result.
- **flat** `Boolean` - When fetching a `Bundle`, you are typically only interested in the included resources which are located at `{response}.entry[N].resource`. If this option is set to `true`, the returned result will be an array of resources instead of the whole bundle. This is especially useful when multiple pages are fetched, because an array of page bundles is not that useful and will often have to be converted to array of resources that is easier to iterate.
    - This option is ignored if the response is not a bundle.
    - If you use `onPage` callback with `flat: true`, it will receive that array of resources instead of the page bundle.
    - Resources from multiple pages are flattened into single array (unless you use `onPage`, which will be called with one array for each page).
    - Defaults to `false`.
    - Finally, `Bundle.entry` is optional in FHIR and that leads to bugs in apps that assume that it is always present. With `flat: true`, you will always get an array, even if it is empty, and even if no `entry` is found in the response bundle.
- **graph** `Boolean` - Only applicable if you use `resolveReferences`. If `false`, the resolved references will not be "mounted" in the result tree, but will be returned as separate map object instead. **Defaults to `true`**.
- **resolveReferences** `String|String[]` - One or more references to resolve. Single item can be specified as a string or as an array of one string. Multiple items must be specified as array.
    - The paths are relative to the current resource. For example, use `subject` instead of `entry.resource.subject`.
    - Path can have arbitrary depth but should not include the last `reference` segment. For example the path `a.b.c` will fetch `{current resource}.a.b.c.reference` but will mount the result at `{current resource}.a.b.c`.
    - If the target is an array of references (E.g. [Patient.generalPractitioner](http://hl7.org/fhir/R4/patient-definitions.html#Patient.generalPractitioner)), you can request one or more of them by index (E.g. `generalPractitioner.0`). If the index is not specified, all the references in the array will be resolved.
    - The order in which the reference paths are specified does not matter. For example, if you use `["subject", "encounter.serviceProvider", "encounter"]`, the library should figure out that `encounter.serviceProvider` must be fetched after `encounter`. In fact, in this case it will first fetch subject and encounter in parallel, and then proceed to encounter.serviceProvider.
    - This option does not work with contained references (they are "already resolved" anyway).
    - You can use `..` to loop through arrays. For example `identifier..assigner` will match if `identifier` is an array of objects having an `assigner` reference property. This is not recursive, meaning that `..` can only be used once in each path expression and paths like `identifier..assigner..whatever` will not work.
- **useRefreshToken** `Boolean` - **Defaults to `true`**. If the client is authorized, it will possess an access token and pass it with the requests it makes. When that token expires, you should get back a `401 Unauthorized` response. To prevent this from happening, the client will check the access token expiration time before making requests. If the token is expired, or if it is about to expire in the next 10 seconds, a refresh call will be made to obtain new access token before making the actual request. By setting `useRefreshToken` to `false` you can disable this behavior. There are `refresh` and `refreshIfNeeded` methods on the client (described below) that can be called manually to renew the access token.
- **includeResponse** `Boolean` - **Defaults to `false`**. (since v2.3.11) In rare cases, one might have to access the raw response object and read response headers or do something else with it. If this option is set to true, the request method will resolve with an object having it's usual result in a `body` property and the `Response` object in `response` property. See the return types below for an example. Note that if this is a complex request resulting in multiple HTTP requests (for example to fetch multiple pages), the `response` property will contain the first response object. Any subsequent  recursive request responses cannot be accessed. This option can also be passed to other high-level request methods, including `client.create`, `client.update`, `client.delete`, `client.patient.read`, `client.user.read`, `client.encounter.read` and `client.patient.request`.

#### Return Values
This `client.request` method will always return a `Promise` but it may be resolved with different values depending on the passed arguments or the server response. Here are some examples:

|Return Value|Happens if|Example
|------------|----------|-------
|`String`    |The server replies with `text/plain` or other non-json mime type containing the word `text`|`client.request("someFile.txt");`
|[Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)|The server replies with anything other than json or text|`client.request("someFile.pdf");`
|`FHIR Resource`|If we request a resource and the server replies with json|`client.request("Patient/id");`
|`FHIR Bundle`|If we request a bundle and the server replies with json|`client.request("Patient");`
|`Array of FHIR bundles`|If we request a bundle and the server replies with json and we use the `pageLimit` option|`client.request("Patient", { pageLimit: 0 });`
|`Array of FHIR resources`|If we request a bundle and the server replies with json and we use the `flat` option|`client.request("Patient", { pageLimit: 0, flat: true });`
|`null`|If we use the `onPage` callback to handle results as they arrive. In this case we don't use the result. We only need to know when the download is complete.|`client.request("Patient", { pageLimit: 5, onPage(bundle) { ... }});`
|`{ response: `[Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)`, body: <any of the above>}`|When we use the `includeResponse` option (since v2.3.11)|`client.request("Patient/id", { includeResponse: true });`


***Examples:***

**Fetch single resource**
```js
// Resolves with a Patient or rejects with an Error
client.request("Patient/id");
```

**Fetch the current patient**
```js
// Resolves with a Patient or rejects with an Error
client.request(`Patient/${client.patient.id}`);
```

**Fetch a bundle**
```js
// Resolves with a Bundle or rejects with an Error
client.request("Patient");
```

**Get all pages**
```js
// Resolves with array of Bundles or rejects with an Error
client.request("Patient", { pageLimit: 0 });
```

**Handle pages as they arrive**
```js
// Resolves with null or rejects with an Error
client.request("Patient", {
    pageLimit: 5,
    onPage(bundle) {
        // do something with the downloaded page
    }
});
```

**Resolve References**
```js
// Resolves with augmented Encounter or rejects with an Error
client.request("Encounter/518a522a-4b10-47db-9daf-53b726d32607", {
    resolveReferences: [ "serviceProvider" ]
});
```

**Extracting multiple related resources from single Observation:**
```js
// Resolves with Object (augmented Observation) or rejects with an Error
client.request("Observation/smart-691-bmi", {
    resolveReferences: [
        "context",                 // The Encounter
        "context.serviceProvider", // The Organization (hospital)
        "performer.0",             // The Practitioner (or use "performer" to get all practitioners)
        "subject",                 // The Patient
        "identifier..assigner"     // All identifier assigners
    ]
});
```

**Getting the references as separate object**

Resolved references are "mounted" on the result tree, replacing
the value of the original reference property. If you don't want that behavior,
you can set the `graph` option of the `request` method to false. In this case,
the promise will be resolved with an object having two properties:
- `data` the original response data
- `references` a map of resolved references

```js
// Resolves with Object ({ data, references }) or rejects with an Error
client.request("Encounter/518a522a-4b10-47db-9daf-53b726d32607", {
    resolveReferences: [ "serviceProvider" ],
    graph: false
});
```

### client.create(resource: Object, requestOptions = {}) `Promise<Object>`
Wrapper for `client.request` implementing the FHIR resource create operation.

### client.update(resource: Object, requestOptions = {}) `Promise<Object>`
Wrapper for `client.request` implementing the FHIR resource update operation.

### client.delete(uri: String, requestOptions = {}) `Promise<Object>`
Wrapper for `client.request` implementing the FHIR resource delete operation.

***Example:***
```js
client.delete("Patient/id");
```

### client.refresh(requestOptions = {}) `Promise<Object>`
Use the refresh token to obtain new access token. If the refresh token is
expired (or this fails for any other reason) it will be deleted from the
state, so that we don't enter into loops trying to re-authorize.

> Note that that `client.request()` will automatically refresh the access token
for you!

Resolves with the updated state or rejects with an error.

### client.refreshIfNeeded(requestOptions = {}) `Promise<Object>`
Checks if access token and refresh token are present. If they are, and if
the access token is expired or is about to expire in the next 10 seconds,
calls `client.refresh()` to obtain new access token.

### client.patient.id `String|null`

The selected patient ID or `null` if patient is not available. If no patient is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.patient.read() `Promise<Object>`
Fetches the selected patient resource (if available). Resolves with the patient or rejects with an error.

### client.patient.request(requestOptions, fhirOptions) `Promise<Object>`
Wrapper for `client.request` that will automatically add a search parameter to the requested URL to filter the requested resources to those related to the current patient. For example:
```js
client.patient.request("Observation"); // -> /Observation?patient=patient-id
client.patient.request("Group");       // -> /Group?member=patient-id
```

### client.encounter.id `string|null`

The selected encounter ID or `null` if encounter is not available. If no encounter is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.encounter.read() `Promise<object>`

Fetches the selected encounter resource (if available). Resolves with the encounter or rejects with an error.

### client.user.id `string`
The selected user ID or `null` if user is not available. If no user is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.user.fhirUser `string`
The selected user identifier that looks like `Practitioner/id` or `null` if user is not available. If no user is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.user.resourceType `string`

The selected user resourceType (E.g. `Practitioner`, `Patient`, `RelatedPerson`...) or `null` if user is not available. If no user is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.user.read() `Promise<object>`
Fetches the selected user resource (if available). Resolves with the user or rejects with an error.

### client.getFhirVersion() `Promise<string>`
Returns a promise that will be resolved with the FHIR version as defined in the conformance statement of the server.

### client.getFhirRelease() `Promise<number>`
Returns a promise that will be resolved with the numeric FHIR version:
- `2` for **DSTU2**
- `3` for **STU3**
- `4` for **R4**
- `0` if the version is not known

### client.getState(path=""): `any`
When called without an argument returns a copy of the client state. Accepts a dot-separated path argument (same as for `getPath`) to allow for selecting specific state properties. Note that this is the preferred way to read the state because `client.state.tokenResponse.patient` will throw an error if `client.state.tokenResponse` is undefined, while `client.getState("tokenResponse.patient")` will ignore that and just return `undefined`.

Examples:
```js
client.getState(); // -> the entire state object
client.getState("serverUrl"); // -> the URL we are connected to
client.getState("tokenResponse.patient"); // -> The selected patient ID (if any)
```

---

Finally, there are some **utility methods**, mostly inherited by older versions of the library:
### client.byCode(observations, property) `Object`
Groups the observations by code. Returns a map that will look like:
```js
const map = client.byCodes(observations, "code");
// map = {
//     "55284-4": [ observation1, observation2 ],
//     "6082-2": [ observation3 ]
// }
```

### client.byCodes(observations, property) `Function`
Similar to `byCode` but builds the map internally and returns a filter function
that will produce flat arrays. For example:
```js
const filter = client.byCodes(observations, "category");
filter("laboratory") // => [ observation1, observation2 ]
filter("vital-signs") // => [ observation3 ]
filter("laboratory", "vital-signs") // => [ observation1, observation2, observation3 ]
```

### client.units.cm({ code, value }) `Number`
Converts the `value` to `code`, where `code` can be `cm`, `m`, `in`, `[in_us]`, `[in_i]`, `ft`, `[ft_us]`

### client.units.kg({ code, value }) `Number`
Converts the `value` to `code`, where `code` can be `kg`, `g`, string containing `lb`, string containing `oz`.

### client.units.any({ code, value }) `Number`
Just asserts that `value` is a number and then returns that value

### client.getPath(object, path) `any`
Given an object (or array), tries to walk down to the given dot-separated path
and returns the value. It will return `undefined` if the path cannot find any property. It will NOT throw if an intermediate property does not exist.
The path is dot-separated even for arrays! Examples:
```js
const data = { a: { b: "x" }, c: [ 2, { x: 5}, [1,2,3] ]};
client.getPath(data, "") // => data
client.getPath(data, "a") // => { b: "x" }
client.getPath(data, "a.b") // => "x"
client.getPath(data, "c.1.x") // => 5
client.getPath(data, "c.2.1") // => 2
client.getPath(data, "a.b.c.d.e") // => undefined
```

## Aborting Requests
It is possible to abort HTTP requests since version `2.2.0`. The implementation
is based on the standard `AbortController` approach. You need to create an
instance of `AbortController` and pass it's `AbortSignal` as request option as
shown below.

Note that `client.request` is a powerful method that might start other requests
depending on the passed options (to fetch references or additional pages). If
a `client.request` task is aborted, that will propagate and cancel any sub-requests
that are being executed at that point.


### When used as library
When the bundle is included via `script` tag in a web page, the `AbortController`
class will be globally available (we include a polyfill). Then an abort-able
request could look like this:
```js
const client = new FHIR.client("https://r3.smarthealthit.org");
const abortController = new AbortController();
const signal = abortController.signal;

// Any of these should work
client.request({ url: "Patient", signal });
client.create(resource, { signal });
client.update(resource, { signal });
client.delete("Patient/123", { signal });
client.patient.read({ signal });
client.patient.request({ signal, url: "Immunization" });
client.encounter.read({ signal });
client.user.read({ signal });
client.refresh({ signal });

// Later...
abortController.abort();
```

### When used as module
If the library is used as module (with a bundler or in NodeJS), the usage is the
same, except that the global scope is not polyfilled. You can include your own polyfill for `AbortController`. However, we are already using `AbortController` internally and made it accessible via the entry point:
```js
import FHIR, { AbortController } from "fhirclient"

const client = new FHIR.client("https://r3.smarthealthit.org");
const abortController = new AbortController();

client.request({
    url: "Patient",
    signal: abortController.signal
}).then(console.log, console.error);

// Later...
abortController.abort();
```


