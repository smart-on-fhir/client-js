import type { Bundle, BundleLink, Resource } from 'fhir/r4'
import { fhirVersions }                      from './settings'
import { fhirclient }                        from './types'
import {
    absolute,
    debug as _debug,
    getPath,
    setPath,
    makeArray,
    request,
    fetchConformanceStatement,
    assertJsonPatch,
    assert
} from "./lib";


const debug = _debug.extend("FhirClient");

export interface RequestOptions extends RequestInit {
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

    /**
     * An object where keys are URLs (or other unique strings) and values are
     * the request results. If provided, it will be used as in-memory cache.
     * Otherwise no cache will be used, but you can still use the cache option
     * for fetch requests if using this in browsers.
     */
    cacheMap?: Record<string, any>
}

/**
 * This is a basic FHIR client for making basic FHIR API calls
 */
export default class FhirClient
{
    /**
     * The state of the client instance is an object with various properties.
     * It contains some details about how the client has been authorized and
     * determines the behavior of the client instance. This state is persisted
     * in `SessionStorage` in browsers or in request session on the servers.
     */
    readonly fhirBaseUrl: string;

    /**
     * Validates the parameters and creates an instance.
     */
    constructor(fhirBaseUrl: string)
    {
        assert(
            fhirBaseUrl && typeof fhirBaseUrl === "string" && fhirBaseUrl.match(/https?:\/\/.+/),
            "A \"fhirBaseUrl\" string parameter is required and must begin with \"http(s)\""
        );
        this.fhirBaseUrl = fhirBaseUrl;
    }

    /**
     * Default request options to be used for every request. This method can be
     * overridden in subclasses to provide custom default options.
     */
    async getRequestDefaults(): Promise<Partial<RequestInit>> {
        return {}
    }

    /**
     * Creates a new resource in a server-assigned location
     * @see http://hl7.org/fhir/http.html#create
     * @param resource A FHIR resource to be created
     * @param [requestOptions] Any options to be passed to the fetch call.
     * Note that `method` and `body` will be ignored.
     * @category Request
     */
    async create<R = fhirclient.FHIR.Resource, O extends fhirclient.FetchOptions = {}>(
        resource: fhirclient.FHIR.Resource,
        requestOptions?: O
    ): Promise<O["includeResponse"] extends true ? fhirclient.CombinedFetchResult<R> : R>
    {
        return this.fhirRequest(resource.resourceType!, {
            ...requestOptions,
            method: "POST",
            body: JSON.stringify(resource),
            headers: {
                "content-type": "application/json",
                ...(requestOptions || {}).headers
            }
        });
    }

    /**
     * Creates a new current version for an existing resource or creates an
     * initial version if no resource already exists for the given id.
     * @see http://hl7.org/fhir/http.html#update
     * @param resource A FHIR resource to be updated
     * @param requestOptions Any options to be passed to the fetch call.
     * Note that `method` and `body` will be ignored.
     * @category Request
     */
    async update<R = fhirclient.FHIR.Resource, O extends fhirclient.FetchOptions = {}>(
        resource: fhirclient.FHIR.Resource,
        requestOptions?: O
    ): Promise<O["includeResponse"] extends true ? fhirclient.CombinedFetchResult<R> : R>
    {
        return this.fhirRequest(`${resource.resourceType}/${resource.id}`, {
            ...requestOptions,
            method: "PUT",
            body: JSON.stringify(resource),
            headers: {
                "content-type": "application/json",
                ...(requestOptions || {}).headers
            }
        });
    }

    /**
     * Removes an existing resource.
     * @see http://hl7.org/fhir/http.html#delete
     * @param url Relative URI of the FHIR resource to be deleted
     * (format: `resourceType/id`)
     * @param requestOptions Any options (except `method` which will be fixed
     * to `DELETE`) to be passed to the fetch call.
     * @category Request
     */
    async delete<R = unknown>(url: string, requestOptions: fhirclient.FetchOptions = {}): Promise<R>
    {
        return this.fhirRequest<R>(url, { ...requestOptions, method: "DELETE" });
    }

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
    async patch<ResolveType=fhirclient.FHIR.Resource>(
        url: string,
        patch: fhirclient.JsonPatch,
        requestOptions: fhirclient.FetchOptions = {}
    ): Promise<ResolveType>
    {
        assertJsonPatch(patch);
        return this.fhirRequest<ResolveType>(url, {
            ...requestOptions,
            method: "PATCH",
            body: JSON.stringify(patch),
            headers: {
                "prefer": "return=presentation",
                "content-type": "application/json-patch+json; charset=UTF-8",
                ...requestOptions.headers,
            }
        });
    }

    private async resolveRef(
        obj  : Resource,
        path : string,
        graph: boolean,
        cache: Record<string, any>,
        requestOptions: Omit<fhirclient.RequestOptions, "url"> = {}
    ) {
        const node = getPath(obj, path);
        if (node) {
            const isArray = Array.isArray(node);
            return Promise.all(makeArray(node).filter(Boolean).map((item, i) => {
                const ref = item.reference;
                if (ref) {
                    return this.fhirRequest(ref, { ...requestOptions, includeResponse: false, cacheMap: cache }).then(sub => {
                        if (graph) {
                            if (isArray) {
                                if (path.indexOf("..") > -1) {
                                    setPath(obj, `${path.replace("..", `.${i}.`)}`, sub);    
                                } else {
                                    setPath(obj, `${path}.${i}`, sub);
                                }
                            } else {
                                setPath(obj, path, sub);
                            }
                        }
                    }).catch((ex) => {
                        if (ex?.status === 404) {
                            console.warn(`Missing reference ${ref}. ${ex}`)
                        } else {
                            throw ex;
                        }
                    });
                }
            }));
        }
    }

    /**
     * Fetches all references in the given resource, ignoring duplicates, and
     * then modifies the resource by "mounting" the resolved references in place
     */
    async resolveReferences(
        resource: Resource,
        references: string[],
        requestOptions: Omit<fhirclient.RequestOptions, "url"> = {}
    ): Promise<void> {
        await this.fetchReferences(resource, references, true, {}, requestOptions)
    }

    protected async fetchReferences(
        resource: Resource,
        references: string[],
        graph: boolean,
        cache: Record<string, any> = {},
        requestOptions: Omit<fhirclient.RequestOptions, "url"> = {}
    ): Promise<Record<string, any>> {

        if (resource.resourceType == "Bundle") {
            for (const item of ((resource as Bundle).entry || [])) {
                if (item.resource) {
                    await this.fetchReferences(item.resource, references, graph, cache, requestOptions)
                }
            }
            return cache
        }
        
        // 1. Sanitize paths, remove any invalid ones
        let paths = references.map(path => String(path).trim()).filter(Boolean);

        // 2. Remove duplicates
        paths = paths.reduce((prev, cur) => {
            if (prev.includes(cur)) {
                debug("Duplicated reference path \"%s\"", cur);
            } else {
                prev.push(cur)
            }
            return prev
        }, [] as string[]);

        // 3. Early exit if no valid paths are found
        if (!paths.length) {
            return Promise.resolve(cache);
        }

        // 4. Group the paths by depth so that child refs are looked up
        // after their parents!
        const groups: Record<string, any> = {};
        paths.forEach(path => {
            const len = path.split(".").length;
            if (!groups[len]) {
                groups[len] = [];
            }
            groups[len].push(path);
        });

        // 5. Execute groups sequentially! Paths within same group are
        // fetched in parallel!
        let task: Promise<any> = Promise.resolve();
        Object.keys(groups).sort().forEach(len => {
            const group = groups[len];
            task = task.then(() => Promise.all(group.map((path: string) => {
                return this.resolveRef(resource, path, graph, cache, requestOptions);
            })));
        });
        await task;
        return cache
    }

    /**
     * Fetches all references in the given resource, ignoring duplicates
     */
    async getReferences(
        resource: Resource,
        references: string[],
        requestOptions: Omit<fhirclient.RequestOptions, "url"> = {}
    ): Promise<Record<string, Resource>> {
        const refs = await this.fetchReferences(resource, references, false, {}, requestOptions)
        const out: any = {}
        for (const key in refs) {
            out[key] = await refs[key]
        }
        return out
    }

    /**
     * Given a FHIR Bundle or a URL pointing to a bundle, iterates over all
     * entry resources. Note that this will also automatically crawl through
     * further pages (if any)
     */
    async *resources(bundleOrUrl: Bundle | string | URL, options?: RequestOptions) {
        let count = 0
        for await(const page of this.pages(bundleOrUrl, options)) {
            for (const entry of (page.entry || [])) {
                if (options?.limit && ++count > options.limit) {
                    return
                }
                yield entry.resource
            }
        }
    }

    /**
     * Given a FHIR Bundle or a URL pointing to a bundle, iterates over all
     * pages. Note that this will automatically crawl through
     * further pages (if any) but it will not detect previous pages. It is
     * designed to be called on the first page and fetch any followup pages.
     */
    async *pages(
        bundleOrUrl    : Bundle | string | URL,
        requestOptions?: RequestOptions
    ) {
        const { limit, ...options } = requestOptions || {}
        
        const fetchPage = (url: string | URL) => this.fhirRequest(url, options)

        let page: Bundle = typeof bundleOrUrl === "string" || bundleOrUrl instanceof URL ?
            await fetchPage(bundleOrUrl) :
            bundleOrUrl;

        let count = 0
  
        while (page && page.resourceType === "Bundle" && (!limit || ++count <= limit)) {
            
            // Yield the current page
            yield page;
        
            // If caller aborted, stop crawling
            if (options?.signal?.aborted) {
                break;
            }
        
            // Find the "next" link
            const nextLink = (page.link ?? []).find(
                (l: BundleLink) => l.relation === 'next' && typeof l.url === 'string'
            );
        
            if (!nextLink) {
                break; // no more pages
            }
    
            // Fetch the next page
            page = await fetchPage(nextLink.url!);
        }
    }

    /**
     * The method responsible for making all http requests
     */
    async fhirRequest<T = any>(uri: string | URL, options: RequestOptions = {}): Promise<T>
    {
        assert(options, "fhirRequest requires a uri as first argument");

        const getRequestDefaults = await this.getRequestDefaults();
        options = {
            ...getRequestDefaults,
            ...options,
            headers: {
                ...(getRequestDefaults.headers || {}),
                ...(options.headers || {})
            }            
        }

        const path = uri + ""
        const url  = absolute(path, this.fhirBaseUrl);
        const { cacheMap } = options

        if (cacheMap) {
            if (!(path in cacheMap)) {
                cacheMap[path] = request<T>(url, options)
                .then(res => {
                    cacheMap[path] = res;
                    return res;
                })
                .catch(error => {
                    delete cacheMap[path];
                    throw error;
                });
            }
            return cacheMap[path];
        }
        return request<T>(url, options)
    }

    /**
     * Returns a promise that will be resolved with the fhir version as defined
     * in the CapabilityStatement.
     */
    async getFhirVersion(): Promise<string>
    {
        return fetchConformanceStatement(this.fhirBaseUrl)
            .then((metadata) => metadata.fhirVersion);
    }

    /**
     * Returns a promise that will be resolved with the numeric fhir version
     * - 2 for DSTU2
     * - 3 for STU3
     * - 4 for R4
     * - 0 if the version is not known
     */
    async getFhirRelease(): Promise<number>
    {
        return this.getFhirVersion().then(v => (fhirVersions as any)[v] ?? 0);
    }
}
