# Working with multiple windows

The typical SMART app is relatively simple. It is opened in a browser window, it
goes through the authorization flow there and then it fetches some data from the
FHIR server and des something with it.

The front-end apps are getting more complicated nowadays. Sometimes, an app might
be doing many things, only fraction of which require connection to the EHR. Consider
a mail client as an example. It needs to be able to sync with the mail server, but
it would also be able to work offline (to some extent), because the messages are
already in it's local database. Similar scenario might be applied to a SMART app.

You may have a backend to store specific information for patients that your app
has computed based on the FHIR data. Your app should be able to connect to that
back-end by default, at any time, even if it does not have FHIR access at that time.
In other words, it should be possible to postpone the SMART authorization process 
(which is typically executed when the app is launched). In addition to that, it
can be useful to be able to execute the authorization flow in different window,
tab, frame, popup etc.

##  Authorization on-demand
First, lets see how the authorization can be delayed until the the user actually
needs it.

### Standalone Launch
This is already easy to do for standalone launched apps. They have a `launch` entry
point that contains all the information to perform the launch. This means that
you can build an app that does whatever it does, and somewhere in the UI you can
have a button or link to your SMART entry point. Whenever the user clicks that
link, the app would authorize as usual.

Another option is to not even have a launch endpoint and just call the `authorize`
function whenever you need it:
```js
FHIR.oauth2.authorize({
    clientId: "my_web_app",
    scope: "launch openid fhirUser patient/*.read",
    redirectUri: "index.html",
    iss: "http://my.fixed.iss"
});
```

### EHR Launch
This is a little trickier. The important concept here is that you DO NOT open
your app yourself. The EHR does that for you and passes some parameters to it.
With that said, the only way to postpone the authorization would be to get those
launch parameters and remember them for later. Here is an example:

```js
// in launch.html

// instead of authorizing directly, just remember the launch parameters
var searchParams = new URL(location.href).searchParams;
var launchParams = {
    launch: searchParams.get("launch"),
    iss   : searchParams.get("iss")
};
// Persist launchParams somewhere if needed
```

Later, when the user wants to login:
```js
FHIR.oauth2.authorize({
    clientId: "my_web_app",
    scope: "launch openid fhirUser patient/*.read",
    redirectUri: "index.html",

    // pass the remembered values here
    iss   : launchParams.iss,
    launch: launchParams.launch
});
```

##  Authorization in different window (since v2.3.0)
[Live Examples](https://fmv99.csb.app/)


Now that we are able to authorize on demand, we might also want to do that in a
popup window (or any other valid window target). Here are some examples:

This will open the authorization screens in a centered popup window. If the
authorization is successful, the popup will eventually close itself and your
main window will load your `redirectUri`.
```js
FHIR.oauth2.authorize({
    target: "popup",
    // ...
});
```

Same as above, but with specific dimensions for the popup window:
```js
FHIR.oauth2.authorize({
    target: "popup",
    width: 1000,
    height: 600
    // ...
});
```

In this case (`completeInTarget: true`), the popup will remain open and the app
will render inside it.
```js
FHIR.oauth2.authorize({
    target: "popup",
    completeInTarget: true
    // ...
});
```

#### Using custom popup
This is not a real popup window but an `iframe` within HTML
elements so that it looks nicer and is not affected by popup blockers. These often have some kind of open/close animations and that means they are not always ready
to use immediately. That is why we use a function that returns a promise:
```js
// <div id="layer-popup">
//   <header>My PopUp</header>
//   <iframe name="myPopupFrame" id="myPopupFrame" src=""></iframe>
// </div>
function openPopup() {
    return new Promise(resolve => {
        // Start opening
        document.getElementById("layer-popup").classList.add("open");

        // It is a good idea to reset the iframe, in case it has been opened before
        document.getElementById("myPopupFrame").src = "about:blank";

        // Once our CSS transitions are done, resolve with the name of our frame
        setTimeout(() => resolve("myPopupFrame"), 1000);
    });
}

FHIR.oauth2.authorize({
    target: openPopup,
    // ...
});
```

There are many other possible ways to authorize in a different window. Just consider the possible values for the `target` option listed below and then also combine those with `completeInTarget: true` to get an idea of what may be achievable.

#### Possible `target` values:
- `"popup"` - Opens a popup window and runs the authorization inside it.
- `"_blank"` - Acts like "popup" but opens new tab instead. Might also open a new
  window, depending on the browser settings.
- `"_self"` - Acts in the current window. This is the same as not specifying any target.
- `"_parent"` - Acts in the parent window. This can be used when `authorize` is called
  from within a frame.
- `"_top"` - Acts in the top-most window. This can be used when `authorize` is called
  from within a frame.
- `string` - Frame name. Finds the frame by that name in `window.frames` and runs the
  authorization inside it.
- `number` - Frame index. Finds the frame by that index in `window.frames` and runs the
  authorization inside it,
- `object` - Reference to a Window object (including a window in frame if you can obtain a reference to it)
- `function` - A function that returns any of the above values or a promise that will
  be resolved with such value.

> **NOTE**: You must use target windows having the same `origin`. If a `target` cannot be resolved to a window or if there are security issues (or for example popups are blocked), the authorization will fail back to using the current window.
