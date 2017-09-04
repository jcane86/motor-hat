'use strict';

const debug = require('debug')('motor-hat:dclib');
const parambulator = require('parambulator');

const errHdlr = function errHdlr(err) {
  if (err) {
    throw new Error(err);
  }
};

module.exports = function exports(options) {
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

  optspec.validate(options, errHdlr);

  const [pwm] = [options.pwm];

  const PWM = options.pins.PWM || options.pins[0];
  const IN1 = options.pins.IN1 || options.pins[1];
  const IN2 = options.pins.IN2 || options.pins[2];

  debug(`DC Motor Init: pins set to: ${[PWM, IN1, IN2]}`);

  const run = function run(dir) {
    dirspec.validate({ dir }, errHdlr);
    if (dir === 'fwd') {
      debug('DC run(): Going FWD');
      pwm.setPin(IN2, 0);
      pwm.setPin(IN1, 1);
    } else {
      debug('DC run(): Going BACK');
      pwm.setPin(IN1, 0);
      pwm.setPin(IN2, 1);
    }
  };

  const stop = function stop() {
    debug('DC run(): Releasing motor');
    pwm.setPin(IN1, 0);
    pwm.setPin(IN2, 0);
  };

  const setSpeed = function setSpeed(speed) {
    speedspec.validate({ speed }, errHdlr);
    debug('DC setSpeed(): Setting speed to %d%%', speed);
    pwm.setPWM(PWM, 0, (speed / 100) * 4080);
  };

  const setFrequency = function setFrequency(freq) {
    freqspec.validate({ freq }, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreq(options.frequency);
    debug(`PWM Frequency set to: ${options.frequency}`);
  };

  setFrequency(options.frequency); // Hz
  setSpeed(options.speed);

  return {
    run,
    stop,
    setSpeed,
    setFrequency,
  };
};
