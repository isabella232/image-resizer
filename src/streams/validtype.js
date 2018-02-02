'use strict';

var map = require('map-stream');
var _   = require('lodash');

var validFormats = ['jpeg', 'jpg', 'gif', 'png'];
var formatErrorText = 'not valid image format';

module.exports = function(request, response) {

  return map(function(image, callback){
    if ( image.isError() || image.isFinished() ){
      return callback(null, image);
    }

    // Don't attempt to resize images we can't handle, just return the file data
    if (_.indexOf(validFormats, image.format) === -1) {
        image.finished = true;
    }


    callback(null, image);
  });

};
