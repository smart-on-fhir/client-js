# SMART API

The SMART API is a collection of SMART-specific methods (`authorize`, `ready`, `init`) for app authorization and launch.
If you are working in a browser, the SMART API is automatically created, and available at
`window.FHIR.oauth2`. In NodeJS, the library exports a function that should be called
with a http request and response objects, and will return the same SMART API as in the browser. 

```js
// BROWSER
const smart = FHIR.oauth2;
smart.authorize(options);

// SERVER
const smart = require("fhirclient");
smart(request, response).authorize(options);
```


### authorize(options|options[]) `Promise<never>`
Starts the [SMART Launch Sequence](http://hl7.org/fhir/smart-app-launch/#smart-launch-sequence).

> **IMPORTANT:** `authorize()` will end up redirecting you to the authorization server. This means that you should **not** add anything to the returned promise chain. Any code written directly after the `authorize()` call might not be executed due to that redirect!

The options that you would typically pass for an EHR launch are just `clientId`
and `scope`. For standalone launch you should also provide the `iss` option.
Here is the full list of options:

#### Common Options

|Name        |Type      |Description
|------------|----------|-----------
|clientId    |`String`  | The `client_id` that you have obtained while registering your app in the EHR. This is not required if you only intend to communicate with open FHIR servers. **Note:** For backwards compatibility reasons we also accept `client_id` instead of `clientId`!
|scope       |`String`  | One or more space-separated scopes that you would like to request from the EHR. [Learn more](http://hl7.org/fhir/smart-app-launch/scopes-and-launch-context/index.html)
|clientSecret|`String`  | If you have registered a confidential client, you should pass your `clientSecret` here. **Note: ONLY use this on the server**, as the browsers are considered incapable of keeping a secret. 
|iss         |`String`  | This is the URL of the service you are connecting to. For [EHR Launch](http://hl7.org/fhir/smart-app-launch/#ehr-launch-sequence) you **MUST NOT** provide this option. It will be passed by the EHR as url parameter instead. Using `iss` as an option will "lock" your app to that service provider. In other words, passing an `iss` option is how you do [Standalone Launch](http://hl7.org/fhir/smart-app-launch/#standalone-launch-sequence).
|redirectUri |`String`  | Where to redirect to after successful authorization. Defaults to the root (the index) of the current directory. The `redirectUri` should point to a location on the same domain, thus relative paths should be used and they will internally be converted to absolute. In rare cases you might want to to redirect to the site root. That would add a slash to your origin (eg.: `http://localhost/`). If you don't want the trailing slash to be added you can use an absolute URL instead. **Note:** For backwards compatibility reasons we also accept `redirect_uri` instead of `redirectUri`!

#### Advanced Options
These should **ONLY** be used in development.

|Name             |Type      | Description
|-----------------|----------|-----------
|fhirServiceUrl   |`String`  | The base URL of the FHIR server to use. This is just like the `iss` option, except that it is designed to bypass the authentication. If `fhirServiceUrl` is passed, the `authorize` function will not actually attempt to authorize. It will skip that and redirect you to your `redirect_uri`.
|patientId        |`String`  | The ID of the selected patient. If you are launching against an open FHIR server, there is no way to obtain the launch context that would include the selected patient ID. This way you can "inject" that ID and make the client behave as if this is the currently active patient.
|encounterId      |`String`  | The ID of the selected encounter. If you are launching against an open FHIR server, there is no way to obtain the launch context that would (in some EHRs) include the selected encounter ID. This way you can "inject" that ID and make the client behave as if this is the currently active encounter.
|launch           |`String`  | The launch identifier that is typically provided by the launching EHR as `launch` url parameter. In development it is sometimes useful to be able to pass this as an option. For example, this could allow you to simulate launches from you tests.
|fakeTokenResponse|`Object`  | Useful for testing. This object can contain any properties that are typically contained in an [access token response](http://hl7.org/fhir/smart-app-launch/#step-3-app-exchanges-authorization-code-for-access-token). These properties will be stored into the client state, making it "believe" that it has been authorized.
|target|`string` or `number` or `function` or `Window`| Where to start the auth flow. This option is only applicable in browsers and is ignored on the server. Can be one of:
| | | `"_self"`   Authorize in the same window (**default**)
| | | `"_top"`    Authorize in the topmost window
| | | `"_parent"` Authorize in the parent window
| | | `"_blank"`  Authorize in new tab or window
| | | `"popup"`   Open a popup, authorize in it and close it when done (unless `completeInTarget` is `true`)
| | | `String`    Frame name (string index in window.frames)
| | | `Number`    Numeric index in `window.frames`
| | | `Object`    Window reference (must have the same `origin`)
| | | `Function`  A function that returns one of the above values or a promise that will resolve to such value.
|completeInTarget|`boolean`| If `true`, the app will be initialized in the specified `target`. Otherwise, the app will be initialized in the window in which`authorize` was called. This option is only applicable if `target` is used and refers to another window, or if the app is loaded in an iframe or popup window. Defaults to `true` if the app is started in an iframe and to `false` otherwise. Note that you SHOULD always set this option if your app is loaded in a popup or frame (which might even happen in some EHR environments).
|width|`number`| The width of the authorization popup window. Only used in browsers and if the `target` option is set to "popup". Defaults to `800`.
|height|`number`| The height of the authorization popup window. Only used in browsers and if the `target` option is set to "popup". Defaults to `720`.
|issMatch|`string` or `RegExp` or `function`|Since version `2.3.11`, in case of EHR launch the `authorize` function can also be called with an array of options. This makes it possible to pre-configure an app to be launch-able from multiple EHR systems. The correct configuration will be picked based on the passed `iss` url parameter. [Read More](http://docs.smarthealthit.org/client-js/open_servers#2-using-multiple-launch-configurations)


### ready([onSuccess [, onError]]) `Promise<Client>`
This should be called on your `redirect_uri`. Returns a Promise that will eventually be resolved with a Client instance that you can use to query the fhir server.

> The `onSuccess` and `onError` callback functions are optional (and **deprecated**). We only accept them to keep the library compatible with older apps. If these functions are provided, they will simply be attached to the returned promise chain.

### init(options) `Promise<Client>` (experimental)
This function can be used when you want to handle everything in one page (no launch endpoint needed). You can think of it as if it does:
```js
authorize(options).then(ready)
```
**options** is the same object you pass to the `authorize` method.

Example:
```js
FHIR.oauth2.init({
    client_id: "my_web_app",
    scope    : "patient/*.read"
}).then(client => /* initialize my app */);
```
**Be careful with `init()`!** There are some details you need to be aware of:
1. It will only work if your `launch_uri` is the same as your `redirect_uri`.
   While this should be valid, we can't promise that every EHR will allow you
   to register client with such settings.
2. Internally, init() will be called twice. First it will redirect to the EHR,
   then the EHR will redirect back to the page where `init()` will be called
   again to complete the authorization. This is generally fine, because the
   returned promise will only be resolved once, after the second execution,
   but please also consider the following:
   - You should wrap all your app's code in a function that is only executed
     after init() resolves!
   - Since the page will be loaded twice, you must be careful if your code has
     global side effects that can persist between page reloads (for example
     writing to localStorage).
3. For standalone launch, only use `init` in combination with `offline_access` scope.
   Once the access_token expires, if you don't have a refresh_token there is no way
   to re-authorize properly. We detect that and delete the expired access token,
   but it still means that the user will have to refresh the page twice to
   re-authorize.
   
