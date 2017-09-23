'use strict';

const async = require('async');

const servolib = require('./servo.js');
const stepperlib = require('./stepper.js');
const dclib = require('./dc.js');
const pwmlib = require('./pwm.js');
const i2c = require('i2c-bus');
const debug = require('debug')('motor-hat:index');
const parambulator = require('parambulator');

const errHdlr = function errHdlr(err) {
  if (err) {
    debug('Validation eror: %s', err);
    throw new Error(err);
  }
};

const pins = {
  M1: {
    PWM: 8,
    IN2: 9,
    IN1: 10,
  },
  M2: {
    PWM: 13,
    IN2: 12,
    IN1: 11,
  },
  M3: {
    PWM: 2,
    IN2: 3,
    IN1: 4,
  },
  M4: {
    PWM: 7,
    IN2: 6,
    IN1: 5,
  },
};

module.exports = function exports(options) {
  const optspec = parambulator({
    address: {
      type$: 'number',
      default$: 0x6F,
    },
    busnum: {
      type$: 'number',
      default$: undefined,
    },
    steppers: {
      maxlen$: 2,
      '*': {
        minlen$: 2,
        maxlen$: 2,
        '*': {
          enum$: ['M1', 'M2', 'M3', 'M4'],
        },
      },
      default$: [],
    },
    dcs: {
      '*': {
        enum$: ['M1', 'M2', 'M3', 'M4'],
      },
      uniq$: true,
      default$: [],
    },
    servos: {
      '*': {
        type$: 'number',
        min$: 0,
        max$: 15,
      },
      default$: [],
    },
  });
  /* eslint no-param-reassign: "off" */
  options = options || {};
  optspec.validate(options, errHdlr);
  const steppers = [];
  const dcs = [];
  const servos = [];
  let pwm;

  function checkPins(optSteppers, optDCs, optServos) {
    const pinAloc = [];
    optSteppers.map((stepper) => {
      pinAloc[pins[stepper.W1].PWM] = true;
      pinAloc[pins[stepper.W1].IN1] = true;
      pinAloc[pins[stepper.W1].IN2] = true;
      pinAloc[pins[stepper.W2].PWM] = true;
      pinAloc[pins[stepper.W2].IN1] = true;
      pinAloc[pins[stepper.W2].IN2] = true;
      return null;
    });

    optDCs.map((dc) => {
      debug(dc);
      if (pinAloc[pins[dc].PWM] === true ||
        pinAloc[pins[dc].IN1] === true ||
        pinAloc[pins[dc].IN2] === true) {
        debug('Pins check: DCs: Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
        throw Error('Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
      } else {
        pinAloc[pins[dc].PWM] = true;
        pinAloc[pins[dc].IN1] = true;
        pinAloc[pins[dc].IN2] = true;
      }
      return null;
    });

    optServos.map((servo) => {
      if (pinAloc[servo]) {
        debug('Pins check: servos: Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
        throw Error('Wrong usage.\nMotor, Stepper and Servo definitions can\'t overlap on the same pins.\n');
      } else {
        pinAloc[servo] = true;
      }
      return null;
    });
  }

  checkPins(options.steppers, options.dcs, options.servos);

  const init = function init(cb) {
    const pwmopts = { i2c, address: options.address };
    pwm = pwmlib(pwmopts);
    const self = this;

    // Servos dont have asynch init so we can do them here.
    options.servos.map((servoPin) => {
      servos.push(servolib({ pwm, pin: servoPin }));
      return null;
    });

    // Synch inits
    if (!cb) {
      options.steppers.map((value) => {
        steppers.push(stepperlib({ pwm, pins: { W1: pins[value.W1], W2: pins[value.W2] } }));
        return null;
      });
      options.dcs.map((value) => {
        dcs.push(dclib({ pwm, pins: pins[value] }).init());
        return null;
      });

      return self;
    }

    // Asynch inits
    async.mapSeries(options.steppers, (value, callback) => {
      stepperlib({ pwm, pins: { W1: pins[value.W1], W2: pins[value.W2] } }).init((err, val) => {
        steppers.push(val);
        callback(err, value);
      });
    }, () => {
      async.mapSeries(options.dcs, (value, callback) => {
        dclib({ pwm, pins: pins[value] }).init((err, val) => {
          dcs.push(val);
          callback(err, value);
        });
      }, () => {
        cb(null, self);
      });
    });

    return null;
  };

  return {
    init,
    pins,
    servo: servolib,
    stepper: stepperlib,
    dc: dclib,
    servos,
    steppers,
    dcs,
  };
};
