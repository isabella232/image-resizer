'use strict';

var map = require('map-stream');
var _   = require('lodash');
var child_process = require('child_process');

var validFormats = ['jpeg', 'jpg', 'png', 'webp'];
var formatErrorText = 'not valid image format';

function webpmux (args, options) {
  return child_process.spawnSync('webpmux', args, options);
}

function stripMetadata (image, type) {
  var w = webpmux(['-strip', type, '-o', '-', '--', '-'], {
    input: image.contents
  });
  if (w.status == 0) {
    image.contents = w.stdout;
  }
}

function processWebp (image, callback) {
  var isAnimated = false;
  var hasEXIF = false;
  var hasXMP = false;

  var w = webpmux(['-info', '-'], {
    input: image.contents
  });
  if (w.status == 0) {
    var data = w.stdout.toString('utf8');
    hasEXIF = !!data.match(/^Size of the EXIF metadata/m);
    hasXMP = !!data.match(/^Size of the XMP metadata/m);
    var frameMatch = data.match(/^Number of frames: (\d+)$/m);
    if (frameMatch) {
      var frames = frameMatch[1] - 0;
      isAnimated = frames > 1;
      image.log.log('skipping animated webp (frames: ' + frames + ')');
    }

    if (hasEXIF) {
      stripMetadata(image, 'exif');
    }
    if (hasXMP) {
      stripMetadata(image, 'xmp');
    }
    if (isAnimated) {
      // Animated webps can't be resized, mark as finished
      image.finished = true;
    }
  }
  callback(null, image);
}

module.exports = function(request, response) {
  return map(function(image, callback){
    if ( image.isError() || image.isFinished() ){
      return callback(null, image);
    }

    if (_.indexOf(validFormats, image.format) === -1) {
      // Don't attempt to resize images we can't handle, just return the file data
      image.finished = true;
      callback(null, image);
    } else if (image.format == 'webp') {
      processWebp(image, callback);
    } else {
      callback(null, image);
    }
  });

};
