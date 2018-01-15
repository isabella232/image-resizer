'use strict';

var env = require('../config/environment_vars');
var map = require('map-stream');

function shouldCacheResponse () {
  if (env.development){
    if (env.CACHE_DEV_REQUESTS){
      return true;
    } else {
      return false;
    }
  }
  return true;
}

module.exports = function(request, response) {

  return map( function(image, callback){
    if (image.isError()) {
      return callback(null, image);
    }

    if (shouldCacheResponse()){
      var maxAge = (image.modifiers.action === 'json') ? env.JSON_EXPIRY : image.expiryLength;
      response.set({
        'Cache-Control':  'max-age=' + maxAge
      });
    }

    if (image.lastModified) {
      response.set({
        'Last-Modified': image.lastModified
      });
    }

    if (request.fresh) {
      image.finished = true;
    }

    callback(null, image);
  });

};
