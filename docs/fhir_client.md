# FhirClient

`FhirClient` is the base class responsible for handling HTTP requests to a FHIR server.
It does not include any SMART-related logic or any authentication methods, but it is
ideal if you want to connect to an open server, especially in NodeJS where it can be
used without having to provide a server request/response environment.

## Usage
In browsers you can do:
```js
const client = new FHIR.FhirClient("https://open-fhir-server.org");
```

In node the same could be done like so:
```ts
import FHIR from "fhirclient";

const client = new FHIR.FhirClient("https://open-fhir-server.org");
```

## Constructor
Creating an instance is simple. The constructor only accepts a single required argument - the base URL of the FHIR server:

```ts
import FHIR from "fhirclient";

const client = new FHIR.FhirClient("https://r4.smarthealthit.org");

const patient = await client.fhirRequest("Patient/123");
const observation = await client.fhirRequest("Observation/123");
// ....
```

## Methods

### create

`create(resource: FhirResource, options: RequestOptions = {}): Promise<FhirResource>`
 
Wrapper for `fhirRequest` implementing the FHIR resource create operation.

<hr />

### update

`update(resource: FhirResource, options: RequestOptions = {}): Promise<FhirResource>`
 
Wrapper for `fhirRequest` implementing the FHIR resource update operation.

<hr />

### patch

`patch(uri: string, patch: Object, options: RequestOptions = {}): Promise<FhirResource>`

Wrapper for `fhirRequest` implementing the FHIR resource update operation.

<hr />

### delete

`delete(uri: string, options: RequestOptions = {}): Promise<FhirResource>`

Wrapper for `fhirRequest` implementing the FHIR resource delete operation.
***Example:***
```js
client.delete("Patient/id");
```
<hr />

### getReferences

`getReferences(resource: FhirResource, references: string[], options: RequestOptions = {}): Record<string, FhirResource>`

Fetch all references found within the given resource, build a object where keys
are the references as found in the source resource, and values are the resources
that those references point to. Returns a promise that resolves with that
map-like object.

<hr />

### resolveReferences
`resolveReferences(resource: FhirResource, references: string[], options: RequestOptions = {}): Promise<FhirResource>`

Similar to `getReferences`, but modifies the resources by replacing the
references with whatever they resolve to.

<hr />

### pages

`*pages(bundleOrUrl: string | URL | Bundle, options: RequestOptions = {}): AsyncGenerator<Bundle>`

An sync iterator to make it easier to consume multiple pages in streaming fashion. Example:

```ts
// Iterate over the first 10 pages of patients
for await(const page of client.pages("/Patient", { limit: 10 })) {
                
    console.log(page)

    // We have full control here! We can wait a while before fetching the next
    // page, or throw an error, or just `break;` if we want to exit early
    await sleep(100) // just an example
}
```

<hr />

### resources

`*resources(bundleOrUrl: string | URL | Bundle, options: RequestOptions = {}): AsyncGenerator<FhirResource>`

Returns an sync iterator to make it easier to consume multiple resources in
streaming fashion:
```ts
// Iterate over the first 200 patients, even if they come from multiple pages
for await(const patient of client.resources("/Patient", { limit: 200 })) {
    console.log(patient)
}
```

<hr />

### getFhirVersion

`getFhirVersion(): Promise<string>`

Returns a promise that will be resolved with the FHIR version as defined in the conformance statement of the server.

<hr />

### getFhirRelease

`getFhirRelease(): Promise<number>`

Returns a promise that will be resolved with the numeric FHIR version:
- `2` for **DSTU2**
- `3` for **STU3**
- `4` for **R4**
- `0` if the version is not known

## Types

### RequestOptions

For the purpose of documentation we define a type called `RequestOptions`. This includes any option that
`fetch supports` plus two custom ones. This can be written like so in TypeScript:

```ts
interface RequestOptions extends RequestInit {
    /**
     * If the `includeResponse` option is `true` we can expect a
     * `CombinedFetchResult` where the `response` property is the `Response`
     * object and the `body` property is the parsed body.
     */
    includeResponse?: boolean;

    /**
     * Sets a limit if applicable. For example, we can control how many pages to
     * or resources to fetch
     */
    limit?: number
}
```

## Extending the Class
You can extend this class to provide additional functionality. Here is a simple example that would add an access token to every request:

```ts
import FHIR from "fhirclient";

class AuthenticatedFhirClient extends FHIR.FhirClient {
    async fhirRequest<T>(uri, options = {}) {
        options.headers = {
            ...options.headers,
            authorization: `Bearer ${process.env.ACCESS_TOKEN}`
        }
        return super.fhirRequest<T>(uri, options)
    }
}
```
