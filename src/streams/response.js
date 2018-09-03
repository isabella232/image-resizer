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

  if (image.modifiers.action === 'json') {
    this.response.json(200, image.contents);
    image.log.flush();

    return this.end();
  }


  this.response.type(image.format);

  if (this.request.fresh) {
    this.response.status(304).send(null);
    image.log.flush();
    return this.end();
  } else if (image.isStream()){
    var resp = this.response;
    image.contents.once('end', () => {
      if (image.isError()){
        var statusCode = image.error.statusCode || 500;
        this.response.status(statusCode).send(null);
        image.log.error(image.error.message);
      }
      image.log.flush();
      this.end();
    });
    return image.contents.pipe(this.response);
  } else {
    this.response.status(200).send(image.contents);

    image.log.flush();
    return this.end();
  }
};


module.exports = ResponseWriter;
