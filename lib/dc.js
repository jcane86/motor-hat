'use strict';

/**
 * @module MotorHat/DC
 */

const debug = require('debug')('motor-hat:dclib');
const parambulator = require('parambulator');
const async = require('async');

const errHdlr = function errHdlr(err) {
  if (err) {
    throw new Error(err);
  }
};

const isRequired = () => { throw new Error('Async functions require callback'); };

/**
 * Creates a new DC motor controller
 *
 * Pass in an options object to generate an uninitialized DCLib object.
 *
 * @example Basic Usage:
 *
 * const opts = {
 *   pwm: pwm,
 *   pins: {
 *     PWM: 8,
 *     IN1: 10,
 *     IN2: 9,
 *   },
 *   speed: 50,
 *   freq: 1600,
 * };
 *
 * const dc = require('./dc.js')(opts).init();
 *
 * @param {Object} opts
 * @param {Object} opts.pwm PWM Interface Object
 * @param {Object} opts.pins Pin definition for the motor.
 * @param {Number} opts.pins.PWM Pin number of the PWM output for the DC motor.
 * @param {Number} opts.pins.IN1 Pin number of the first coil output for the DC motor.
 * @param {Number} opts.pins.IN2 Pin number of the second coil output for the DC motor.
 * @returns {module:MotorHat/DC~dc}
 */
module.exports = function DC(opts) {
  const freqspec = parambulator({ freq: 'number$, required$' });
  const dirspec = parambulator({
    dir: {
      enum$: ['fwd', 'back'],
      required$: true,
    },
  });
  const speedspec = parambulator({
    speed: {
      type$: 'number',
      min$: 0,
      max$: 100,
    },
  });
  const optspec = parambulator({
    pwm: 'required$, notempty$',
    pins: {
      required$: true,
      notempty$: true,
      minlen$: 3,
      maxlen$: 3,
      '*': {
        type$: 'number',
        min$: 0,
        max$: 15,
      },
    },
    speed: {
      type$: 'number',
      min$: 0,
      max$: 100,
      default$: 100,
    },
    frequency: {
      type$: 'number',
      default$: 1600,
    },
  });

  let options;
  let pwm;
  let PWM;
  let IN1;
  let IN2;

  /**
   * Starts the motor in the desired direction.
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   * @param {('fwd'|'back')} dir Direction of movement.
   * @param {callback} cb Node style callback. Gets called with cb(err, result) after completion.
   */
  const run = function run(dir, cb = isRequired()) {
    dirspec.validate({ dir }, errHdlr);
    let pinLow;
    let pinHigh;
    if (dir === 'fwd') {
      debug('DC run(): Going FWD');
      pinLow = IN2;
      pinHigh = IN1;
    } else {
      debug('DC run(): Going BACK');
      pinLow = IN1;
      pinHigh = IN2;
    }

    async.series([
      pwm.setPin.bind(pwm, pinLow, 0),
      pwm.setPin.bind(pwm, pinHigh, 1),
    ], cb);
  };

  /**
   * Starts the motor in the desired direction.
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   * @param {('fwd'|'back')} dir Direction of movement.
   */
  const runSync = function runSync(dir) {
    dirspec.validate({ dir }, errHdlr);
    if (dir === 'fwd') {
      debug('DC run(): Going FWD');
      pwm.setPinSync(IN2, 0);
      pwm.setPinSync(IN1, 1);
    } else {
      debug('DC run(): Going BACK');
      pwm.setPinSync(IN1, 0);
      pwm.setPinSync(IN2, 1);
    }
  };

  /**
   * Stops the motor.
   * Doesn't actually brake the motor, just stops applying voltage to it.
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   * @param {callback} cb Node style callback. Gets called with cb(err, result) after completion.
   */
  const stop = function stop(cb = isRequired()) {
    debug('DC run(): Releasing motor');
    async.series([
      pwm.setPin.bind(pwm, IN1, 0),
      pwm.setPin.bind(pwm, IN2, 0),
    ], cb);
  };

  /**
   * Stops the motor.
   * Doesn't actually brake the motor, just stops applying voltage to it.
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   */
  const stopSync = function stopSync() {
    debug('DC run(): Releasing motor');
    pwm.setPinSync(IN1, 0);
    pwm.setPinSync(IN2, 0);
  };

  /**
   * Sets DC motor speed.
   * The speed can be set as a percentage, from 0% to 100%. To change the actual top speed,
   * the actual voltage supplied to the motor needs to be controlled by hardware (get a higher
   * voltage source).
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   * @param {number} speed Relative speed. 0% to 100%.
   * @param {callback} cb Node style callback. Gets called with cb(err, result) after completion.
   */
  const setSpeed = function setSpeed(speed, cb = isRequired()) {
    speedspec.validate({ speed }, errHdlr);
    debug('DC setSpeed(): Setting speed to %d%%', speed);
    pwm.setPWM(PWM, 0, (speed / 100) * 4080, cb);
  };

  /**
   * Sets DC motor speed.
   * The speed can be set as a percentage, from 0% to 100%. To change the actual top speed,
   * the actual voltage supplied to the motor needs to be controlled by hardware (get a higher
   * voltage source).
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   * @param {number} speed Relative speed. 0% to 100%.
   */
  const setSpeedSync = function setSpeedSync(speed) {
    speedspec.validate({ speed }, errHdlr);
    debug('DC setSpeed(): Setting speed to %d%%', speed);
    pwm.setPWMSync(PWM, 0, (speed / 100) * 4080);
  };

  /**
   * Sets the PWM frequency for the DC motor.
   * This setting affects the frequency at which the PWM chip will work to command the DC motor.
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   * @param {Number} freq PWM Frequency in Hz.
   * @param {callback} cb Node style callback. Gets called with cb(err, result) after completion.
   */
  const setFrequency = function setFrequency(freq, cb = isRequired()) {
    freqspec.validate({ freq }, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreq(options.frequency, (err, res) => {
      debug(`PWM Frequency set to: ${options.frequency}`);
      cb(err, res);
    });
  };

  /**
   * Sets the PWM frequency for the DC motor.
   * This setting affects the frequency at which the PWM chip will work to command the DC motor.
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   * @param {Number} freq PWM Frequency in Hz.
   */
  const setFrequencySync = function setFrequencySync(freq) {
    freqspec.validate({ freq }, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreqSync(options.frequency);
    debug(`PWM Frequency set to: ${options.frequency}`);
  };

  /**
   * Initialize the DC controller instance.
   *
   * @instance
   * @memberOf module:MotorHat/DC~dc
   * @param {callback} [cb] Optional node style callback for asynch initialization
   * @returns {module:MotorHat/DC~dc} Returns initialized DC controller object (self),
   * either directly or in second parameter to callback if callback provided to enable chaining.
   */
  const init = function init(cb) {
    if (cb) {
      const self = this;
      async.series(
        [
          setFrequency.bind(self, options.frequency), // Hz
          setSpeed.bind(self, options.speed),
        ],
        (err) => { cb(err, self); },
      );
    } else {
      setFrequencySync(options.frequency); // Hz
      setSpeedSync(options.speed);
      return this;
    }

    return true;
  };

  /**
   * DC Controller Object
   *
   * @namespace dc
   * @see Use {@link module:MotorHat/DC|DC()} for object creation.
   * @see Use {@link module:MotorHat/DC~dc#init} for object initialization.
   * @type {Object}
   */
  const dc = {
    init,
    run,
    runSync,
    stop,
    stopSync,
    setSpeed,
    setSpeedSync,
    setFrequency,
    setFrequencySync,
  };

  optspec.validate(opts, errHdlr);
  options = opts;
  [pwm] = [opts.pwm];

  PWM = opts.pins.PWM || opts.pins[0];
  IN1 = opts.pins.IN1 || opts.pins[1];
  IN2 = opts.pins.IN2 || opts.pins[2];

  debug(`DC Motor Init: pins set to: ${[PWM, IN1, IN2]}`);

  return Object.create(dc);
};
