
export default class HttpError extends Error
{
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

    constructor(response: Response) {
        super(`${response.status} ${response.statusText}\nURL: ${response.url}`);
        this.name       = "HttpError";
        this.response   = response;
        this.statusCode = response.status;
        this.status     = response.status;
        this.statusText = response.statusText;
    }

    async parse()
    {
        if (!this.response.bodyUsed) {
            try {
                const type = this.response.headers.get("content-type") || "text/plain";
                if (type.match(/\bjson\b/i)) {
                    let body = await this.response.json();
                    if (body.error) {
                        this.message += "\n" + body.error;
                        if (body.error_description) {
                            this.message += ": " + body.error_description;
                        }
                    }
                    else {
                        this.message += "\n\n" + JSON.stringify(body, null, 4);
                    }
                }
                else if (type.match(/^text\//i)) {
                    let body = await this.response.text();
                    if (body) {
                        this.message += "\n\n" + body;
                    }
                }
            } catch {
                // ignore
            }
        }

        return this;
    }

    toJSON() {
        return {
            name      : this.name,
            statusCode: this.statusCode,
            status    : this.status,
            statusText: this.statusText,
            message   : this.message
        };
    }
}
