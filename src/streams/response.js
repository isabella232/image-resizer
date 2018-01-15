'use strict';

var stream = require('stream');
var env    = require('../config/environment_vars');
var util   = require('util');


function ResponseWriter(request, response){
  if (!(this instanceof ResponseWriter)){
    return new ResponseWriter(request, response);
  }

  this.request = request;
  this.response = response;

  stream.Writable.call(this, { objectMode : true });
}

util.inherits(ResponseWriter, stream.Writable);

ResponseWriter.prototype._write = function(image){
  if (image.isError()){
    var statusCode = image.error.statusCode || 500;
    this.response.status(statusCode).send(null);
    image.log.error(image.error.message);
    image.log.flush();
    return this.end();
  }

  if (image.modifiers.action === 'json'){
    this.response.json(200, image.contents);
    image.log.flush();

    return this.end();
  }

  if (this.request.fresh) {
    this.response.status(304).send(null);
  } else if (image.isStream()){
    image.contents.pipe(this.response);
  } else {
    image.log.log(
      'original image size:',
      image.log.colors.grey(
        (image.originalContentLength/1000).toString() + 'kb'
      )
    );
    image.log.log(
      // 'reduction:',
      // image.log.colors.grey((image.sizeReduction()).toString() + 'kb')
      'size saving:',
      image.log.colors.grey(image.sizeSaving() + '%')
    );

    // as a debugging step print a checksum for the modified image, so we can
    // track to see if the image is replicated effectively between requests
    if (env.development){
      var crypto = require('crypto'),
          shasum = crypto.createHash('sha1');
      shasum.update(image.contents);
      image.log.log('checksum', shasum.digest('hex'));
    }

    this.response.status(200).send(image.contents);
  }

  // flush the log messages and close the connection
  image.log.flush();
  this.end();
};


module.exports = ResponseWriter;
