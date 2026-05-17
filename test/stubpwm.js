'use strict';

const proxyquire = require('proxyquire');

let i2c = 0;
const obj = {
  'raspi-ver': {
    get i2c() {
      return i2c;
    },
    '@noCallThru': true,
  },
  '@noCallThru': true,
};
const pwm = proxyquire('../lib/pwm.js', obj);
pwm.seti2c = function seti2c(val) {
  i2c = val;
};
module.exports = pwm;
