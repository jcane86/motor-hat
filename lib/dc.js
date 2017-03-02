'use strict';

let debug = require('debug')('motor-hat:dclib');
let parambulator = require('parambulator');
let errHdlr = function (err) {
  if (err) {
    throw new Error(err);
  }
};

module.exports = function (options) {
  let freqspec = parambulator({freq: 'number$, required$'});
  let dirspec = parambulator({dir: {
    enum$: ['fwd', 'back'],
    required$: true}});
  let speedspec = parambulator({speed: {
    type$: 'number',
    min$: 0,
    max$: 100}});
  let optspec = parambulator({
    pwm: 'required$, notempty$',
    pins: {
      required$: true,
      notempty$: true,
      minlen$: 3,
      maxlen$: 3,
      '*': {
        type$: 'number',
        min$: 0,
        max$: 15
      }
    },
    speed: {
      type$: 'number',
      min$: 0,
      max$: 100,
      default$: 100
    },
    frequency: {
      type$: 'number',
      default$: 1600
    }
  });

  optspec.validate(options, errHdlr);

  let pwm = options.pwm;

  let PWM = options.pins.PWM || options.pins[0];
  let IN1 = options.pins.IN1 || options.pins[1];
  let IN2 = options.pins.IN2 || options.pins[2];

  debug('DC Motor Init: pins set to: ' + [PWM, IN1, IN2]);

  let run = function (command) {
    dirspec.validate({dir: command}, errHdlr);
    if (command === 'fwd') {
      debug('DC run(): Going FWD');
      pwm.setPin(IN2, 0);
      pwm.setPin(IN1, 1);
    } else {
      debug('DC run(): Going BACK');
      pwm.setPin(IN1, 0);
      pwm.setPin(IN2, 1);
    }
  };

  let stop = function () {
    debug('DC run(): Releasing motor');
    pwm.setPin(IN1, 0);
    pwm.setPin(IN2, 0);
  };

  let setSpeed = function (speed) {
    speedspec.validate({speed: speed}, errHdlr);
    debug('DC setSpeed(): Setting speed to %d%%', speed);
    pwm.setPWM(PWM, 0, speed / 100 * 4080);
  };

  let setFrequency = function (freq) {
    freqspec.validate({freq: freq}, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreq(options.frequency);
    debug('PWM Frequency set to: ' + options.frequency);
  };

  setFrequency(options.frequency); // Hz
  setSpeed(options.speed);

  return {
    run: run,
    stop: stop,
    setSpeed: setSpeed,
    setFrequency: setFrequency
  };
};
