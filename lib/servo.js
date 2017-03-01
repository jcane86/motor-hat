'use strict';

const debug = require('debug')('motor-hat:servolib');
const parambulator = require('parambulator');

const errHdlr = function errHdlr(err) {
  if (err) {
    throw new Error(err);
  }
};

module.exports = function exports(options) {
  const posspec = parambulator({
    pos: {
      type$: 'number',
      min$: 0,
      max$: 100,
    },
  });
  const optspec = parambulator({
    pin: {
      type$: 'number',
      required$: true,
      notempty: true,
      min$: 0,
      max$: 15,
    },
    pwm: 'object$, required$, notempty$',
    min: {
      type$: 'number',
      default$: 0.7,
    },
    max: {
      type$: 'number',
      default$: 3.2,
    },
    freq: {
      type$: 'number',
      default$: 50,
    },
  });

  optspec.validate(options, errHdlr);

  let minCount;
  let maxCount;

  const calculateMinMax = function calculateMinMax() {
    minCount = (options.min * options.freq * 4096) / 1000;
    maxCount = (options.max * options.freq * 4096) / 1000;
  };

  const moveTo = function moveTo(pos) {
    posspec.validate({ pos }, errHdlr);
    const count = minCount + ((pos / 100) * (maxCount - minCount));

    options.pwm.setPWMFreq(options.freq);
    options.pwm.setPWM(options.pin, 0, count);
    debug(`moveTo(): Moved servolib to position ${pos}% = ${count} counts.`);
  };

  /**
   * Calibrate the limits for the servolib
   * @param freq The update freq in Hz
   * @param min  The min. pulse in ms
   * @param max  The max. pulse in ms
   */
  const calibrate = function calibrate(freq, min, max) {
    options.freq = freq;
    options.min = min;
    options.max = max;
    calculateMinMax();
    debug('calibrate(): Set new Servo Update Freq: %d', options.freq);
    debug(`calibrate(): Set new minimum pulse ${options.min} ms = ${minCount} counts.`);
    debug(`calibrate(): Set new maximum pulse ${options.max} ms = ${maxCount} counts.`);
  };

  calculateMinMax();

  return {
    moveTo,
    calibrate,
  };
};
