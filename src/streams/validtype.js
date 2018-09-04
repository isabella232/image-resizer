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
  image.log.log('stripping ' + type);
  var w = webpmux(['-strip', type, '-o', '-', '--', '-'], {
    input: image.contents
  });
  if (w.status == 0) {
    image.contents = w.stdout;
  }
}

function processWebp (image, callback) {
  image.log.time('webpmux');
  var w = webpmux(['-info', '-'], {
    input: image.contents
  });
  if (w.status == 0) {
    var data = w.stdout.toString('utf8');

    if (data.match(/^Size of the EXIF metadata/m)) {
      stripMetadata(image, 'exif');
    }
    if (data.match(/^Size of the XMP metadata/m)) {
      stripMetadata(image, 'xmp');
    }

    var canvasMatch = data.match(/^Canvas size: (\d+) x (\d+)$/m);
    if (canvasMatch) {
      var dimensions = {
        width: canvasMatch[1] - 0,
        height: canvasMatch[2] - 0
      };
      image.dimensions = dimensions;
    }

    var frameMatch = data.match(/^Number of frames: (\d+)$/m);
    if (frameMatch) {
      var frames = frameMatch[1] - 0;
      if (frames > 1) {
        // Animated webps can't be resized, mark as finished
        image.log.log('skipping resize for animated webp (frames: ' + frames + ')');
        if (image.dimensions) {
          image.log.log('dimensions', image.dimensions.width, image.dimensions.height);
        }
        image.finished = true;
      }
    }
  }
  image.log.timeEnd('webpmux');
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
