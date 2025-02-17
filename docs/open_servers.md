# Working with open servers

This library is designed to be used with [SMART on FHIR](http://hl7.org/fhir/smart-app-launch/index.html) apps. This means the server is protected using SMART for launch and authentication. In some cases (mostly for testing and development) it is also useful to connect to open servers. There are several major differences between "open" and "protected" FHIR servers:

1. Open servers do not require authentication
2. Open servers do not support SMART, thus they cannot provide you with launch context. There is no current patient, user or encounter. The app is free to choose what to access.
3. In open servers, the app has full access which cannot be restricted with scopes.

## Working with open servers only
If you are working on an app that is ONLY going to connect to an open server, then please ignore the SMART part of the documentation. You don't need to authorize. All you need is to create a client instance like so:
```js
const client = FHIR.client("http://hapi.fhir.org/baseDstu3");
```
Then use the client instance to make requests as usual.

Unlike a SMART launched app, this one has no concept of "current" patient, user or encounter. This means that SMART-specific APIs will not work:
- `client.patient.id` will be `null`
- `client.patient.read()` and `client.patient.request()` will reject with a "Patient is not available" error.

- `client.user.id`, `client.user.fhirUser` and `client.user.resourceType` will be `null`
- `client.user.read()` will reject with a "User is not available" error.

- `client.encounter.id` will be `null`
- `client.encounter.read()` will reject with a "Encounter is not available" error.


## Working with both open and protected servers
Ideally, an app should be capable of working with both protected and open servers. This may not always be possible out of the box. For example, if the app relies on EHR launch and uses context APIs like `client.patient...` or `client.user...`, then the developer assumes that the launch context must be available.

Developers often design their apps as SMART apps, but also want to be able to launch them against open servers for testing purposes. There are several ways to achieve that:

### 1. Using multiple launch files
If the app is designed for EHR launch, the typical approach is to have separate locations for your launch_uri and redirect_uri. For example, you may have a `launch.html` file where you call `FHIR.oauth2.authorize({...});` and an `index.html` file where uou call `FHIR.oauth2.ready();` and initialize your app. To support multiple environments you can have multiple launch files. For example:

*launch_cerner.html*
```html
<!DOCTYPE html>
<html>
 <head>
     <title>Launch From Cerner</title>
     <script src="dist/build/fhir-client.js"></script>
 </head>
 <body>
    <h3>Loading...</h3>
    <script type="text/javascript">
        FHIR.oauth2.authorize({
            redirectUri: "./index.html",
            clientId: "my_cerner_client_id",
            scope: "..."
        });
    </script>
 </body>
</html>
```

*launch_epic.html*
```html
<!DOCTYPE html>
<html>
 <head>
     <title>Launch From Epic</title>
     <script src="dist/build/fhir-client.js"></script>
 </head>
 <body>
    <h3>Loading...</h3>
    <script type="text/javascript">
        FHIR.oauth2.authorize({
            redirectUri: "./index.html",
            clientId: "my_epic_client_id",
            scope: "..."
        });
    </script>
 </body>
</html>
```

*launch_open.html*
```html
<!DOCTYPE html>
<html>
 <head>
     <title>Launch Local</title>
     <script src="dist/build/fhir-client.js"></script>
 </head>
 <body>
    <h3>Loading...</h3>
    <script type="text/javascript">
        FHIR.oauth2.authorize({
            fhirServiceUrl: "http://r4.smarthealthit.org",
            redirectUri: "./index.html",
            patientId: "...", // include if you want to emulate selected patient ID
            encounterId: "...", // include if you want to emulate selected encounter ID
            launch: "whatever",
            fakeTokenResponse: { // include if you want to emulate current user
                id_token: "..."
            }
        });
    </script>
 </body>
</html>
```

Using this setup, you can:
- Register your app at Cerner using a `launch_uri` that points to `launch_cerner.html`
- Register your app at Epic using a `launch_uri` that points to `launch_epic.html`
- Open `launch_open.html` in the browser to test against an open server (http://r4.smarthealthit.org)

### 2. Using multiple launch configurations
Since version `2.3.11` it is possible to pass an array of options to the `authorize` function. The idea is that the same app can be launched by multiple EHRs and the proper configuration will be picked based on the `iss` url parameter that the launch endpoint has received. This provides additional flexibility because it allows us to reuse the same configuration for several ISS URLs. Here is an example:
```js
FHIR.oauth2.authorize([
    {
        // This config will be used if the ISS equals "https://cerner"
        issMatch: "https://cerner",
        redirectUri: "./index.html",
        clientId: "my_cerner_client_id",
        scope: "..."
    },
    {
        // This config will be used if the ISS contains the word "epic"
        issMatch: /\bepic\b/i,
        redirectUri: "./index.html",
        clientId: process.env.EPIC_CLIENT_ID,
        scope: "..."
    },
    {
        // This config will be used if the ISS is local
        issMatch: iss => iss.startsWith("http://localhost") || iss.startsWith("http://127.0.0.1"),
        redirectUri: "./index.html",
        clientId: "my_local_client_id",
        scope: "...",
        patientId: "123", // include if you want to emulate selected patient ID
        encounterId: "234", // include if you want to emulate selected encounter ID
        launch: "whatever",
        fakeTokenResponse: { // include if you want to emulate current user
            // We are only parsing the JWT body so tokens can be faked like so
            id_token: `fakeToken.${btoa('{"profile":"Practitioner/345"}')}.`
        }
    }
]);
```
A few notes about using multiple configurations:
1. The `issMatch` option is required if multiple configurations are used
2. As shown in the example, `issMatch` can be a string, RegExp or a function
3. At least one configuration should match (otherwise you will get an error)
4. If there are multiple matches the first one is used
5. This is very convenient in development but if the app is deployed to real EHR, you should
   consider switching back to single dedicated configuration (the same would also apply to the 
   multiple launch files example above).
6. Depending on how your environment is set up, injecting environment variables might also be 
   an option. Many people prefer using `.env` files to store configuration data. However, that would imply that you have control over the environment and this is not usually true when the app is deployed in an EHR.

## Bypassing Authentication
In addition to providing custom context variables (like `patientId` or `encounterId`), it is possible to completely bypass the authentication. This is where things might get complicated but it is useful for testing. This "mode" is activated by setting the `fhirServiceUrl` option:
```js
FHIR.oauth2.authorize({
    redirectUri: "./index.html",
    fhirServiceUrl: "https://r4.smarthealthit.org",
    fakeTokenResponse: {
        access_token: "generate access token somehow"
    }
})
```
In this case the auth flow will be skipped and `authorize` will redirect immediately to `./index.html`. Then you call `FHIR.oauth2.ready` as usual, get a `Client` and use it to make HTTP requests. If `fhirServiceUrl` is a protected FHIR server:
- If you provide arbitrary `fakeTokenResponse.access_token`, then requests should fail because they will end up having incorrect `Authorization` header
- If you do not provide `fakeTokenResponse.access_token`, then requests should fail because they will not have `Authorization` header
- If `fhirServiceUrl` is an open server, it should work regardless

The `fhirServiceUrl` can also be passed as URL parameter. An `iss` option or URL parameter will take precedence over `fhirServiceUrl`. This means that you can use the `fhirServiceUrl` option to specify which server you want to connect to if your launch endpoint is visited directly (with no `iss` parameter). If the same is called by an EHR or other launcher, it will have an `iss` parameter and your default server (from fhirServiceUrl) will be ignored. 
