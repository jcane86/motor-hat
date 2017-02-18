'use strict';

let pins = {
  servoA: {
    PWMA: 8,
    AIN2: 9,
    AIN1: 10,
    PWMB: 13,
    BIN2: 12,
    BIN1: 11
  },
  servoB: {
    PWMA: 2,
    AIN2: 3,
    AIN1: 4,
    PWMB: 7,
    BIN2: 6,
    BIN1: 5
  }
};

module.exports = function (options) {
  options = options || {};
  let i2cAddr = options.address || 0x60;
  let frequency = options.frequency || 1600;
  let steppers = options.steppers || [];
  let dc = options.dc || [];
  let servos = options.servos || [];

  if (!isNumeric(frequency)) {
    throw Error('Frequency should be a number.');
  }

  if (!isNumeric(i2cAddr)) {
    throw Error('I2C Address should be a number.');
  }

  checkPins(steppers, dc, servos);

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function checkPins(steppers, dc, servos) {
    let pins = [];
    steppers.map(function (pos) {
      if ((pos * 2) > 1) {
        throw Error('Wrong usage.\nSteppers should be 0 or 1.');
      }
      pins[pos * 2] = true;
      pins[(pos * 2) + 1] = true;
      return null;
    });

    dc.map(function (pos) {
      if (pos > 3) {
        throw Error('Wrong usage.\nDC Motors should be 0 or 1.');
      }
      if (pins[pos * 2] || pins[(pos * 2) + 1]) {
        throw Error('Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
      } else {
        pins[pos * 2] = true;
        pins[(pos * 2) + 1] = true;
      }
      return null;
    });

    servos.map(function (pos) {
      if (pos > 3) {
        throw Error('Wrong usage.\nSteppers should be 0 to 3.');
      }
      if (pins[pos + 3]) {
        throw Error('Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
      } else {
        pins[pos + 3] = true;
      }
      return null;
    });
  }

  return {
    setFrequency: function (freq) {
      frequency = freq;
      return this;
    },
    getFrequency: function () {
      return frequency;
    },
    setAddress: function (addr) {
      i2cAddr = addr;
      return this;
    },
    getAddress: function () {
      return i2cAddr;
    },
    pins: pins
  };
};
