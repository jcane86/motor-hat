# 🏁 motor-hat 🎩

[![Join the chat at https://gitter.im/motor-hat/Lobby](https://badges.gitter.im/motor-hat/Lobby.svg)](https://gitter.im/motor-hat/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url] [![semantic-release][semrel-image]][semrel-url] [![Commitizen friendly][commitizen-image]][commitizen-url] [![Greenkeeper badge](https://badges.greenkeeper.io/jcane86/motor-hat.svg)](https://greenkeeper.io/)

> Node Module to control Adafruit's MotorHAT for the Raspberry Pi [http://jcane86.github.io/motor-hat](http://jcane86.github.io/motor-hat)

## Installation & Basic Usage

```sh
$ npm install --save motor-hat
```
```js
var motorHat = require('motor-hat')({steppers: [{ W1: 'M1', W2: 'M2' }]}).init();
motorHat.steppers[0].setSpeed({pps:100});
motorHat.steppers[0].step('back', 2048, (err, result) => {
  if (err) return console.log('Oh no, there was an error', err);
  console.log(`Did ${result.steps} steps ${result.dir} in ${result.duration/1000} seconds. I had to retry ${result.retried} steps because you set me up quicker than your poor board can handle.`); 
});
```

## DOCS

* See the full api here: [http://jcane86.github.io/motor-hat](http://jcane86.github.io/motor-hat)
* See it on GitHub here: [http://github.com/jcane86/motor-hat](http://github.com/jcane86/motor-hat)

## Notes about 2.0

Some changes will need to be made to transition to the async version of the library in 2.0:

Main library:
* Instance needs to be init()'d
* Servo and Stepper instances exposed in servos and steppers arrays are already init()'d.

DC Motors: 
* Methods are now async, and need a callback as last parameter.
* Old Sync methods remain, just call them as stopSync(), etc..
* Instance needs to be init()'d

Servo Motors:
* No changes, everything is still sync (I didn't feel it was necessary, feel free to open an issue or send a PR otherwise).

Stepper Motors:
* Most methods already had the Sync suffix. Only setFrequency is now setFrequencySync.
* Async methods added.
* Release and current methods added (actually in 1.3).
* Instance needs to be init()'d

## Advanced usage

```js
// get a motor-hat instance with the following initialized:
// * a stepper with winding one on 'M1' and winding two on 'M2' ports
// * a dc motor on port 'M4'
// * a servo on channel 0
// * a servo on channel 14
let spec = {
    steppers: [{ W1: 'M1', W2: 'M2' }],
    dcs: ['M4'],
    servos: [0,14]
};
var motorHat = require('motor-hat')(spec);

// Since MotorHat 2.0, the instance needs to be initialized.
// This is to enable async initialization, feel free to open an issue if this is a pain.
motorHat.init();

// For steppers, set speed in rpm or pps (pulses per second) or sps (steps per second).
// To set it in rpm, set you steps/rev first (default 200)
// If you set it in pps, the speed will not be constant for different styles or number of microsteps.
motorHat.steppers[0].setSteps(2048);
motorHat.steppers[0].setSpeed({rpm:5});

// Move the motor one full turn fwds synchronously, one back async.
// step[Sync] and oneStep[Sync] take number of steps as input, 
// depending on selected style. To do 2048 full steps fwd (sync), 2048 back (async):
motorHat.steppers[0].stepSync('fwd', 2048);
motorHat.steppers[0].step('back', 2048, function(err, result) {
  if (err) {
    console.log('Oh no, there was an error');
  } else {
    // Move on..
  }
});
```

## Further configuration
```js
// Supported syles are 'single', 'double' (default), 'interleaved', and 'microstep'
motorHat.steppers[0].setStyle('microstep');
// Supported number of microsteps are 8 and 16 (8 by default)
motorHat.steppers[0].setMicrosteps(16);
// step[Sync] and oneStep[Sync] take number of steps/halfsteps/microsteps as input, 
// depending on selected style. To do 16 microsteps fwd:
motorHat.steppers[0].stepSync('back', 16);
// Set current at 50% to avoid overheating or to run at lower torques
motorHat.steppers[0].setCurrent(0.5);
// Release motor after moving it to avoid overheating or to let it move freely.
motorHat.steppers[0].release((err) => !err && console.log("IT'S FREE!!"));


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

MIT © [J. Cane](https://www.github.com/jcane86)


[npm-image]: https://badge.fury.io/js/motor-hat.svg
[npm-url]: https://npmjs.org/package/motor-hat
[travis-image]: https://travis-ci.org/jcane86/motor-hat.svg?branch=master
[travis-url]: https://travis-ci.org/jcane86/motor-hat
[daviddm-image]: https://david-dm.org/jcane86/motor-hat.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/jcane86/motor-hat
[coveralls-image]: https://img.shields.io/coveralls/jcane86/motor-hat/master.svg
[coveralls-url]: https://coveralls.io/github/jcane86/motor-hat?branch=master
[semrel-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semrel-url]: https://github.com/semantic-release/semantic-release
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
