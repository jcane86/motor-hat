let proxyquire = require('proxyquire');
let pwm = require('./stubpwm.js');
let i2c = require('./stubi2c.js');
let motorHat = proxyquire('../dist/index.js', {'./pwm.js': pwm, 'i2c-bus': i2c});
module.exports = motorHat;
