const express = require("express");
const cors = require("cors");

let router = express.Router();

/**
 * @param {import("express").RequestHandler} fn 
 * @returns {import("express").RequestHandler}
 */
function routeWrap(fn) {
    return (req, res, next) => {
        return Promise.resolve(fn(req, res, next)).catch(e => next(String(e)));
    };
}

/** @type {any} */
const app = express();

app.use(cors());

app.use((req, res, next) => {
    res.set({
        "cache-control": "no-cache, no-store, must-revalidate",
        "pragma"       : "no-cache",
        "expires"      : "0"
    });
    next();
})

/**
 * @param {'all'|'get'|'post'|'put'|'delete'|'patch'|'options'|'head' |
 *  { method: 'all'|'get'|'post'|'put'|'delete'|'patch'|'options'|'head', path: string }} a 
 * @param {*} mock 
 * @returns 
 */
function mockFunction(a, mock) {
    if (typeof a === "string") {
        return mockFunction({ method: "get", path: a }, mock)
    }

    if (mock.bodyParser) {
        router[a.method](a.path, mock.bodyParser)
    }
    
    router[a.method](a.path, (req, res, next) => {

        Object.defineProperties(mock, {
            _request: {
                configurable: false,
                enumerable: true,
                writable: false,
                value: req
            },
            _response: {
                configurable: false,
                enumerable: true,
                writable: false,
                value: res
            }
        });
        Object.freeze(mock);

        setTimeout(() => {

            if (mock.handler) {
                return routeWrap(mock.handler)(req, res, next);
            }
    
            if (mock.headers) {
                res.set(mock.headers);
            }
    
            if (mock.status) {
                res.status(mock.status);
            }
    
            if (mock.body) {
                res.send(
                    mock.body && typeof mock.body == "object" ?
                        JSON.stringify(mock.body) :
                        mock.body
                );
            }
    
            if (mock.file) {
                res.sendFile(mock.file, { root: __dirname });
            } else {
                res.end();
            }
        }, mock._delay || 0);
    });
    
    return mock
}

app.mock = mockFunction;

app.clear = () => {
    router = express.Router();
}

app.use(function (req, res, next) {
    router(req, res, next)
})

app.use((err, _req, res, _next) => {
    console.log("============= Mock Server Error =============")
    console.error(err)
    console.log("=============================================")
    res.status(500).send(String(err));
});

module.exports = app;
