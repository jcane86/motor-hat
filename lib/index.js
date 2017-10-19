'use strict';

/**
 * @module MotorHat
 */

const async = require('async');

/**
 * Servo Controller Factory
 *
 * @memberOf module:MotorHat~motorhat
 * @type {module:MotorHat/Servo}
 */
const servolib = require('./servo.js');
/**
 * Stepper Controller Factory
 *
 * @memberOf module:MotorHat~motorhat
 * @type {module:MotorHat/Stepper}
 */
const stepperlib = require('./stepper.js');
/**
 * DC Controller Factory
 *
 * @memberOf module:MotorHat~motorhat
 * @type {module:MotorHat/DC}
 */
const dclib = require('./dc.js');
const pwmlib = require('./pwm.js');
const i2c = require('i2c-bus');
/**
 * Set environment variable DEBUG to "motorhat:*" to get debug output
 * @name DEBUG~debug
 */
const debug = require('debug')('motor-hat:index');
const parambulator = require('parambulator');

const errHdlr = function errHdlr(err) {
  if (err) {
    debug('Validation eror: %s', err);
    throw new Error(err);
  }
};

/**
 * Creates a new MotorHat controller.
 *
 * Pass in an options object to generate an uninitialized MotorHat object.
 *
 * @example Basic Usage:
 *
 * const motorHat = require('motor-hat')({addr: 0x6F}).init();
 *
 * @param {Object} [opts]
 * @param {Integer} [opts.adress] i2c address of the PWM chip on the MotorHat.
 *
 *  * 0x6F for knockoff HATs.
 *
 *  * 0x60 for official AdaFruit HATs??
 * @param {Integer} [opts.busnum] i2c driver devfile number. Varies by RaspBerry version.
 *  Should be automatically detected.
 * @param {Array} [opts.steppers] Definition of the stepper motors connected to the HAT.
 *  At most 2 steppers, each motor is represented by either an object of the form
 *  {W1: winding, W2: winding}. Each winding should be one of following: 'M1', 'M2', 'M3',
 *  'M4' depending on the port the stepper is connected to. Correct example: {W1: 'M3', W2: 'M1'}
 * @param {String[]} [opts.dcs] Definition of the DC motors connected to the HAT.
 *  At most 4 DCs, each should be one of following: 'M1', 'M2', 'M3', 'M4' depending on
 *  port the motor is connected to.
 * @param {Integer[]} [opts.servos] Definition of the servos connected to the HAT.
 *  List of the channels that have servos connected to them. 0 to 15.
 * @returns {module:MotorHat~motorhat}
 */
module.exports = function MotorHat(opts) {
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

  let options = {};

  /**
   * Array of initialized Stepper controllers
   *
   * @instance
   * @memberOf module:MotorHat~motorhat
   * @type {module:MotorHat/Stepper~stepper[]}
   */
  const steppers = [];
  /**
   * Array of initialized DC controllers
   *
   * @instance
   * @memberOf module:MotorHat~motorhat
   * @type {module:MotorHat/DC~dC[]}
   */
  const dcs = [];
  /**
   * Array of initialized Servo controllers
   *
   * @instance
   * @memberOf module:MotorHat~motorhat
   * @type {module:MotorHat/Servo~servo[]}
   */
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

  /**
   * Initialize the motorHat library instance.
   *
   * Instantiates the individual Motor/Servo/Stepper controllers and initializes them.
   *
   * @instance
   * @memberOf module:MotorHat~motorhat
   * @param cb Optional node style callback for asynch initialization
   * @returns {module:MotorHat~motorhat} Returns initialized motorHat object (self), either directly
   * or in second parameter to callback if callback provided, to enable chaining.
   */
  const init = function init(cb) {
    const pwmopts = { i2c, address: options.address };
    const self = this;
    pwm = pwmlib(pwmopts);

    // Synch inits
    if (!cb) {
      pwm.init();

      options.steppers.map((value) => {
        steppers.push(stepperlib({ pwm, pins: { W1: pins[value.W1], W2: pins[value.W2] } }).init());
        return null;
      });
      options.servos.map((servoPin) => {
        servos.push(servolib({ pwm, pin: servoPin }));
        return null;
      });
      options.dcs.map((value) => {
        dcs.push(dclib({ pwm, pins: pins[value] }).init());
        return null;
      });

      return self;
    }

    pwm.init((err0) => {
      if (err0) return cb(err0);
      // Asynch inits
      // Use async to do stepper inits one by one in async.
      async.mapSeries(options.steppers, (value, callback) => {
        stepperlib({ pwm, pins: { W1: pins[value.W1], W2: pins[value.W2] } }).init((err, val) => {
          if (!err) steppers.push(val);
          callback(err, value);
          return null;
        });
      }, (err1) => {
        // Once steppers are done, move on to DCs
        if (err1) return cb(err1);
        return async.mapSeries(options.dcs, (value, callback) => {
          dclib({ pwm, pins: pins[value] }).init((err, val) => {
            if (!err) dcs.push(val);
            callback(err, value);
            return null;
          });
        }, (err2) => {
          if (err2) return cb(err2);
          // Once done with DCs, do servos (no async init for servos).
          try {
            options.servos.map((servoPin) => {
              servos.push(servolib({ pwm, pin: servoPin }));
              return null;
            });
          } catch (e) {
            return cb(e);
          }
          // Finally, call original callback with initialized instance.
          return cb(err2, self);
        });
      });

      return null;
    });

    return null;
  };

  /**
   * motorHat controller
   *
   * Needs to be initialized with init().
   * @namespace motorhat
   * @see Use {@link module:MotorHat|MotorHat()} for object creation.
   * @see Use {@link module:MotorHat~motorhat#init} for object initialization.
   * @type {Object}
   */
  const motorHat = {
    init,
    pins,
    servo: servolib,
    stepper: stepperlib,
    dc: dclib,
    servos,
    steppers,
    dcs,
  };

  /* eslint no-param-reassign: "off" */
  options = opts || {};
  optspec.validate(options, errHdlr);

  checkPins(options.steppers, options.dcs, options.servos);

  return Object.create(motorHat);
};
