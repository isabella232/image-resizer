'use strict';

var chai = require('chai'),
    expect = chai.expect,
    Img = require('../../src/image');

chai.should();


describe('Image class', function(){

  describe('local formats', function(){
    it('should recognise a local source', function(){
      var localPath = '/elocal/path/to/image.png',
          img = new Img({path: localPath});
      img.modifiers.external.should.equal('local');
    });
  });

  it('should respond in an error state', function(){
    var img = new Img({path: '/path/to/image.jpg'});
    img.error = new Error('sample error');
    img.isError().should.be.true;
  });

});
