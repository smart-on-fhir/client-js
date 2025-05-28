import type { Bundle, Resource } from 'fhir/r4';
import { fhirclient } from './types';
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
    limit?: number;
    /**
     * An object where keys are URLs (or other unique strings) and values are
     * the request results. If provided, it will be used as in-memory cache.
     * Otherwise no cache will be used, but you can still use the cache option
     * for fetch requests if using this in browsers.
     */
    cacheMap?: Record<string, any>;
}
/**
 * This is a basic FHIR client for making basic FHIR API calls
 */
export default class FhirClient {
    /**
     * The state of the client instance is an object with various properties.
     * It contains some details about how the client has been authorized and
     * determines the behavior of the client instance. This state is persisted
     * in `SessionStorage` in browsers or in request session on the servers.
     */
    readonly fhirBaseUrl: string;
    /**
     * Validates the parameters, creates an instance and tries to connect it to
     * FhirJS, if one is available globally.
     */
    constructor(fhirBaseUrl: string);
    /**
     * Creates a new resource in a server-assigned location
     * @see http://hl7.org/fhir/http.html#create
     * @param resource A FHIR resource to be created
     * @param [requestOptions] Any options to be passed to the fetch call.
     * Note that `method` and `body` will be ignored.
     * @category Request
     */
    create<R = fhirclient.FHIR.Resource, O extends fhirclient.FetchOptions = {}>(resource: fhirclient.FHIR.Resource, requestOptions?: O): Promise<O["includeResponse"] extends true ? fhirclient.CombinedFetchResult<R> : R>;
    /**
     * Creates a new current version for an existing resource or creates an
     * initial version if no resource already exists for the given id.
     * @see http://hl7.org/fhir/http.html#update
     * @param resource A FHIR resource to be updated
     * @param requestOptions Any options to be passed to the fetch call.
     * Note that `method` and `body` will be ignored.
     * @category Request
     */
    update<R = fhirclient.FHIR.Resource, O extends fhirclient.FetchOptions = {}>(resource: fhirclient.FHIR.Resource, requestOptions?: O): Promise<O["includeResponse"] extends true ? fhirclient.CombinedFetchResult<R> : R>;
    /**
     * Removes an existing resource.
     * @see http://hl7.org/fhir/http.html#delete
     * @param url Relative URI of the FHIR resource to be deleted
     * (format: `resourceType/id`)
     * @param requestOptions Any options (except `method` which will be fixed
     * to `DELETE`) to be passed to the fetch call.
     * @category Request
     */
    delete<R = unknown>(url: string, requestOptions?: fhirclient.FetchOptions): Promise<R>;
    /**
     * Makes a JSON Patch to the given resource
     * @see http://hl7.org/fhir/http.html#patch
     * @param url Relative URI of the FHIR resource to be patched
     * (format: `resourceType/id`)
     * @param patch A JSON Patch array to send to the server, For details
     * see https://datatracker.ietf.org/doc/html/rfc6902
     * @param requestOptions Any options to be passed to the fetch call,
     * except for `method`, `url` and `body` which cannot be overridden.
     * @since 2.4.0
     * @category Request
     * @typeParam ResolveType This method would typically resolve with the
     * patched resource or reject with an OperationOutcome. However, this may
     * depend on the server implementation or even on the request headers.
     * For that reason, if the default resolve type (which is
     * [[fhirclient.FHIR.Resource]]) does not work for you, you can pass
     * in your own resolve type parameter.
     */
    patch<ResolveType = fhirclient.FHIR.Resource>(url: string, patch: fhirclient.JsonPatch, requestOptions?: fhirclient.FetchOptions): Promise<ResolveType>;
    private resolveRef;
    /**
     * Fetches all references in the given resource, ignoring duplicates, and
     * then modifies the resource by "mounting" the resolved references in place
     */
    resolveReferences(resource: Resource, references: string[], requestOptions?: Omit<fhirclient.RequestOptions, "url">): Promise<void>;
    protected fetchReferences(resource: Resource, references: string[], graph: boolean, cache?: Record<string, any>, requestOptions?: Omit<fhirclient.RequestOptions, "url">): Promise<Record<string, any>>;
    /**
     * Fetches all references in the given resource, ignoring duplicates
     */
    getReferences(resource: Resource, references: string[], requestOptions?: Omit<fhirclient.RequestOptions, "url">): Promise<Record<string, Resource>>;
    /**
     * Given a FHIR Bundle or a URL pointing to a bundle, iterates over all
     * entry resources. Note that this will also automatically crawl through
     * further pages (if any)
     */
    resources(bundleOrUrl: Bundle | string | URL, options?: RequestOptions): AsyncGenerator<import("fhir/r4").FhirResource, void, unknown>;
    /**
     * Given a FHIR Bundle or a URL pointing to a bundle, iterates over all
     * pages. Note that this will automatically crawl through
     * further pages (if any) but it will not detect previous pages. It is
     * designed to be called on the first page and fetch any followup pages.
     */
    pages(bundleOrUrl: Bundle | string | URL, requestOptions?: RequestOptions): AsyncGenerator<Bundle<import("fhir/r4").FhirResource>, void, unknown>;
    /**
     * The method responsible for making all http requests
     */
    fhirRequest<T = any>(uri: string | URL, options?: RequestOptions): Promise<T>;
    /**
     * Returns a promise that will be resolved with the fhir version as defined
     * in the CapabilityStatement.
     */
    getFhirVersion(): Promise<string>;
    /**
     * Returns a promise that will be resolved with the numeric fhir version
     * - 2 for DSTU2
     * - 3 for STU3
     * - 4 for R4
     * - 0 if the version is not known
     */
    getFhirRelease(): Promise<number>;
}
export {};
