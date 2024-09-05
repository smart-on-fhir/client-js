"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ServerStorage {
    constructor(request) {
        this.request = request;
    }
    async get(key) {
        return this.request.session[key];
    }
    async set(key, value) {
        this.request.session[key] = value;
        return value;
    }
    async unset(key) {
        if (Object.prototype.hasOwnProperty.call(this.request.session, key)) {
            delete this.request.session[key];
            return true;
        }
        return false;
    }
}
exports.default = ServerStorage;
