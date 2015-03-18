'use strict';

var _ = require('lodash');

exports.sanitize = function(value, type) {
  if (typeof type === 'undefined') {
    type = 'number';
  }
  switch (type) {
  case 'number':
    return value.toString().replace(/[^0-9]/, '') * 1;
  case 'alpha':
    return value.replace(/[0-9]/, '');
  default:
    return value.replace(/[^0-9]/, '');
  }
};


exports.camelCase = function(input){
  return input.toLowerCase()
    .replace(/_(.)/g, function(match, letter){
      return letter.toUpperCase();
    });
};


// From https://github.com/TheNodeILs/lodash-contrib/blob/19f6386e/_.util.strings.js
var plusRegex = /\+/g;
var bracketRegex = /(?:([^\[]+))|(?:\[(.*?)\])/g;

var urlDecode = function (s) {
  return decodeURIComponent(s.replace(plusRegex, '%20'));
};
