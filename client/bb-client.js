var jQuery = require('./jquery');
var $ = jQuery;
var FhirClient = require('./client');
var Guid = require('./guid');
var jwt = require('jsonwebtoken');

var BBClient = module.exports =  {debug: true}

function urlParam(p, forceArray) {
  if (forceArray === undefined) {
    forceArray = false;
  }

  var query = location.search.substr(1);
  var data = query.split("&");
  var result = [];

  for(var i=0; i<data.length; i++) {
    var item = data[i].split("=");
    if (item[0] === p) {
      result.push(decodeURIComponent(item[1]));
    }
  }

  if (forceArray) {
    return result;
  }
  if (result.length === 0){
    return null;
  }
  return result[0];
}

function getPreviousToken(){
  var ret = sessionStorage.tokenResponse;
  if (ret) ret = JSON.parse(ret);
  return ret;
}

function completeTokenFlow(hash){
  if (!hash){
    hash = window.location.hash;
  }
  var ret =  $.Deferred();

  process.nextTick(function(){
    var oauthResult = hash.match(/#(.*)/);
    oauthResult = oauthResult ? oauthResult[1] : "";
    oauthResult = oauthResult.split(/&/);
    var authorization = {};
    for (var i = 0; i < oauthResult.length; i++){
      var kv = oauthResult[i].split(/=/);
      if (kv[0].length > 0 && kv[1]) {
        authorization[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
      }
    }
    ret.resolve(authorization);
  });

  return ret.promise();
}

function completeCodeFlow(params){
  if (!params){
    params = {
      code: urlParam('code'),
      state: urlParam('state')
    };
  }
  
  var ret =  $.Deferred();
  var state = JSON.parse(sessionStorage[params.state]);

  if (window.history.replaceState && BBClient.settings.replaceBrowserHistory){
    window.history.replaceState({}, "", window.location.toString().replace(window.location.search, ""));
  }

  $.ajax({

    url: state.provider.oauth2.token_uri,
    type: 'POST',
    data: {
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: state.client.redirect_uri,
      client_id: state.client.client_id
    },
  }).done(function(authz){
    authz = $.extend(authz, params);
    ret.resolve(authz);
  }).fail(function(){
    console.log("failed to exchange code for access_token", arguments);
    ret.reject();
  });;

  return ret.promise();
}

function completePageReload(){
  var d = $.Deferred();
  process.nextTick(function(){
    d.resolve(getPreviousToken());
  });
  return d;
}

function readyArgs(){

  var input = null;
  var callback = function(){};
  var errback = function(){};

  if (arguments.length === 0){
    throw "Can't call 'ready' without arguments";
  } else if (arguments.length === 1){
    callback = arguments[0];
  } else if (arguments.length === 2){
    if (typeof arguments[0] === 'function'){
      callback = arguments[0];
      errback = arguments[1];
    } else if (typeof arguments[0] === 'object'){
      input = arguments[0];
      callback = arguments[1];
    } else {
      throw "ready called with invalid arguments";
    }
  } else if (arguments.length === 3){
    input = arguments[0];
    callback = arguments[1];
    errback = arguments[2];
  } else {
    throw "ready called with invalid arguments";
  }

  return {
    input: input,
    callback: callback,
    errback: errback
  };
}

// Client settings
BBClient.settings = {
    replaceBrowserHistory: true
};

BBClient.ready = function(input, callback, errback){

  var args = readyArgs.apply(this, arguments);

  // decide between token flow (implicit grant) and code flow (authorization code grant)
  var isCode = urlParam('code') || (args.input && args.input.code);

  var accessTokenResolver = null;
  if (sessionStorage.tokenResponse) { // we're reloading after successful completion
    accessTokenResolver = completePageReload();
  } else if (isCode) { // code flow
    accessTokenResolver = completeCodeFlow(args.input);
  } else { // token flow
    accessTokenResolver = completeTokenFlow(args.input);
  }
  accessTokenResolver.done(function(tokenResponse){

    if (!tokenResponse || !tokenResponse.state) {
      return args.errback("No 'state' parameter found in authorization response.");
    }
    
    sessionStorage.tokenResponse = JSON.stringify(tokenResponse);

    var state = JSON.parse(sessionStorage[tokenResponse.state]);
    if (state.fake_token_response) {
      tokenResponse = state.fake_token_response;
    }

    var fhirClientParams = {
      serviceUrl: state.provider.url,
      patientId: tokenResponse.patient
    };
    
    if (tokenResponse.id_token) {
        var id_token = tokenResponse.id_token;
        var payload = jwt.decode(id_token);
        fhirClientParams["userId"] = payload["profile"]; 
    }

    if (tokenResponse.access_token !== undefined) {
      fhirClientParams.auth = {
        type: 'bearer',
        token: tokenResponse.access_token
      };
    } else if (!state.fake_token_response){
      return args.errback("Failed to obtain access token.");
    }

    var ret = FhirClient(fhirClientParams);
    ret.state = JSON.parse(JSON.stringify(state));
    ret.tokenResponse = JSON.parse(JSON.stringify(tokenResponse));
    args.callback(ret);

  }).fail(function(){
    args.errback("Failed to obtain access token.");
  });

};

function providers(fhirServiceUrl, callback, errback){

  // Shim for pre-OAuth2 launch parameters
  if (isBypassOAuth()){
    process.nextTick(function(){
      bypassOAuth(fhirServiceUrl, callback);
    });
    return;
  }


  jQuery.get(
    fhirServiceUrl+"/metadata",
    function(r){
      var res = {
        "name": "SMART on FHIR Testing Server",
        "description": "Dev server for SMART on FHIR",
        "url": fhirServiceUrl,
        "oauth2": {
          "registration_uri": null,
          "authorize_uri": null,
          "token_uri": null
        }
      };

      try {
        jQuery.each(r.rest[0].security.extension, function(responseNum, arg){
          if (arg.url === "http://fhir-registry.smarthealthit.org/Profile/oauth-uris#register") {
            res.oauth2.registration_uri = arg.valueUri;
          } else if (arg.url === "http://fhir-registry.smarthealthit.org/Profile/oauth-uris#authorize") {
            res.oauth2.authorize_uri = arg.valueUri;
          } else if (arg.url === "http://fhir-registry.smarthealthit.org/Profile/oauth-uris#token") {
            res.oauth2.token_uri = arg.valueUri;
          }
        });
      }
      catch (err) {
        return errback && errback(err);
      }

      callback && callback(res);
    },
    "json"
  ).fail(function() {
    errback && errback("Unable to fetch conformance statement");
  });
};

var noAuthFhirProvider = function(serviceUrl){
  return {
    "oauth2": null,
    "url": serviceUrl
  }
};

function relative(url){
  return (window.location.protocol + "//" + window.location.host + window.location.pathname).match(/(.*\/)[^\/]*/)[1] + url;
}

function isBypassOAuth(){
  return (urlParam("fhirServiceUrl") && !(urlParam("iss")));
}

function bypassOAuth(fhirServiceUrl, callback){
  callback && callback({
    "oauth2": null,
    "url": fhirServiceUrl || urlParam("fhirServiceUrl")
  });
}

BBClient.authorize = function(params, errback){

  if (!errback){
    errback = function(){
        console.log("Failed to discover authorization URL given", params);
    };
  }
  
  // prevent inheritance of tokenResponse from parent window
  delete sessionStorage.tokenResponse;

  if (!params.client){
    params = {
      client: params
    };
  }

  if (!params.response_type){
    params.response_type = 'code';
  }

   if (!params.client.redirect_uri){
    params.client.redirect_uri = relative("");
  }

  if (!params.client.redirect_uri.match(/:\/\//)){
    params.client.redirect_uri = relative(params.client.redirect_uri);
  }

  var launch = urlParam("launch");
  if (launch){
    if (!params.client.scope.match(/launch/)){
      params.client.scope += " launch";
    }
    params.client.launch = launch;
  }

  var server = urlParam("iss") || urlParam("fhirServiceUrl");
  if (server){
    if (!params.server){
      params.server = server;
    }
  }

  if (urlParam("patientId")){
    params.fake_token_response = params.fake_token_response || {};
    params.fake_token_response.patient = urlParam("patientId");
  }

  providers(params.server, function(provider){

    params.provider = provider;

    var state = params.client.state || Guid.newGuid();
    var client = params.client;

    if (params.provider.oauth2 == null) {
      sessionStorage[state] = JSON.stringify(params);
      window.location.href = client.redirect_uri + "#state="+encodeURIComponent(state);
      return;
    }

    sessionStorage[state] = JSON.stringify(params);

    console.log("sending client reg", params.client);

    var redirect_to=params.provider.oauth2.authorize_uri + "?" + 
      "client_id="+encodeURIComponent(client.client_id)+"&"+
      "response_type="+encodeURIComponent(params.response_type)+"&"+
      "scope="+encodeURIComponent(client.scope)+"&"+
      "redirect_uri="+encodeURIComponent(client.redirect_uri)+"&"+
      "state="+encodeURIComponent(state)+"&"+
      "aud="+encodeURIComponent(server)+"&"+
      "launch="+encodeURIComponent(client.launch);

    window.location.href = redirect_to;
  }, errback);
};

BBClient.resolveAuthType = function (fhirServiceUrl, callback, errback) {

      jQuery.get(
        fhirServiceUrl+"/metadata",
        function(r){
          var type = "none";
          
          try {
            if (r.rest[0].security.service[0].coding[0].code.toLowerCase() === "oauth2") {
                type = "oauth2";
            }
          }
          catch (err) {
          }

          callback && callback(type);
        },
        "json"
      ).fail(function() {
        errback && errback("Unable to fetch conformance statement");
      });
};
