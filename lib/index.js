'use strict';
module.exports = function (options) {
  let i2cAddr = options.address || 0x60;
  let frequency = options.frequency || 1600;
  let steppers = options.steppers || [];
  let dc = options.dc || [];
  let servos = options.servos || [];

  if (((steppers.length * 2) + dc.length) >= 4) {
    throw Error('Only combinations available are:\n0 Steppers - 4 DC\n1 Stepper - 2 DC\n2Steppers - 0 DC');
  }

  if (steppers.length > 2) {
    throw Error('Only 4 servos can be controlled.');
  }

  if (servos.length > 4) {
    throw Error('Only 4 servos can be controlled.');
  }

  if (!isNumeric(frequency)) {
    throw Error('Frequency should be a number.');
  }

  if (!isNumeric(i2cAddr)) {
    throw Error('I2C Address should be a number.');
  }

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
};
