export default class HttpError extends Error {
    /**
     * The HTTP status code for this error
     */
    statusCode: number;
    /**
     * The HTTP status code for this error.
     * Note that this is the same as `status`, i.e. the code is available
     * through any of these.
     */
    status: number;
    /**
     * The HTTP status text corresponding to this error
     */
    statusText: string;
    /**
     * Reference to the HTTP Response object
     */
    response: Response;
    constructor(response: Response);
    parse(): Promise<this>;
    toJSON(): {
        name: string;
        statusCode: number;
        status: number;
        statusText: string;
        message: string;
    };
}
