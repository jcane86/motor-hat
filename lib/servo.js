'use strict';

module.exports = function (options) {
  if (undefined === options || undefined === options.channel || undefined === options.pwm) {
    throw Error('We need at least the servo channel and pwm instance to initialize the servo!');
  }

  let pwm = options.pwm;
  let minPulse = options.min || 0.7; // msec
  let maxPulse = options.max || 3.2; // msec
  let frequency = options.freq || 50; // Hz
  let minCount;
  let maxCount;

  let calculateMinMax = function () {
    minCount = (minPulse * frequency * 4096) / 1000;
    maxCount = (maxPulse * frequency * 4096) / 1000;
  };

  if ([0, 1, 14, 15].indexOf(options.channel) < 0) {
    throw Error('Servo channels are 0, 1, 14 and 15.');
  }

  let moveTo = function (pos) {
    if (pos < 0 || pos > 100) {
      throw Error('Position should be expressed from 0 to 100.');
    }
    pos /= 100; // it's a percentage
    var count = minCount + (pos * (maxCount - minCount));

    pwm.setPWMFreq(frequency);
    pwm.setPWM(options.channel, 0, count);
  };

  /**
   * Calibrate the limits for the servo
   * @param freq The update freq in Hz
   * @param min  The min. pulse in ms
   * @param max  The max. pulse in ms
   */
  let calibrate = function (freq, min, max) {
    frequency = freq;
    minPulse = min;
    maxPulse = max;
    calculateMinMax();
  };

  calculateMinMax();

  return {
    moveTo: moveTo,
    calibrate: calibrate
  };
};
