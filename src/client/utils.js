var utils = module.exports =  {};

utils.byCodes = function(observations, property){

  var bank = utils.byCode(observations, property);
  function byCodes(){
    var ret = [];
    for (var i=0; i<arguments.length;i++){
      var set = bank[arguments[i]];
      if (set) {[].push.apply(ret, set);}
    }
    return ret;
  }

  return byCodes;
};

utils.byCode = function(observations, property){
  var ret = {};
  if (!Array.isArray(observations)){
    observations = [observations];
  }
  observations.forEach(function(o){
    if (o.resourceType === "Observation") {
        o[property].coding.forEach(function(coding){
          ret[coding.code] = ret[coding.code] || [];
          ret[coding.code].push(o);
        });
    }
  });
  return ret;
};

function ensureNumerical(pq) {
  if (typeof pq.value !== "number") {
    throw "Found a non-numerical unit: " + pq.value + " " + pq.code;
  }
};

utils.units = {
  cm: function(pq){
    ensureNumerical(pq);
    if(pq.code == "cm") return pq.value;
    if(pq.code == "m") return 100*pq.value;
    if(pq.code == "in") return 2.54*pq.value;
    if(pq.code == "[in_us]") return 2.54*pq.value;
    if(pq.code == "[in_i]") return 2.54*pq.value;
    throw "Unrecognized length unit: " + pq.code
  },
  kg: function(pq){
    ensureNumerical(pq);
    if(pq.code == "kg") return pq.value;
    if(pq.code == "g") return pq.value / 1000;
    if(pq.code.match(/lb/)) return pq.value / 2.20462;
    if(pq.code.match(/oz/)) return pq.value / 35.274;
    throw "Unrecognized weight unit: " + pq.code
  },
  any: function(pq){
    ensureNumerical(pq);
    return pq.value
  }
};


