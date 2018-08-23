var utils = module.exports =  {};

// https://github.com/jquery/jquery/issues/3444
utils.extend = function() {
  var source, name, sourceProperty, targetProperty, clonedTargetProperty,
    target = arguments[ 0 ],
    i = 1,
    length = arguments.length,
    deep = false

  // Handle a deep copy situation
  if ( typeof target == "boolean" ) {
    deep = target

    // Skip the boolean and the target
    target = arguments[ i ]
    i++
  }

  // Extend jQuery itself if only one argument is passed
  if ( i == length ) {
    target = this
    i--
  }

  // Loop through n objects
  for ( ; i < length; i++ ) {
    source = arguments[ i ]

    // Only deal with non-null/undefined values
    // NOTE: How was the previous source != null getting away with loose comparison?
    // In any event, it is obfuscating to do loose comparison to null
    if ( source !== null && source !== undefined ) {

      // Extend the base object
      for ( name in source ) {
        targetProperty = target[ name ]
        sourceProperty = source[ name ]

        // Prevent infinite loop
        if ( target !== sourceProperty ) {
          if ( deep && sourceProperty ) {
            clonedTargetProperty = null

            if ( Array.isArray( sourceProperty ) ) {
              clonedTargetProperty = targetProperty &&
                Array.isArray( targetProperty )
                ? targetProperty : []
            } else if ( isPlainObject( sourceProperty ) ) {
              clonedTargetProperty = targetProperty &&
                isPlainObject( targetProperty )
                ? targetProperty : {}
            }

            target[ name ] = clonedTargetProperty
              ? extend( true, clonedTargetProperty, sourceProperty )
              : sourceProperty

          // Don't bring in undefined values
          } else if ( sourceProperty !== undefined ) {
            target[ name ] = sourceProperty
          }
        }
      }
    }
  }

  // Return the modified object
  return target
}

function getProto() { return Object.getPrototypeOf }

function isPlainObject (obj) {
  var proto

    if ( toString.call( obj ) == "[object Object]" ) {
      proto = getProto( obj )

      // Objects foolish enough to have prototypes with their own - hasOwnProperty - method are not supported
      return !proto || !proto.hasOwnProperty || proto.hasOwnProperty( "hasOwnProperty" )
    }

    return false
}

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
    if (o.resourceType === "Observation"){
      if (o[property] && Array.isArray(o[property].coding)) {
        o[property].coding.forEach(function (coding){
          ret[coding.code] = ret[coding.code] || [];
          ret[coding.code].push(o);
        });
      }
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
    if(pq.code == "ft") return 30.48*pq.value;
    if(pq.code == "[ft_us]") return 30.48*pq.value;
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


