import { expect } from "chai";
import HttpError  from "../src/HttpError";


describe("HttpError", () => {
    it ("create from text response", async () => {
        const resp = new Response("Test error", {
            status: 400,
            statusText: "Bad Request (test)",
            headers: {
                "content-type": "text/plain"
            }
        });
        const error = new HttpError(resp);
        expect(error.name).to.equal("HttpError");
        expect(error.message).to.equal("400 Bad Request (test)\nURL: ");
        expect(error.statusCode).to.equal(400);
        expect(error.status).to.equal(400);
        expect(error.statusText).to.equal("Bad Request (test)");
        await error.parse();
        expect(error.message).to.equal("400 Bad Request (test)\nURL: \n\nTest error");
        expect(JSON.stringify(error)).to.equal(JSON.stringify({
            name      : "HttpError",
            statusCode: 400,
            status    : 400,
            statusText: "Bad Request (test)",
            message   : "400 Bad Request (test)\nURL: \n\nTest error"
        }));
    });

    it ("parse ignores unknown mime types", async () => {
        const resp = new Response("Test error", {
            status: 400,
            statusText: "Bad Request (test)",
            headers: {
                "content-type": "application/pdf"
            }
        });
        const error = new HttpError(resp);
        expect(error.message).to.equal("400 Bad Request (test)\nURL: ");
        await error.parse();
        expect(error.message).to.equal("400 Bad Request (test)\nURL: ");
    });

    it ("create from json response", async () => {
        const resp = new Response('{"x":"y"}', {
            status: 400,
            statusText: "Bad Request (test)",
            headers: {
                "content-type": "application/json"
            }
        });
        const error = new HttpError(resp);
        expect(error.name).to.equal("HttpError");
        expect(error.message).to.equal("400 Bad Request (test)\nURL: ");
        expect(error.statusCode).to.equal(400);
        expect(error.status).to.equal(400);
        expect(error.statusText).to.equal("Bad Request (test)");
        await error.parse();
        expect(error.message).to.equal('400 Bad Request (test)\nURL: \n\n{\n    "x": "y"\n}');
    });

    it ("create from json response having error property", async () => {
        const resp = new Response('{"error":"x"}', {
            status: 400,
            statusText: "Bad Request (test)",
            headers: {
                "content-type": "application/json"
            }
        });
        const error = new HttpError(resp);
        expect(error.name).to.equal("HttpError");
        expect(error.message).to.equal("400 Bad Request (test)\nURL: ");
        expect(error.statusCode).to.equal(400);
        expect(error.status).to.equal(400);
        expect(error.statusText).to.equal("Bad Request (test)");
        await error.parse();
        expect(error.message).to.equal(
            '400 Bad Request (test)\nURL: \nx'
        );
    });

    it ("create from json response having error and error_description properties", async () => {
        const resp = new Response('{"error":"x","error_description":"y"}', {
            status: 400,
            statusText: "Bad Request (test)",
            headers: {
                "content-type": "application/json"
            }
        });
        const error = new HttpError(resp);
        expect(error.name).to.equal("HttpError");
        expect(error.message).to.equal("400 Bad Request (test)\nURL: ");
        expect(error.statusCode).to.equal(400);
        expect(error.status).to.equal(400);
        expect(error.statusText).to.equal("Bad Request (test)");
        await error.parse();
        expect(error.message).to.equal(
            '400 Bad Request (test)\nURL: \nx: y'
        );
    });

    it ("parse can be called twice", async () => {
        const error = new HttpError(new Response());
        await error.parse();
        await error.parse();
    });
});
