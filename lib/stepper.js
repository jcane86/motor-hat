'use strict';

/**
 * @module MotorHat/Stepper
 */

// *1 default parameters to trap undefined callbacks ignored from coverage for
// Private functions as can't be easily tested.

const async = require('async');

const debug = require('debug')('motor-hat:stepperlib');
const parambulator = require('parambulator');
const sleep = require('sleep').msleep;

const errHdlr = function errHdlr(err) {
  if (err) {
    throw new Error(err);
  }
};

const isRequired = function isRequired() {
  throw new Error('Callback is required for async methods.');
};

/**
 * Creates a stepper motor controller.
 * Pass in an options object to generate an uninitialized StepperLib object.
 *
 * @example Basic Usage:
 *
 * const opts = {
 *   pwm: pwm,
 *   pins: {
 *     W1: {
 *       PWM: 8,
 *       IN1: 10,
 *       IN2: 9,
 *     },
 *     W2: {
 *     PWM: 13,
 *     IN1: 11,
 *     IN2: 12,
 *   },
 *   steps: 540, // Steps per motor revolution
 *   style: 'microstep', // 'single', 'double', 'interleaved' or 'microstep'
 *   microsteps: 16, // If commanding with microsteps, do 8 or 16?
 *   frequency: 1600, // PWM controller work freq
 *   sps: 20, // Steps per second. Also possible to set rpm or pps (pulses per second)
 * };
 *
 * const stepper = require('./stepper.js')(opts).init();
 *
 * @param {Object} opts Servo controller initialization options.
 * @param {Object} opts.pwm PWM Interface Object
 * @param {Number} opts.frequency PWM Controller frequency for the stepper.
 * @param {Object} opts.pins Pin definition for the motor.
 * @param {Object} opts.pins.W1 Pin definition for winding 1 of the stepper
 * @param {Number} opts.pins.W1.PWM Pin number of the PWM output for winding 1.
 * @param {Number} opts.pins.W1.IN1 Pin number of the first coil output for winding 1.
 * @param {Number} opts.pins.W1.IN2 Pin number of the second coil output for winding 1.
 * @param {Object} opts.pins.W2 Pin definition for winding 2 of the stepper
 * @param {Number} opts.pins.W2.PWM Pin number of the PWM output for winding 2.
 * @param {Number} opts.pins.W2.IN1 Pin number of the first coil output for winding 2.
 * @param {Number} opts.pins.W2.IN2 Pin number of the second coil output for winding 2.
 * @param {Number} opts.steps Steps per revolution of the stepper motor.
 * @param {('single'|'double'|'interleaved'|'microstep')} opts.style Stepping style
 * @param {(8|16)} opts.microsteps number of microsteps per step.
 * @param {Number} [opts.sps] Steps per second.
 * @param {Number} [opts.pps] Pulses per second.
 * @param {Number} [opts.rpm] Revolutions per minute.
 * @returns {module:MotorHat/Stepper~stepper}
 */
module.exports = function Stepper(opts) {
  const validateDir = dir => (
    dir !== 'fwd' && dir !== 'back' && errHdlr('Dir should be either "fwd" or "back".')
  );

  const stylespec = parambulator({
    style: {
      enum$: ['single', 'double', 'interleaved', 'microstep'],
      required$: true,
    },
  });
  const freqspec = parambulator({ freq: 'number$, required$' });
  const msspec = parambulator({
    ms: {
      enum$: [8, 16],
      required$: true,
    },
  });
  const stepspec = parambulator({ steps: 'number$, required$' });
  const currentspec = parambulator({
    current: {
      type$: 'number',
      min$: 0,
      max$: 1,
      required$: true,
    },
  });
  const speedspec = parambulator({
    exactlyone$: ['pps', 'rpm', 'sps'],
    pps: 'number$',
    rpm: 'number$',
    sps: 'number$',
  });
  const optspec = parambulator({
    pwm: 'required$, notempty$',
    pins: {
      required$: true,
      notempty$: true,
      W1: {
        required$: true,
        minlen$: 3,
        maxlen$: 3,
        '*': {
          type$: 'number',
          min$: 0,
          max$: 15,
        },
      },
      W2: {
        required$: true,
        minlen$: 3,
        maxlen$: 3,
        '*': {
          type$: 'number',
          min$: 0,
          max$: 15,
        },
      },
    },
    steps: {
      type$: 'number',
      default$: 64 * 32,
    },
    microsteps: {
      enum$: [8, 16],
      default$: 8,
    },
    frequency: {
      type$: 'number',
      default$: 1600,
    },
    style: {
      enum$: ['single', 'double', 'interleaved', 'microstep'],
      default$: 'double',
    },
    current: {
      type$: 'number',
      min$: 0,
      max$: 1,
      default$: 1,
    },
    atmostone$: ['pps', 'rpm', 'sps'],
    pps: 'number$',
    rpm: 'number$',
    sps: 'number$',
  });

  optspec.validate(opts, errHdlr);
  const options = opts;
  const [pwm] = [options.pwm];
  let microstepsCurve = [];
  let currentStep = 0;
  const state = {};
  let pulsing = false;

  const pins = {};
  pins.PWMA = options.pins.W1.PWM || options.pins.W1[0];
  pins.AIN1 = options.pins.W1.IN1 || options.pins.W1[1];
  pins.AIN2 = options.pins.W1.IN2 || options.pins.W1[2];
  pins.PWMB = options.pins.W2.PWM || options.pins.W2[0];
  pins.BIN1 = options.pins.W2.IN1 || options.pins.W2[1];
  pins.BIN2 = options.pins.W2.IN2 || options.pins.W2[2];

  debug(`New stepper: pins set to: ${[pins.PWMA, pins.AIN1, pins.AIN2, pins.PWMB, pins.BIN1, pins.BIN2]}`);

  // We only actually send the commands if the state is changing
  const lazyPWM = function lazyPWM(pin, newState, cb = /* istanbul ignore next *1 */isRequired()) {
    // Decrement the maximum duty cycle by the rate passed in current
    const throttledState = newState * options.current;
    if (undefined === state[pin] || state[pin] !== throttledState) {
      pwm.setPWM(pins[pin], 0, throttledState, (err, res) => {
        state[pin] = throttledState;
        cb(err, res);
      });
    } else {
      cb(null);
    }
  };

  const lazyPin = function lazyPin(pin, newState, cb = /* istanbul ignore next *1 */isRequired()) {
    if (undefined === state[pin] || state[pin] !== newState) {
      pwm.setPin(pins[pin], newState, (err, res) => {
        state[pin] = newState;
        cb(err, res);
      });
    } else {
      cb(null);
    }
  };

  const lazyPWMSync = function lazyPWMSync(pin, newState) {
    // Decrement the maximum duty cycle by the rate passed in current
    const throttledState = newState * options.current;
    if (undefined === state[pin] || state[pin] !== throttledState) {
      pwm.setPWMSync(pins[pin], 0, throttledState);
      state[pin] = throttledState;
    }
  };

  const lazyPinSync = function lazyPinSync(pin, newState) {
    if (undefined === state[pin] || state[pin] !== newState) {
      pwm.setPinSync(pins[pin], newState);
      state[pin] = newState;
    }
  };

  const pulse = function pulse(newState, cb = /* istanbul ignore next *1 */isRequired()) {
    const self = this;
    pulsing = true;
    async.series([
      lazyPWM.bind(self, 'PWMA', newState.PWMA),
      lazyPWM.bind(self, 'PWMB', newState.PWMB),
      lazyPin.bind(self, 'AIN2', newState.AIN2),
      lazyPin.bind(self, 'BIN1', newState.BIN1),
      lazyPin.bind(self, 'AIN1', newState.AIN1),
      lazyPin.bind(self, 'BIN2', newState.BIN2),
    ], (err, res) => {
      pulsing = false;
      cb(err, res);
    });
  };

  const pulseSync = function pulseSync(newState) {
    lazyPWMSync('PWMA', newState.PWMA);
    lazyPWMSync('PWMB', newState.PWMB);
    lazyPinSync('AIN2', newState.AIN2);
    lazyPinSync('BIN1', newState.BIN1);
    lazyPinSync('AIN1', newState.AIN1);
    lazyPinSync('BIN2', newState.BIN2);
  };

  const step2coils = [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 1],
  ];

  const micro = function micro(dir) {
    validateDir(dir);

    const [microsteps] = [options.microsteps];

    if (dir === 'fwd') {
      currentStep += 1;
    } else {
      currentStep -= 1;
    }

    // go to next 'step' and wrap around
    currentStep += microsteps * 4;
    currentStep %= microsteps * 4;

    let pwmA = 0;
    let pwmB = 0;
    let coils = [0, 0, 0, 0];
    if ((currentStep >= 0) && (currentStep < microsteps)) {
      pwmA = microstepsCurve[microsteps - currentStep];
      pwmB = microstepsCurve[currentStep];
      coils = [1, 1, 0, 0];
    } else if ((currentStep >= microsteps) && (currentStep < microsteps * 2)) {
      pwmA = microstepsCurve[currentStep - microsteps];
      pwmB = microstepsCurve[(microsteps * 2) - currentStep];
      coils = [0, 1, 1, 0];
    } else if ((currentStep >= microsteps * 2) && (currentStep < microsteps * 3)) {
      pwmA = microstepsCurve[(microsteps * 3) - currentStep];
      pwmB = microstepsCurve[currentStep - (microsteps * 2)];
      coils = [0, 0, 1, 1];
    } else { // if ((currentStep >= microsteps * 3) && (currentStep < microsteps * 4))
      pwmA = microstepsCurve[currentStep - (microsteps * 3)];
      pwmB = microstepsCurve[(microsteps * 4) - currentStep];
      coils = [1, 0, 0, 1];
    }

    debug(`MICROSTEPPING: Coils state = ${coils}`);
    debug(`MICROSTEPPING: PWM state = ${[pwmA, pwmB]}`);

    return {
      PWMA: pwmA * 16,
      PWMB: pwmB * 16,
      AIN2: coils[0],
      BIN1: coils[1],
      AIN1: coils[2],
      BIN2: coils[3],
    };
  };

  const microStep = function microStep(dir, cb = /* istanbul ignore next *1 */isRequired()) {
    pulse(micro(dir), cb);
  };

  const microStepSync = function microStepSync(dir) {
    pulseSync(micro(dir));
  };

  const double = function double(dir) {
    validateDir(dir);

    const [microsteps] = [options.microsteps];
    const pwmA = 255;
    const pwmB = 255;

    // go to next odd half step
    if (dir === 'fwd') {
      currentStep += microsteps;
    } else {
      currentStep -= microsteps;
    }

    // for double stepping, we only use the odd halfsteps, floor to next odd halfstep if necesary
    currentStep -= ((currentStep + (microsteps / 2)) % microsteps);

    // go to next 'step' and wrap around
    currentStep += microsteps * 4;
    currentStep %= microsteps * 4;

    // set up coils
    const coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    debug(`DOUBLE STEPPING: Coils state = ${coils}`);

    return {
      PWMA: pwmA * 16,
      PWMB: pwmB * 16,
      AIN2: coils[0],
      BIN1: coils[1],
      AIN1: coils[2],
      BIN2: coils[3],
    };
  };

  const doubleStep = function doubleStep(dir, cb = /* istanbul ignore next *1 */isRequired()) {
    pulse(double(dir), cb);
  };

  const doubleStepSync = function doubleStepSync(dir) {
    pulseSync(double(dir));
  };

  const single = function single(dir) {
    validateDir(dir);

    const [microsteps] = [options.microsteps];
    const pwmA = 255;
    const pwmB = 255;

    // go to next even half step
    if (dir === 'fwd') {
      currentStep += microsteps;
    } else {
      currentStep -= microsteps;
    }

    // for single stepping, we only use the even halfsteps, floor to next even halfstep if necesary
    currentStep -= (currentStep % microsteps);

    // go to next 'step' and wrap around
    currentStep += microsteps * 4;
    currentStep %= microsteps * 4;

    // set up coils
    const coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    debug(`SINGLE STEPPING: Coils state = ${coils}`);

    return {
      PWMA: pwmA * 16,
      PWMB: pwmB * 16,
      AIN2: coils[0],
      BIN1: coils[1],
      AIN1: coils[2],
      BIN2: coils[3],
    };
  };

  const singleStep = function singleStepSync(dir, cb = /* istanbul ignore next *1 */isRequired()) {
    pulse(single(dir), cb);
  };

  const singleStepSync = function singleStepSync(dir) {
    pulseSync(single(dir));
  };

  const interleaved = function interleaved(dir) {
    validateDir(dir);
    const [microsteps] = [options.microsteps];

    const pwmA = 255;
    const pwmB = 255;

    if (dir === 'fwd') {
      currentStep += microsteps / 2;
    } else {
      currentStep -= microsteps / 2;
    }
    // for interleaved we only use halfsteps. floor to closest halfstep
    currentStep -= (currentStep % (microsteps / 2));

    // go to next 'step' and wrap around
    currentStep += microsteps * 4;

    currentStep %= microsteps * 4;
    // set up coils
    const coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    debug(`INTERLEAVED STEPPING: Coils state = ${coils}`);

    return {
      PWMA: pwmA * 16,
      PWMB: pwmB * 16,
      AIN2: coils[0],
      BIN1: coils[1],
      AIN1: coils[2],
      BIN2: coils[3],
    };
  };

  // eslint-disable-next-line max-len
  const interleavedStep = function interleavedStep(dir, cb = /* istanbul ignore next *1 */isRequired()) {
    pulse(interleaved(dir), cb);
  };

  const interleavedStepSync = function interleavedStepSync(dir) {
    pulseSync(interleaved(dir));
  };

  /**
   * Set motor speed for step().
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {Object} speed
   * @param {Number} [speed.sps] Speed in steps per second.
   * @param {Number} [speed.pps] Speed in pulses per second (pulses can be steps, microsteps, etc)
   * @param {Number} [speed.rpm] Speed in revolutions per minute.
   */
  const setSpeed = function setSpeed(speed) {
    speedspec.validate(speed, errHdlr);

    const halfStepMultiplier = (options.style === 'interleaved' ? 2 : 1);
    const microStepMultiplier = (options.style === 'microstep' ? options.microsteps * 2 : 1);

    if (speed.pps) {
      options.pulsefreq = speed.pps;
      options.stepfreq = options.pulsefreq / halfStepMultiplier / microStepMultiplier;
      options.rpm = undefined;
      options.sps = undefined;
      options.pps = speed.pps;
    } else if (speed.rpm) {
      options.stepfreq = (speed.rpm * options.steps) / 60;
      options.pulsefreq = options.stepfreq * halfStepMultiplier * microStepMultiplier;
      options.pps = undefined;
      options.sps = undefined;
      options.rpm = speed.rpm;
    } else { // } if (speed.sps) {
      options.stepfreq = speed.sps;
      options.pulsefreq = options.stepfreq * halfStepMultiplier * microStepMultiplier;
      options.pps = undefined;
      options.rpm = undefined;
      options.sps = speed.sps;
    }

    debug(`STEPPER CONFIG: Step frequency set to ${options.stepfreq}`);
    debug(`STEPPER CONFIG: Pulse frequency set to ${options.pulsefreq}`);
  };

  /**
   * Set stepping style.
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {('single'|'double'|'interleaved'|'microstep')} style Stepping style.
   */
  const setStyle = function setStyle(style) {
    stylespec.validate({ style }, errHdlr);
    options.style = style;
    debug(`STEPPER CONFIG: Style set to: "${options.style}"`);

    if (options.rpm || options.sps) {
      setSpeed(options);
    }
  };

  /**
   * Set PWM Controller working frequency asynchronously.
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {Number} freq PWM frequency.
   * @param {callback} cb Node style callback. cb(err, result).
   */
  const setFrequency = function setFrequency(freq, cb = isRequired()) {
    freqspec.validate({ freq }, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreq(options.frequency, (err, res) => {
      if (!err) debug(`STEPPER CONFIG: PWM Frequency set to: ${options.frequency}`);
      cb(err, res);
    });
  };

  /**
   * Set PWM Controller working frequency synchronously.
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {Number} freq PWM frequency.
   */
  const setFrequencySync = function setFrequencySync(freq) {
    freqspec.validate({ freq }, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreqSync(options.frequency);
    debug(`STEPPER CONFIG: PWM Frequency set to: ${options.frequency}`);
  };

  /**
   * Set desired number of microsteps per step.
   * (Used for microstepping)
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {(8|16)} ms Microsteps per step
   */
  const setMicrosteps = function setMicrosteps(ms) {
    msspec.validate({ ms }, errHdlr);
    options.microsteps = ms;
    debug(`Microsteps set to: ${options.microsteps}`);
    if (options.microsteps === 8) {
      microstepsCurve = [0, 50, 98, 142, 180, 212, 236, 250, 255];
    } else {
      microstepsCurve = [
        0, 25, 50, 74, 98, 120, 141, 162, 180, 197, 212, 225, 236, 244, 250, 253, 255];
    }

    if (options.rpm || options.sps) {
      setSpeed(options);
    }
  };

  /**
   * Set number of steps per revolution for motor.
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {Number} steps Number of steps per revolution for stepper motor.
   */
  const setSteps = function setSteps(steps) {
    stepspec.validate({ steps }, errHdlr);
    options.steps = steps;

    debug(`STEPPER CONFIG: Motor steps set to ${steps}`);

    if (options.rpm || options.sps) {
      setSpeed(options);
    }
  };

  /**
   * Perform one step asynchronously.
   * Configuration as stepping style, speed, etc should have been set previously.
   *
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {('fwd'|'back')} dir Direction of movement
   * @param {callback} cb Node style callback. cb(err, result).
   */
  const oneStep = function oneStep(dir, cb = isRequired()) {
    if (options.style === 'microstep') {
      microStep(dir, cb);
    } else if (options.style === 'single') {
      singleStep(dir, cb);
    } else if (options.style === 'interleaved') {
      interleavedStep(dir, cb);
    } else { // if (options.style === 'double')
      doubleStep(dir, cb);
    }
  };

  /**
   * Perform one step asynchronously.
   * Configuration as stepping style, speed, etc should have been set previously.
   *
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {('fwd'|'back')} dir Direction of movement
   */
  const oneStepSync = function oneStepSync(dir) {
    if (options.style === 'microstep') {
      microStepSync(dir);
    } else if (options.style === 'single') {
      singleStepSync(dir);
    } else if (options.style === 'interleaved') {
      interleavedStepSync(dir);
    } else { // if (options.style === 'double')
      doubleStepSync(dir);
    }
  };

  /**
   * @typedef {Object} StepResult
   * @static
   * @memberOf module:MotorHat/Stepper~stepper
   * @property {Number} StepResult.steps Performed steps
   * @property {String} StepResult.dir Direction of steps performed
   * @property {Number} StepResult.duration Time in ms taken to perform the steps
   * @property {Number} StepResult.retried Number of steps retried.
   */

  /**
   * Perform arbitrary number of steps asynchronously.
   * Configuration as stepping style, speed, etc should have been set previously.
   *
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {('fwd'|'back')} dir Direction of movement
   * @param {Number} steps Number of steps.
   * @param {callback} cb Node style callback. cb(err, result).
   * @returns {module:MotorHat/Stepper~stepper.StepResult} result The result of the action.
   */
  const step = function step(dir, steps, cb = isRequired()) {
    if (undefined === options.pulsefreq) {
      setSpeed(options);
    }

    const wait = (1 / options.pulsefreq) * 1000;

    let count = 0;
    let retried = 0;
    let now;
    const startTime = (new Date()).getTime();
    const timer = setInterval(() => {
      now = (new Date()).getTime();
      if (count >= steps) {
        clearInterval(timer);
        cb(null, {
          steps: count, dir, duration: ((new Date()).getTime()) - startTime, retried,
        });
        return null;
      }
      if (pulsing) {
        debug('STEPPER: max speed reached, trying to send pulse while previous not finished');
        retried += 1;
        // cb('STEPPER: max speed reached, trying to send pulse while previous not finished');
        // clearInterval(timer);
        return null;
      }
      oneStep(dir, () => {
        count += 1;
        const remaining = wait - ((new Date()).getTime() - now);
        debug('STEPPER: Waiting %d ms until next step', remaining);
        now = (new Date()).getTime();
      });

      return null;
    }, wait);
  };

  /**
   * @typedef {Object} StepSyncResult
   * @static
   * @memberOf module:MotorHat/Stepper~stepper
   * @property {Number} StepResult.steps Performed steps
   * @property {String} StepResult.dir Direction of steps performed
   * @property {Number} StepResult.duration Time in ms taken to perform the steps
   */

  /**
   * Perform arbitrary number of steps synchronously.
   * Configuration as stepping style, speed, etc should have been set previously.
   *
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {('fwd'|'back')} dir Direction of movement
   * @param {Number} steps Number of steps.
   * @returns {module:MotorHat/Stepper~stepper.StepSyncResult} result The result of the action.
   */
  const stepSync = function stepSync(dir, steps) {
    let last = new Date();
    const startTime = (new Date()).getTime();
    let now = last;
    let next;
    let count;

    if (undefined === options.pulsefreq) {
      setSpeed(options);
    }

    const wait = (1 / options.pulsefreq) * 1000;

    for (count = 0; count < steps; count += 1) {
      now = new Date();
      next = new Date(last.getTime() + wait);
      if ((next - now) > 0) {
        debug('STEPPER: Waiting %d ms until next step', next - now);
        sleep(Math.floor(next - now));
      }
      oneStepSync(dir);
      last = next;
    }

    return { steps: count, dir, duration: ((new Date()).getTime()) - startTime };
  };

  /**
   * Release the stepper motor asynchronously.
   *
   * Stops applying current to the motor coils.
   *
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {Callback} cb Node style callback
   */
  const release = function release(cb = isRequired()) {
    debug('RELEASE STEPPER: Cutting power from motor coils.');

    pulse({
      PWMA: 0, PWMB: 0, AIN2: 0, BIN1: 0, AIN1: 0, BIN2: 0,
    }, cb);
  };

  /**
   * Release the stepper motor synchronously.
   * Stops applying current to the motor coils.
   *
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   */
  const releaseSync = function releaseSync() {
    debug('RELEASE STEPPER: Cutting power from motor coils.');

    pulseSync({
      PWMA: 0, PWMB: 0, AIN2: 0, BIN1: 0, AIN1: 0, BIN2: 0,
    });
  };

  /**
   * Set the current rate at which to supply the steps.
   * Provide a number from 0 to 1 and the current will be reduced proportionally
   *
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {Number} current Current rate, from 0 to 1.
   */
  const setCurrent = function setCurrent(current) {
    currentspec.validate({ current }, errHdlr);
    options.current = current;

    debug(`STEPPER CONFIG: Motor current set to ${current * 100}%`);
  };

  /**
   * Initialize the Stepeper controller instance.
   *
   * @instance
   * @memberOf module:MotorHat/Stepper~stepper
   * @param {callback} [cb] Optional node style callback for asynch initialization
   * @returns {module:MotorHat/Stepper~stepper} Returns init'd Stepper controller object (self),
   * either directly or in second parameter to callback if callback provided, to enable chaining.
   */
  const init = function init(cb) {
    setMicrosteps(options.microsteps);
    setStyle(options.style);
    setCurrent(options.current);

    // Only set the speed if we're passed one in the options, maybe we only want to do single steps
    if (options.rpm || options.pps) {
      setSpeed(options);
    }

    const self = this;

    if (cb) {
      setFrequency(options.frequency, () => { cb(null, self); }); // Hz
    } else {
      setFrequencySync(options.frequency); // Hz
      return self;
    }

    return true;
  };

  /**
   * Stepper Controller Object
   * @namespace stepper
   * @see Use {@link module:MotorHat/Stepper|Stepper()} for object creation.
   * @see Use {@link module:MotorHat/Stepper~stepper#init} for object initialization.
   * @type {Object}
   */
  const stepper = {
    init,
    step,
    stepSync,
    oneStep,
    oneStepSync,
    release,
    releaseSync,
    setCurrent,
    setStyle,
    setFrequency,
    setFrequencySync,
    setMicrosteps,
    setSteps,
    setSpeed,
    options,
  };

  return Object.create(stepper);
};
