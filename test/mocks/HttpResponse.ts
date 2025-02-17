export default class HttpResponse
{
    status: number;
    headers: {[key: string]: any};
    constructor()
    {
        this.status = 0;
        this.headers = {};
    }

    writeHead(status: number, headers: {[key: string]: any})
    {
        this.status = status;
        Object.assign(this.headers, headers);
    }

    end(): void {}
}
