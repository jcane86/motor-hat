'use strict';
let debug = require('debug')('motor-hat:stepperlib');
let parambulator = require('parambulator');
let errHdlr = function (err) {
  if (err) {
    throw new Error(err);
  }
};

module.exports = function (options) {
  let dirspec = parambulator({dir: {
    enum$: ['fwd', 'back'],
    required$: true}});
  let stylespec = parambulator({style: {
    enum$: ['single', 'double', 'interleaved', 'microstep'],
    required$: true}});
  let freqspec = parambulator({freq: 'number$, required$'});
  let msspec = parambulator({ms: {
    enum$: [8, 16],
    required$: true}});
  let speedspec = parambulator({
    exactlyone$: ['pps', 'rpm'],
    pps: 'number$',
    rpm: 'number$'
  });
  let optspec = parambulator({
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
          max$: 15
        }
      },
      W2: {
        required$: true,
        minlen$: 3,
        maxlen$: 3,
        '*': {
          type$: 'number',
          min$: 0,
          max$: 15
        }
      }
    },
    steps: {
      type$: 'number',
      default$: 64 * 32
    },
    microsteps: {
      enum$: [8, 16],
      default$: 8
    },
    frequency: {
      type$: 'number',
      default$: 1600
    },
    style: {
      enum$: ['single', 'double', 'interleaved', 'microstep'],
      default$: 'double'
    },
    atmostone$: ['pps', 'rpm'],
    pps: 'number$',
    rpm: 'number$'
  });

  optspec.validate(options, errHdlr);

  let pwm = options.pwm;
  let microstepsCurve = [];
  let currentStep = 0;
  let stepfreq;
  let state = {};

  let pins = {};
  pins.PWMA = options.pins.W1.PWM || options.pins.W1[0];
  pins.AIN1 = options.pins.W1.IN1 || options.pins.W1[1];
  pins.AIN2 = options.pins.W1.IN2 || options.pins.W1[2];
  pins.PWMB = options.pins.W2.PWM || options.pins.W2[0];
  pins.BIN1 = options.pins.W2.IN1 || options.pins.W2[1];
  pins.BIN2 = options.pins.W2.IN2 || options.pins.W2[2];

  debug('Stepper Init: pins set to: ' + [pins.PWMA, pins.AIN1, pins.AIN2, pins.PWMB, pins.BIN1, pins.BIN2]);

  // We only actually send the commands if the state is changing
  let lazyPWM = function (pin, newState) {
    if (undefined === state[pin] || state[pin] !== newState) {
      pwm.setPWM(pins[pin], 0, newState);
      state[pin] = newState;
    }
  };

  let lazyPin = function (pin, newState) {
    if (undefined === state[pin] || state[pin] !== newState) {
      pwm.setPin(pins[pin], newState);
      state[pin] = newState;
    }
  };

  let step2coils = [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 1],
    [1, 0, 0, 1]
  ];

  let microStep = function (dir) {
    dirspec.validate({dir: dir}, errHdlr);

    let microsteps = options.microsteps;

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

    lazyPWM('PWMA', pwmA * 16);
    lazyPWM('PWMB', pwmB * 16);
    lazyPin('AIN2', coils[0]);
    lazyPin('BIN1', coils[1]);
    lazyPin('AIN1', coils[2]);
    lazyPin('BIN2', coils[3]);

    debug('MICROSTEPPING: Coils state = ' + coils);
    debug('MICROSTEPPING: PWM state = ' + [pwmA, pwmB]);
  };

  let doubleStep = function (dir) {
    dirspec.validate({dir: dir}, errHdlr);

    let microsteps = options.microsteps;
    let pwmA = 255;
    let pwmB = 255;

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
    let coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    debug('DOUBLE STEPPING: Coils state = ' + coils);

    lazyPWM('PWMA', pwmA * 16);
    lazyPWM('PWMB', pwmB * 16);
    lazyPin('AIN2', coils[0]);
    lazyPin('BIN1', coils[1]);
    lazyPin('AIN1', coils[2]);
    lazyPin('BIN2', coils[3]);
  };

  let singleStep = function (dir) {
    dirspec.validate({dir: dir}, errHdlr);

    let microsteps = options.microsteps;
    let pwmA = 255;
    let pwmB = 255;

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
    let coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    debug('SINGLE STEPPING: Coils state = ' + coils);

    lazyPWM('PWMA', pwmA * 16);
    lazyPWM('PWMB', pwmB * 16);
    lazyPin('AIN2', coils[0]);
    lazyPin('BIN1', coils[1]);
    lazyPin('AIN1', coils[2]);
    lazyPin('BIN2', coils[3]);
  };

  let interleavedStep = function (dir) {
    dirspec.validate({dir: dir}, errHdlr);

    let microsteps = options.microsteps;
    let pwmA = 255;
    let pwmB = 255;

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
    let coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    debug('INTERLEAVED STEPPING: Coils state = ' + coils);

    lazyPWM('PWMA', pwmA * 16);
    lazyPWM('PWMB', pwmB * 16);
    lazyPin('AIN2', coils[0]);
    lazyPin('BIN1', coils[1]);
    lazyPin('AIN1', coils[2]);
    lazyPin('BIN2', coils[3]);
  };

  let setStyle = function (style) {
    stylespec.validate({style: style}, errHdlr);
    options.style = style;
    debug('Style set to: "' + options.style + '"');
  };

  let setFrequency = function (freq) {
    freqspec.validate({freq: freq}, errHdlr);
    options.frequency = freq;
    pwm.setPWMFreq(options.frequency);
    debug('PWM Frequency set to: ' + options.frequency);
  };

  let setMicrosteps = function (ms) {
    msspec.validate({ms: ms}, errHdlr);
    options.microsteps = ms;
    debug('Microsteps set to: ' + options.microsteps);
    if (options.microsteps === 8) {
      microstepsCurve = [0, 50, 98, 142, 180, 212, 236, 250, 255];
    } else {
      microstepsCurve = [0, 25, 50, 74, 98, 120, 141, 162, 180, 197, 212, 225, 236, 244, 250, 253, 255];
    }
  };

  let setSpeed = function (speed) {
    speedspec.validate(speed, errHdlr);

    if (speed.rpm === undefined) {
      stepfreq = speed.pps;
    } else {
      stepfreq = (speed.rpm * options.steps) / 60;
    }
    debug('Step frequency set to ' + stepfreq);
  };

  let oneStepSync = function (dir) {
    if (options.style === 'microstep') {
      microStep(dir);
    } else if (options.style === 'single') {
      singleStep(dir);
    } else if (options.style === 'interleaved') {
      interleavedStep(dir);
    } else { // if (options.style === 'double')
      doubleStep(dir);
    }
  };

  let stepSync = function (dir, steps) {
    var last = new Date();
    var now = last;
    var next;

    if (undefined === stepfreq) {
      setSpeed(options);
    }

    let wait = (1 / stepfreq) * 1000;

    while (steps--) {
      now = new Date();
      next = new Date(last.getTime() + wait);
      if ((next - now) > 0) {
        debug('STEPPER: Waiting %d ms until next step', next - now);
        require('sleep').msleep(next - now);
      }
      oneStepSync(dir);
      last = now;
    }
  };

  setMicrosteps(options.microsteps);
  setFrequency(options.frequency); // Hz
  setStyle(options.style);
  // Only set the speed if we're passed one in the options, maybe we only want to do single steps
  if (options.rpm || options.pps) {
    setSpeed(options);
  }

  return {
    stepSync: stepSync,
    oneStepSync: oneStepSync,
    setStyle: setStyle,
    setFrequency: setFrequency,
    setMicrosteps: setMicrosteps,
    setSpeed: setSpeed
  };
};
