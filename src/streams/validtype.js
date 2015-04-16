'use strict';

var map = require('map-stream');
var _   = require('lodash');

var validFormats = ['jpeg', 'jpg', 'gif', 'png'];
var formatErrorText = 'not valid image format';

module.exports = function(){

  return map( function(image, callback){
    if ( image.isError() || image.isFinished() ){
      return callback(null, image);
    }

    if (_.indexOf(validFormats, image.format) === -1){
      image.error = new Error(formatErrorText);
    }

    callback(null, image);
  });

};
