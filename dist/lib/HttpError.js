"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class HttpError extends Error {
  constructor(response) {
    super(`${response.status} ${response.statusText}\nURL: ${response.url}`);
    this.name = "HttpError";
    this.response = response;
    this.statusCode = response.status;
    this.status = response.status;
    this.statusText = response.statusText;
  }
  async parse() {
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
          } else {
            this.message += "\n\n" + JSON.stringify(body, null, 4);
          }
        } else if (type.match(/^text\//i)) {
          let body = await this.response.text();
          if (body) {
            this.message += "\n\n" + body;
          }
        }
      } catch (_a) {
        // ignore
      }
    }
    return this;
  }
  toJSON() {
    return {
      name: this.name,
      statusCode: this.statusCode,
      status: this.status,
      statusText: this.statusText,
      message: this.message
    };
  }
}
exports.default = HttpError;