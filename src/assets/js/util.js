// Self contained functions, meaning they need not any dependencies to work
var util = (function () {
  return {
    out: function (input, outputType) {
    	if (typeof debugDevBuild === 'undefined') {
    		return;
    	}
    	try {
    		if (outputType == "log") {
    			console.log(input);
    		}
    		else if (outputType == "trace") {
    			console.trace(input);
    		}
    		else if (outputType == "info") {
    			console.info(input);
    		}
    		else if (outputType == "error") {
    			console.error(input);
    		}
    	} catch (err) {

    	}
    },

    // Check if input var is empty
    isEmpty: function (obj) {
    	if (obj === null) {return true;}

    	// Assume if it has a length property with a non-zero value
    	// that that property is correct.
    	if (obj.length > 0)    {return false;}
    	if (obj.length === 0)  {return true;}

    	// Otherwise, does it have any properties of its own?
    	// Note that this doesn't handle
    	// toString and valueOf enumeration bugs in IE < 9
    	for (var key in obj) {
    		if (hasOwnProperty.call(obj, key)) {return false;}
    	}
    },

    // Divide an array arr into subarrays of length len
    chunk: function (arr, len) {

      var chunks = [],
          i = 0,
          n = arr.length;

      while (i < n) {
        chunks.push(arr.slice(i, i += len));
      }

      return chunks;
    }

  };
}());
