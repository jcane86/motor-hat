# motor-hat [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url] [![semantic-release][semrel-image]][semrel-url] [![Commitizen friendly][commitizen-image]][commitizen-url]
> Node Module to control Adafruit's MotorHAT for the Raspberry Pi

## Installation

```sh
$ npm install --save motor-hat
```

## Usage

```js
// get a motor-hat instance with the following initialized:
// * a stepper with winding one on 'M1' and winding two on 'M2' ports
// * a dc motor on port 'M4'
// * a servo on channel 0
// * a servo on channel 14
let spec = {
    steppers: [['M1', 'M2']],
    dcs: ['M4'],
    servos: [0,14]
};
var motorHat = require('motor-hat')(spec);

// For steppers, set speed in rpm or pps (pulses per second) or sps (steps per second).
// To set it in rpm, set you steps/rev first (default 200)
// If you set it in pps, the speed will not be constant for different styles or number of microsteps.
motorHat.steppers[0].setSteps(2048);
motorHat.steppers[0].setSpeed({rpm:20});
// Supported syles are 'single', 'double', 'interleaved', and 'microstep'
motorHat.steppers[0].setStyle('double');
// stepSync and oneStepSync take number of steps/halfsteps/microsteps as input, 
// depending on selected style. To do 8 full steps fwd, 4 back:
motorHat.steppers[0].stepSync('fwd', 8);
motorHat.steppers[0].stepSync('back', 4);

// Supported syles are 'single', 'double', 'interleaved', and 'microstep'
motorHat.steppers[0].setStyle('microstep');
// Supported number of microsteps are 8 and 16 (8 by default)
motorHat.steppers[0].setMicrosteps(16);
// stepSync and oneStepSync take number of steps/halfsteps/microsteps as input, 
// depending on selected style. To do 16 microsteps fwd:
motorHat.steppers[0].stepSync('back', 16);


// Calibrate the servo output. Pass in PWM frequency, position 0 pulse duration in ms,
// position 100 pulse duration in ms.
motorHat.servos[0].calibrate(50, 1, 2);
// Move to position 0
motorHat.servos[0].moveTo(0);
// Move to position 100
motorHat.servos[0].moveTo(100);


// Start dc motor forward (by default at 100% speed)
motorHat.dcs[0].run('fwd');
// Set DC motor speed to 50%
motorHat.dcs[0].setSpeed(50);
// reverse the dc motor to back direction
motorHat.dcs[0].run('back');
// stop the dc motor
motorHat.dcs[0].stop();
```
## License

MIT © [J. Cane](www.github.com/jcane86)


[npm-image]: https://badge.fury.io/js/motor-hat.svg
[npm-url]: https://npmjs.org/package/motor-hat
[travis-image]: https://travis-ci.org/jcane86/motor-hat.svg?branch=master
[travis-url]: https://travis-ci.org/jcane86/motor-hat
[daviddm-image]: https://david-dm.org/jcane86/motor-hat.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/jcane86/motor-hat
[coveralls-image]: https://coveralls.io/repos/github/jcane86/motor-hat/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/jcane86/motor-hat?branch=master
[semrel-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semrel-url]: https://github.com/semantic-release/semantic-release
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
