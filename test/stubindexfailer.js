'use strict';

const proxyquire = require('proxyquire');

let stepErr;
let dcErr;
let servoErr;
let pwmErr;

const stepper = () => ({ init: cb => cb(stepErr) });
const dc = () => ({ init: cb => cb(dcErr) });
const servo = () => { if (servoErr) throw new Error(servoErr); };
const pwm = () => ({ init: cb => cb(pwmErr) });
const i2c = require('./stubi2c.js');

const motorHat = proxyquire('../lib/index.js', {
  './pwm.js': pwm,
  'i2c-bus': i2c,
  './stepper.js': stepper,
  './dc.js': dc,
  './servo.js': servo,
});

module.exports.fail = function (part) {
  switch (part) {
    case 'stepper':
      stepErr = 'error initializing Stepper';
      break;
    case 'dc':
      dcErr = 'error initializing DC';
      break;
    case 'servo':
      servoErr = 'error initializing Servo';
      break;
    case 'pwm':
      pwmErr = 'error initializing PWM';
      break;
    default:
  }
  return motorHat;
};
module.exports.reset = function () {
  stepErr = null;
  dcErr = null;
  servoErr = null;
  pwmErr = null;
  return motorHat;
};
module.exports.default = motorHat;
