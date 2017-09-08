'use strict';

const debug = require('debug')('motor-hat:dclib');
const parambulator = require('parambulator');
const async = require('async');

const errHdlr = function errHdlr(err) {
  if (err) {
    throw new Error(err);
  }
};

const isRequired = () => { throw new Error('Async functions require callback'); };

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
      pwm.setPin.bind(null, pinLow, 0),
      pwm.setPin.bind(null, pinHigh, 1),
    ], cb);
  };

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

  const stop = function stop(cb = isRequired()) {
    debug('DC run(): Releasing motor');
    async.series([
      pwm.setPin.bind(null, IN1, 0),
      pwm.setPin.bind(null, IN2, 0),
    ], cb);
  };

  const stopSync = function stopSync() {
    debug('DC run(): Releasing motor');
    pwm.setPinSync(IN1, 0);
    pwm.setPinSync(IN2, 0);
  };

  const setSpeed = function setSpeed(speed, cb = isRequired()) {
    speedspec.validate({ speed }, errHdlr);
    debug('DC setSpeed(): Setting speed to %d%%', speed);
    pwm.setPWM(PWM, 0, (speed / 100) * 4080, cb);
  };

  const setSpeedSync = function setSpeedSync(speed) {
    speedspec.validate({ speed }, errHdlr);
    debug('DC setSpeed(): Setting speed to %d%%', speed);
    pwm.setPWMSync(PWM, 0, (speed / 100) * 4080);
  };

  const setFrequency = function setFrequency(freq, cb = isRequired()) {
    freqspec.validate({ freq }, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreq(options.frequency, (err, res) => {
      debug(`PWM Frequency set to: ${options.frequency}`);
      cb(err, res);
    });
  };

  const setFrequencySync = function setFrequencySync(freq) {
    freqspec.validate({ freq }, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreqSync(options.frequency);
    debug(`PWM Frequency set to: ${options.frequency}`);
  };


  const init = function init(cb) {
    if (cb) {
      const self = this;
      async.series(
        [
          setFrequency.bind(null, options.frequency), // Hz
          setSpeed.bind(null, options.speed),
        ],
        (err) => { cb(err, self); },
      );
    } else {
      setFrequencySync(options.frequency); // Hz
      setSpeedSync(options.speed);
      return this;
    }
  };

  return {
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
};
