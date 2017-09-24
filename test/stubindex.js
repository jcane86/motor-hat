'use strict';

const proxyquire = require('proxyquire');
const pwm = require('./stubpwm.js');
const i2c = require('./stubi2c.js');

const motorHat = proxyquire('../lib/index.js', { './pwm.js': pwm, 'i2c-bus': i2c });

module.exports = motorHat;
