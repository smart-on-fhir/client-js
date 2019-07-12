# Client
This is a FHIR client that is returned to you from the `ready()` call of the SMART API. You can also create it yourself if needed:
```js
// BROWSER
const client = FHIR.client("https://r4.smarthealthit.org");

// SERVER
const client = smart(req, res).client("https://r4.smarthealthit.org");
```
It exposes the following API:

<!--
### `client.getPatientId()`
### `client.getEncounterId()`
### `client.getIdToken()`
### `client.getFhirUser()`
### `client.getUserId()`
### `client.getUserType()`
-->
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
    - Each item is a dot-separated path to the desired reference within the result object, excluding the "reference" property. For example `context.serviceProvider` will look for `{Response}.context.serviceProvider.reference`.
    - If the target is an array of references (E.g. [Patient.generalPractitioner](http://hl7.org/fhir/R4/patient-definitions.html#Patient.generalPractitioner)), you can request one or more of them by index (E.g. `generalPractitioner.0`). If the index is not specified, all the references in the array will be resolved.
    - The order in which the reference paths are specified does not matter. For example, if you use `["subject", "encounter.serviceProvider", "encounter"]`, the library should figure out that `encounter.serviceProvider` must be fetched after `encounter`. In fact, in this case it will first fetch subject and encounter in parallel, and then proceed to encounter.serviceProvider.
    - This option does not work with contained references (they are "already resolved" anyway).
- **useRefreshToken** `Boolean` - **Defaults to `true`**. If the client is authorized, it will possess an access token and pass it with the requests it makes. When that token expires, you should get back a `401 Unauthorized` response. When that happens, if the client also has a refresh token and if `useRefreshToken` is `true` (default), the client will attempt to automatically re-authorize itself and then it will re-run the failed request and eventually resolve it's promise with the final result. This means that your requests should never fail with `401`, unless the refresh token is also expired. If you don't want this, you can set `useRefreshToken` to `false`. There is a `refresh` method on the client that can be called manually to renew the access token.

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
client.request(
    "Encounter/518a522a-4b10-47db-9daf-53b726d32607",
    resolveReferences: [ "serviceProvider" ]
);
```

**Extracting multiple related resources from single Observation:**
```js
// Resolves with Object (augmented Observation) or rejects with an Error
client.request(
    "Observation/smart-691-bmi",
    resolveReferences: [
        "context",                 // The Encounter
        "context.serviceProvider", // The Organization (hospital)
        "performer.0",             // The Practitioner
        "subject"                  // The Patient
    ]
);
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
client.request(
    "Encounter/518a522a-4b10-47db-9daf-53b726d32607",
    resolveReferences: [ "serviceProvider" ],
    graph: false
);
```

### client.create(resource: Object) `Promise<Object>`
A wrapper for `client.request` implementing the FHIR resource create operation.

### client.update(resource: Object) `Promise<Object>`
A wrapper for `client.request` implementing the FHIR resource update operation.

### client.delete(url: String) `Promise<Object>`
A wrapper for `client.request` implementing the FHIR resource delete operation.

***Example:***
```js
client.delete("Patient/id");
```

### client.refresh() `Promise<Object>`
Use the refresh token to obtain new access token. If the refresh token is
expired (or this fails for any other reason) it will be deleted from the
state, so that we don't enter into loops trying to re-authorize.

> Note that that `client.request()` will automatically refresh the access token
for you!

Resolves with the updated state or rejects with an error.

### client.api `Object`

Only accessible if fhir.js is available. Read more about the fhir.js integration [here](README.md#fhirjs-integration).

### client.patient.id `String|null`

The selected patient ID or `null` if patient is not available. If no patient is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.patient.read() `Promise<Object>`
Fetches the selected patient resource (if available). Resolves with the patient or rejects with an error.

### client.patient.api `Object`

Only accessible if fhir.js is available. Read more about the fhir.js integration [here](README.md#fhirjs-integration).

### client.encounter.id `String|null`

The selected encounter ID or `null` if encounter is not available. If no encounter is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.encounter.read() `Promise<Object>`

Fetches the selected encounter resource (if available). Resolves with the encounter or rejects with an error.

### client.user.id `String`
The selected user ID or `null` if user is not available. If no user is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.user.fhirUser `String`
The selected user identifier that looks like `Practitioner/id` or `null` if user is not available. If no user is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.user.resourceType `String`

The selected user resourceType (E.g. `Practitioner`, `Patient`, `RelatedPerson`...) or `null` if user is not available. If no user is selected, it will generate useful debug messages about the possible reasons. See [debugging](README.md#debugging).

### client.user.read() `Promise<Object>`
Fetches the selected user resource (if available). Resolves with the user or rejects with an error. 

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
