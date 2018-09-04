'use strict';

var gm, env, dims, map;

gm   = require('gm');
env  = require('../config/environment_vars');
dims = require('../lib/dimensions');
map  = require('map-stream');

function resize (r, image, size, callback) {
  // handle the stream response for any of the resizing actions

  // auto orient the image, so it is always the correct way up
  if (env.AUTO_ORIENT){
    r.autoOrient();
  }

  // remove any image metadata
  if (env.REMOVE_METADATA){
    r.noProfile();
  }

  var d, wd, ht;

  var streamResponse = function (err, stdout, stderr) {
    // err is always null from r.stream() calls
    if (err) {
      image.error = new Error('resize error: ' + err);
    } else {
      image.log.time('gm resize');
      stdout.once('data', function () {
        image.log.timeEnd('gm resize');
      });
      image.contents = stdout;
    }

    if (stderr) {
      var _stderr = '';
      stderr.on('data', function (chunk) {
        _stderr += chunk.toString('utf8');
      });
      stderr.once('end', function () {
        if (_stderr) {
          image.error = new Error('resize stderror: ' + _stderr.trim());
        }
      });
      stderr.read();
    }

    callback(null, image);
  };

  switch (image.modifiers.action) {
  case 'resize':
    r.resize(image.modifiers.width, image.modifiers.height);
    r.stream(streamResponse);
    break;

  case 'square':
    d = dims.cropFill(image.modifiers, size);

    // resize then crop the image
    r.resize(
      d.resize.width,
      d.resize.height
    ).crop(
      d.crop.width,
      d.crop.height,
      d.crop.x,
      d.crop.y
    );

    // send the stream to the completion handler
    r.stream(streamResponse);
    break;

  case 'crop':
    switch (image.modifiers.crop) {
    case 'fit':
      r.resize(image.modifiers.width, image.modifiers.height);
      break;
    case 'fill':
      d = dims.cropFill(image.modifiers, size);

      // TODO: need to account for null height or width

      r.resize(
        d.resize.width,
        d.resize.height
      ).crop(
        d.crop.width,
        d.crop.height,
        d.crop.x,
        d.crop.y
      );
      break;
    case 'cut':
      wd = image.modifiers.width || image.modifiers.height;
      ht = image.modifiers.height || image.modifiers.width;

      d = dims.gravity(
        image.modifiers.gravity,
        size.width,
        size.height,
        wd,
        ht
      );
      r.crop(wd, ht, d.x, d.y);
      break;
    case 'scale':
      r.resize(image.modifiers.width, image.modifiers.height, '!');
      break;
    }

    r.stream(streamResponse);
    break;


  case 'original' :
    r.stream(streamResponse);
    break;

  }
}

function dimensions (r, image, next) {
  if (image.dimensions) {
    next(null, image.dimensions);
  } else {
    image.log.time('gm dimensions');
    r.size(function (err, size) {
      image.log.timeEnd('gm dimensions');
      next(null, size);
    });
  }
}

module.exports = function(){

  return map(function (image, callback) {
    // do nothing if there is an error on the image object
    if (image.isError() || image.isFinished()) {
      return callback(null, image);
    }

    // let this pass through if we are requesting the metadata as JSON
    if (image.modifiers.action === 'json') {
      image.log.log('resize: json metadata call');
      return callback(null, image);
    }

    if (env.RESIZE_PROCESS_ORIGINAL === false) {
      image.log.log('resize: original no resize');
      return callback(null, image);
    }

    // create the gm stream
    var r = gm(image.contents, image.format);
    // We aren't resizing gifs at the moment, but limit frames
    // in case we end up doing so.
    r.sourceFrames = '[0]';

    // Need larger resource limits than infodriver for resizing
    ['Disk', 'Memory', 'Map'].forEach(function (limit) {
      r.limit(limit, '200M');
    });
    // Use same pixel limit as irccloud_file_upload.erl
    r.limit('Pixels', '25M');
    dimensions(r, image, function (err, size) {
      if (err) {
          image.error = new Error('dimensions error: ' + err);
          callback(null, image);
      } else {
          if (size) {
            image.log.log('dimensions', size.width, size.height);
            // ?MAX_RES from irccloud_file_upload.erl
            // We set Pixels 25M earlier but this allows us to send an
            // appropriate error response
            if (size.width * size.height > 25000000) {
              image.error = new Error('image too large');
              image.error.statusCode = 410;
              callback(null, image);
            } else {
              resize(r, image, size, callback);
            }
          } else {
            image.error = new Error('invalid image dimensions: ' + data);
            image.error.statusCode = 410;
            callback(null, image);
          }
      }
    });
  });

};
