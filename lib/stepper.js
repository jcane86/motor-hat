'use strict';

module.exports = function (options) {
  if (undefined === options) {
    throw Error('We need at least the stepper channel to initialize the servo!');
  }

  let pwm = require('./pwm')();
  let microstepsCurve = [];
  let currentStep = 0;
  let stepfreq;

  // Set defaults
  options.steps = options.steps || 200;
  options.microsteps = options.microsteps || 8;
  options.freq = options.freq || 1600;
  options.style = options.style || 'double';
  options.pps = options.pps || undefined;
  options.rpm = options.rpm || undefined;

  let PWMA;
  let PWMB;
  let AIN1;
  let AIN2;
  let BIN1;
  let BIN2;

  if (options.channel === 0) {
    PWMA = 8;
    AIN2 = 9;
    AIN1 = 10;
    PWMB = 13;
    BIN2 = 12;
    BIN1 = 11;
  } else if (options.channel === 1) {
    PWMA = 2;
    AIN2 = 3;
    AIN1 = 4;
    PWMB = 7;
    BIN2 = 6;
    BIN1 = 5;
  } else {
    throw Error('Stepper channels are 0 and 1.');
  }

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

  let microStep = function (direction) {
    let microsteps = options.microsteps;
    if (direction === 'fwd') {
      currentStep += 1;
    } else if (direction === 'back') {
      currentStep -= 1;
    } else {
      throw Error('Direction should be "fwd" or "back"!');
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
    } else if ((currentStep >= microsteps * 3) && (currentStep < microsteps * 4)) {
      pwmA = microstepsCurve[currentStep - (microsteps * 3)];
      pwmB = microstepsCurve[(microsteps * 4) - currentStep];
      coils = [1, 0, 0, 1];
    }

    pwm.setPWM(PWMA, 0, pwmA * 16);
    pwm.setPWM(PWMB, 0, pwmB * 16);
    pwm.setPin(AIN2, coils[0]);
    pwm.setPin(BIN1, coils[1]);
    pwm.setPin(AIN1, coils[2]);
    pwm.setPin(BIN2, coils[3]);

    if (options.debug) {
      console.log('MICROSTEPPING: Coils state = ' + coils);
      console.log('MICROSTEPPING: PWM state = ' + [pwmA, pwmB]);
    }
  };

  let doubleStep = function (dir) {
    let microsteps = options.microsteps;
    let pwmA = 255;
    let pwmB = 255;

    if ((Math.floor(currentStep / (microsteps / 2)) + 1) % 2) {
      // we're at an even half step, go to next odd
      if (dir === 'fwd') {
        currentStep += microsteps / 2;
      } else if (dir === 'back') {
        currentStep -= microsteps / 2;
      } else {
        throw Error('Direction should be "fwd" or "back"!');
      }
    } else
      // go to next odd half step
      if (dir === 'fwd') {
        currentStep += microsteps;
      } else if (dir === 'back') {
        currentStep -= microsteps;
      } else {
        throw Error('Direction should be "fwd" or "back"!');
      }

    // go to next 'step' and wrap around
    currentStep += microsteps * 4;
    currentStep %= microsteps * 4;

    // set up coils
    let coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    if (options.debug) {
      console.log('DOUBLE STEPPING: Coils state = ' + coils);
    }

    pwm.setPWM(PWMA, 0, pwmA * 16);
    pwm.setPWM(PWMB, 0, pwmB * 16);
    pwm.setPin(AIN2, coils[0]);
    pwm.setPin(BIN1, coils[1]);
    pwm.setPin(AIN1, coils[2]);
    pwm.setPin(BIN2, coils[3]);
  };

  let singleStep = function (dir) {
    let microsteps = options.microsteps;
    let pwmA = 255;
    let pwmB = 255;

    if ((Math.floor(currentStep / (microsteps / 2)) % 2)) {
      // we're at an odd half step, go to next even
      if (dir === 'fwd') {
        currentStep += microsteps / 2;
      } else if (dir === 'back') {
        currentStep -= microsteps / 2;
      } else {
        throw Error('Direction should be "fwd" or "back"!');
      }
    } else
      // go to next even half step
      if (dir === 'fwd') {
        currentStep += microsteps;
      } else if (dir === 'back') {
        currentStep -= microsteps;
      } else {
        throw Error('Direction should be "fwd" or "back"!');
      }

    // go to next 'step' and wrap around
    currentStep += microsteps * 4;
    currentStep %= microsteps * 4;

    // set up coils
    let coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    if (options.debug) {
      console.log('SINGLE STEPPING: Coils state = ' + coils);
    }

    pwm.setPWM(PWMA, 0, pwmA * 16);
    pwm.setPWM(PWMB, 0, pwmB * 16);
    pwm.setPin(AIN2, coils[0]);
    pwm.setPin(BIN1, coils[1]);
    pwm.setPin(AIN1, coils[2]);
    pwm.setPin(BIN2, coils[3]);
  };

  let interleavedStep = function (dir) {
    let microsteps = options.microsteps;
    let pwmA = 255;
    let pwmB = 255;

    if (dir === 'fwd') {
      currentStep += microsteps / 2;
    } else if (dir === 'back') {
      currentStep -= microsteps / 2;
    } else {
      throw Error('Direction should be "fwd" or "back"!');
    }

    // go to next 'step' and wrap around
    currentStep += microsteps * 4;
    currentStep %= microsteps * 4;

    // set up coils
    let coils = step2coils[Math.floor(currentStep / (microsteps / 2))];

    if (options.debug) {
      console.log('INTERLEAVED STEPPING: Coils state = ' + coils);
    }

    pwm.setPWM(PWMA, 0, pwmA * 16);
    pwm.setPWM(PWMB, 0, pwmB * 16);
    pwm.setPin(AIN2, coils[0]);
    pwm.setPin(BIN1, coils[1]);
    pwm.setPin(AIN1, coils[2]);
    pwm.setPin(BIN2, coils[3]);
  };

  let setStyle = function (style) {
    if (['single', 'double', 'interleaved', 'microstep'].indexOf(style) > -1) {
      options.style = style;
      if (options.debug) {
        console.log('Style set to: "' + options.style + '"');
      }
    } else {
      throw Error('Stepping style not recognized! Use single, double, interleaved or microstep.');
    }
  };

  let setFrequency = function (freq) {
    if (!isNaN(parseFloat(freq)) && isFinite(freq)) {
      options.frequency = freq;
      pwm.setPWMFreq(options.frequency);
      if (options.debug) {
        console.log('PWM Frequency set to: ' + options.frequency);
      }
    } else {
      throw Error('Frequency must be numerical');
    }
  };

  let setMicrosteps = function (ms) {
    if ([8, 16].indexOf(ms) > -1) {
      options.microsteps = ms;
      if (options.debug) {
        console.log('Microsteps set to: ' + options.microsteps);
      }
      if (options.microsteps === 8) {
        microstepsCurve = [0, 50, 98, 142, 180, 212, 236, 250, 255];
      } else {
        microstepsCurve = [0, 25, 50, 74, 98, 120, 141, 162, 180, 197, 212, 225, 236, 244, 250, 253, 255];
      }
    } else {
      throw Error('Available microsteps are 8 and 16.');
    }
  };

  let setSpeed = function (speed) {
    if ((speed.rpm === undefined && speed.pps === undefined) || (speed.rpm && speed.pps)) {
      throw Error('please define speed in either rpm or pps (pulses per second).');
    }
    if (speed.rpm === undefined) {
      stepfreq = speed.pps;
    } else {
      stepfreq = 60 / (speed.rpm * speed.steps);
    }

    if (options.debug) {
      console.log('Step frequency set to ' + stepfreq);
    }
  };

  let oneStepSync = function (dir) {
    if (options.style === 'microstep') {
      microStep(dir);
    } else if (options.style === 'single') {
      singleStep(dir);
    } else if (options.style === 'double') {
      doubleStep(dir);
    } else if (options.style === 'interleaved') {
      interleavedStep(dir);
    }
  };

  let stepSync = function (dir, steps) {
    var last = new Date();
    var now = last;

    for (let i = 0; i < steps; i++) {
      require('sleep').usleep(Math.round(1 / stepfreq * 1000000));
      oneStepSync(dir);
      if (options.debug) {
        now = new Date();
        console.log('Step sent after ' + (now - last) + ' msecs.');
        last = now;
      }
    }
  };

  setMicrosteps(options.microsteps);
  setFrequency(options.freq); // Hz
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
