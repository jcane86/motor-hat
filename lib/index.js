'use strict';
let servo = require('./servo.js');
let stepper = require('./stepper.js');
// let dc = require('/dc.js');
let pwm = require('./pwm.js');
let i2c = require('i2c-bus');
let debug = require('debug')('motor-hat:index');
let parambulator = require('parambulator');
let errHdlr = function (err) {
  if (err) {
    debug('Validation eror: %s', err);
    throw new Error(err);
  }
};

let pins = {
  M1: {
    PWM: 8,
    IN2: 9,
    IN1: 10
  },
  M2: {
    PWM: 13,
    IN2: 12,
    IN1: 11
  },
  M3: {
    PWM: 2,
    IN2: 3,
    IN1: 4
  },
  M4: {
    PWM: 7,
    IN2: 6,
    IN1: 5
  }
};

module.exports = function (options) {
  let optspec = parambulator({
    address: {
      type$: 'number',
      default$: 0x60
    },
    frequency: {
      type$: 'number',
      default$: 1600
    },
    steppers: {
      maxlen$: 2,
      '*': {
        minlen$: 2,
        maxlen$: 2,
        '*': {
          enum$: ['M1', 'M2', 'M3', 'M4']
        }
      },
      default$: []
    },
    dcs: {
      '*': {
        enum$: ['M1', 'M2', 'M3', 'M4']
      },
      uniq$: true,
      default$: []
    },
    servos: {
      '*': {
        type$: 'number',
        min$: 0,
        max$: 15
      },
      default$: []
    }
  });
  options = options || {};
  optspec.validate(options, errHdlr);
  let steppers = [];
  let dcs = [];
  let servos = [];

  checkPins(options.steppers, options.dcs, options.servos);

  function checkPins(steppers, dcs, servos) {
    let pinAloc = [];
    steppers.map(function (stepper) {
      pinAloc[pins[stepper.W1].PWM] = true;
      pinAloc[pins[stepper.W1].IN1] = true;
      pinAloc[pins[stepper.W1].IN2] = true;
      pinAloc[pins[stepper.W2].PWM] = true;
      pinAloc[pins[stepper.W2].IN1] = true;
      pinAloc[pins[stepper.W2].IN2] = true;
      return null;
    });

    dcs.map(function (dc) {
      debug(dc);
      if (pinAloc[pins[dc].PWM] === true || pinAloc[pins[dc].IN1] === true || pinAloc[pins[dc].IN2] === true) {
        debug('Pins check: DCs: Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
        throw Error('Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
      } else {
        pinAloc[pins[dc].PWM] = true;
        pinAloc[pins[dc].IN1] = true;
        pinAloc[pins[dc].IN2] = true;
      }
      return null;
    });

    servos.map(function (servo) {
      if (pinAloc[servo]) {
        debug('Pins check: servos: Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
        throw Error('Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
      } else {
        pinAloc[servo] = true;
      }
      return null;
    });
  }

  let init = function () {
    options.steppers.map(function (value) {
      steppers.push(stepper({pwm: pwm({i2c: i2c}), pins: {W1: pins[value.W1], W2: pins[value.W2]}}));
      return null;
    });
    options.servos.map(function (value) {
      servos.push(servo({pwm: pwm({i2c: i2c}), pin: value}));
      return null;
    });
    options.dcs.map(function (value) {
    //   dcs.push(dc({pwm: pwm, pins: pins[value]}));
      dcs.push(value);
      return null;
    });
  };

  init();

  return {
    setFrequency: function (freq) {
      options.frequency = freq;
      return this;
    },
    getFrequency: function () {
      return options.frequency;
    },
    setAddress: function (addr) {
      options.address = addr;
      return this;
    },
    getAddress: function () {
      return options.address;
    },
    pins: pins,
    servo: servo,
    stepper: stepper
  };
};
