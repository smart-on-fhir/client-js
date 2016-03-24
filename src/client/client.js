var btoa = require('btoa');
var Adapter = require('./adapter');

module.exports = FhirClient;

function ClientPrototype(){};
var clientUtils = require('./utils');
Object.keys(clientUtils).forEach(function(k){
  ClientPrototype.prototype[k] = clientUtils[k];
});

function FhirClient(p) {
  // p.serviceUrl
  // p.auth {
    //    type: 'none' | 'basic' | 'bearer'
    //    basic --> username, password
    //    bearer --> token
    // }

    var client = new ClientPrototype();
    var fhir = Adapter.get().fhirjs;

    var server = client.server = {
      serviceUrl: p.serviceUrl,
      auth: p.auth || {type: 'none'}
    }
    
    var auth = {};
    
    if (server.auth.type === 'basic') {
        auth = {
            user: server.auth.username,
            pass: server.auth.password
        };
    } else if (server.auth.type === 'bearer') {
        auth = {
            bearer: server.auth.token
        };
    }
    
    client.api = fhir({
        baseUrl: server.serviceUrl,
        auth: auth
    });
    
    if (p.patientId) {
        client.patient = {};
        client.patient.id = p.patientId;
        client.patient.api = fhir({
            baseUrl: server.serviceUrl,
            auth: auth,
            patient: p.patientId
        });
        client.patient.read = function(){
            return client.get({resource: 'Patient'});
        };
    }
    
    var fhirAPI = (client.patient)?client.patient.api:client.api;

    client.userId = p.userId;

    server.auth = server.auth ||  {
      type: 'none'
    };

    if (!client.server.serviceUrl || !client.server.serviceUrl.match(/https?:\/\/.+[^\/]$/)) {
      throw "Must supply a `server` property whose `serviceUrl` begins with http(s) " + 
        "and does NOT include a trailing slash. E.g. `https://fhir.aws.af.cm/fhir`";
    }
    
    client.authenticated = function(p) {
      if (server.auth.type === 'none') {
        return p;
      }

      var h;
      if (server.auth.type === 'basic') {
        h = "Basic " + btoa(server.auth.username + ":" + server.auth.password);
      } else if (server.auth.type === 'bearer') {
        h = "Bearer " + server.auth.token;
      }
      if (!p.headers) {p.headers = {};}
      p.headers['Authorization'] = h
      //p.beforeSend = function (xhr) { xhr.setRequestHeader ("Authorization", h); }

      return p;
    };

    client.get = function(p) {
        var ret = Adapter.get().defer();
        var params = {type: p.resource};
        
        if (p.id) {
            params["id"] = p.id;
        }
          
        fhirAPI.read(params)
            .then(function(res){
                ret.resolve(res.data);
            }, function(){
                ret.reject("Could not fetch " + p.resource + " " + p.id);
            });
          
        return ret.promise;
    };

    client.user = {
      'read': function(){
        var userId = client.userId;
        resource = userId.split("/")[0];
        uid = userId.split("/")[1];
        return client.get({resource: resource, id: uid});
      }
    };

    function absolute(path, server) {
      if (path.match(/^http/)) return path;
      if (path.match(/^urn/)) return path;

      // strip leading slash
      if (path.charAt(0) == "/") path = path.substr(1);

      return server.serviceUrl + '/' + path;
    }

    client.getBinary = function(url) {

      var ret = Adapter.get().defer();

      Adapter.get().http(client.authenticated({
        type: 'GET',
        url: url,
        dataType: 'blob'
      }))
      .done(function(blob){
        ret.resolve(blob);
      })
      .fail(function(){
        ret.reject("Could not fetch " + url, arguments);
      });
      return ret.promise;
    };

    client.fetchBinary = function(path) {
        var url = absolute(path, server);
        return client.getBinary(url);
    };

    return client;
}
