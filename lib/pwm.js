'use strict';

const async = require('async');
const rpi = require('raspi-ver');
const debug = require('debug')('motor-hat:pwmlib');
const parambulator = require('parambulator');
const sleep = require('sleep').msleep;

const errHdlr = function errHdlr(err) {
  if (err) {
    debug('%s', err);
    throw new Error(err);
  }
};

/* eslint "no-bitwise": "off" */

const isRequired = () => { throw new Error('Async functions require callback'); };

// # ============================================================================
// # Adapted from:
// #    Adafruit PCA9685 16-Channel PWM Servo Driver
// #    https://github.com/adafruit/Adafruit-Motor-HAT-Python-Library
// # ============================================================================

module.exports = function exports(options) {
  const freqspec = parambulator({
    freq: {
      required$: true,
      type$: 'number',
    },
  });
  const onoffspec = parambulator({
    on: {
      required$: true,
      type$: 'number',
      min$: 0,
      max$: 4096,
    },
    off: {
      required$: true,
      type$: 'number',
      min$: 0,
      max$: 4096,
    },
  });
  const statespec = parambulator({
    state: {
      enum$: [0, 1],
      required$: true,
    },
  });
  const channelspec = parambulator({
    channel: {
      type$: 'number',
      min$: 0,
      max$: 15,
      required$: true,
    },
  });
  const optspec = parambulator({
    i2c: 'object$, required$, notempty$',
    address: {
      default$: 0x6F,
    },
    busnum: {
      type$: 'number',
      default$: rpi.i2c,
    },
  });

  optspec.validate(options, errHdlr);

  const [i2c] = [options.i2c];
  let bus;

  const registers = {
    MODE1: 0x00,
    MODE2: 0x01,
    SUBADR1: 0x02,
    SUBADR2: 0x03,
    SUBADR3: 0x04,
    PRESCALE: 0xFE,
    LED0_ON_L: 0x06,
    LED0_ON_H: 0x07,
    LED0_OFF_L: 0x08,
    LED0_OFF_H: 0x09,
    ALL_LED_ON_L: 0xFA,
    ALL_LED_ON_H: 0xFB,
    ALL_LED_OFF_L: 0xFC,
    ALL_LED_OFF_H: 0xFD,
  };

  const bits = {
    RESTART: 0x80,
    SLEEP: 0x10,
    ALLCALL: 0x01,
    INVRT: 0x10,
    OUTDRV: 0x04,
  };

  const softwareReset = function softwareReset(cb = isRequired()) {
    // Sends a software reset (SWRST) command to all the servolib drivers on the bus
    bus.sendByte(0x00, 0x06, cb);
  };

  const softwareResetSync = function softwareResetSync() {
    // Sends a software reset (SWRST) command to all the servolib drivers on the bus
    bus.sendByteSync(0x00, 0x06);
  };

  const setPWMFreq = function setPWMFreq(freq, cb = isRequired()) {
    freqspec.validate({ freq }, errHdlr);
    // Sets the PWM frequency"
    let prescaleval = 25000000.0; // 25MHz
    prescaleval /= 4096.0; // 12 - bit
    prescaleval /= freq;
    prescaleval -= 1.0;

    debug('Setting PWM frequency to %d Hz', freq);
    debug('Estimated pre-scale: %d', prescaleval);

    const prescale = Math.ceil(prescaleval);
    debug('Final pre-scale: %d', prescale);

    bus.readByte(options.address, registers.MODE1, (err, res) => {
      if (err) { cb(err); }
      const oldmode = res;
      const newmode = (oldmode & 0x7F) | 0x10; // sleep
      async.series(
        [
          bus.writeByte.bind(null, options.address, registers.MODE1, newmode), // go to sleep
          bus.writeByte.bind(null, options.address, registers.PRESCALE, Math.floor(prescale)),
          bus.writeByte.bind(null, options.address, registers.MODE1, oldmode),
        ],
        (error) => {
          if (error) { cb(error); }
          setTimeout(() => {
            bus.writeByte(
              null, options.address, registers.MODE1, oldmode | 0x80,
              cb,
            );
          }, 5);
        },
      );
    });
  };

  const setPWMFreqSync = function setPWMFreqSync(freq) {
    freqspec.validate({ freq }, errHdlr);
    // Sets the PWM frequency"
    let prescaleval = 25000000.0; // 25MHz
    prescaleval /= 4096.0; // 12 - bit
    prescaleval /= freq;
    prescaleval -= 1.0;

    debug('Setting PWM frequency to %d Hz', freq);
    debug('Estimated pre-scale: %d', prescaleval);

    const prescale = Math.ceil(prescaleval);
    debug('Final pre-scale: %d', prescale);

    const oldmode = bus.readByteSync(options.address, registers.MODE1);
    const newmode = (oldmode & 0x7F) | 0x10; // sleep
    bus.writeByteSync(options.address, registers.MODE1, newmode); // go to sleep
    bus.writeByteSync(options.address, registers.PRESCALE, Math.floor(prescale));
    bus.writeByteSync(options.address, registers.MODE1, oldmode);
    sleep(5);
    bus.writeByteSync(options.address, registers.MODE1, oldmode | 0x80);
  };

  const getPWMFreq = function getPWMFreq(cb = isRequired()) {
    bus.readByte(options.address, registers.PRESCALE, (err, result) => {
      if (err) { cb(err); }
      cb(null, 25000000 / ((result + 1) * 4096));
    });
  };

  const getPWMFreqSync = function getPWMFreqSync() {
    const prescale = bus.readByteSync(options.address, registers.PRESCALE);

    return (25000000 / ((prescale + 1) * 4096));
  };


  const setPWM = function setPWM(channel, on, off, cb = isRequired()) {
    channelspec.validate({ channel }, errHdlr);
    onoffspec.validate({ on, off }, errHdlr);

    // Sets a single PWM channel
    const offset = 4 * channel;
    async.series(
      [
        bus.writeByte.bind(null, options.address, registers.LED0_ON_L + offset, on & 0xFF),
        bus.writeByte.bind(null, options.address, registers.LED0_ON_H + offset, on >> 8),
        bus.writeByte.bind(null, options.address, registers.LED0_OFF_L + offset, off & 0xFF),
        bus.writeByte.bind(null, options.address, registers.LED0_OFF_H + offset, off >> 8),
      ],
      cb,
    );
  };

  const setPWMSync = function setPWMSync(channel, on, off) {
    channelspec.validate({ channel }, errHdlr);
    onoffspec.validate({ on, off }, errHdlr);

    // Sets a single PWM channel
    const offset = 4 * channel;
    bus.writeByteSync(options.address, registers.LED0_ON_L + offset, on & 0xFF);
    bus.writeByteSync(options.address, registers.LED0_ON_H + offset, on >> 8);
    bus.writeByteSync(options.address, registers.LED0_OFF_L + offset, off & 0xFF);
    bus.writeByteSync(options.address, registers.LED0_OFF_H + offset, off >> 8);
  };

  const setAllPWM = function setAllPWM(on, off, cb = isRequired()) {
    onoffspec.validate({ on, off }, errHdlr);
    // Sets a all PWM channels
    async.series(
      [
        bus.writeByte.bind(null, options.address, registers.ALL_LED_ON_L, on & 0xFF),
        bus.writeByte.bind(null, options.address, registers.ALL_LED_ON_H, on >> 8),
        bus.writeByte.bind(null, options.address, registers.ALL_LED_OFF_L, off & 0xFF),
        bus.writeByte.bind(null, options.address, registers.ALL_LED_OFF_H, off >> 8),
      ],
      cb,
    );
  };

  const setAllPWMSync = function setAllPWMSync(on, off) {
    onoffspec.validate({ on, off }, errHdlr);
    // Sets a all PWM channels
    bus.writeByteSync(options.address, registers.ALL_LED_ON_L, on & 0xFF);
    bus.writeByteSync(options.address, registers.ALL_LED_ON_H, on >> 8);
    bus.writeByteSync(options.address, registers.ALL_LED_OFF_L, off & 0xFF);
    bus.writeByteSync(options.address, registers.ALL_LED_OFF_H, off >> 8);
  };

  const setPin = function setPin(channel, state, cb = isRequired()) {
    channelspec.validate({ channel }, errHdlr);
    statespec.validate({ state }, errHdlr);

    if (state === 1) {
      setPWM(channel, 4096, 0, cb);
    } else {
      setPWM(channel, 0, 4096, cb);
    }
  };

  const setPinSync = function setPinSync(channel, state) {
    channelspec.validate({ channel }, errHdlr);
    statespec.validate({ state }, errHdlr);

    if (state === 1) {
      setPWMSync(channel, 4096, 0);
    } else {
      setPWMSync(channel, 0, 4096);
    }
  };

  const init = function init() {
    debug(`Initializing PWM driver on address ${options.address}`);
    // By default, the correct I2C bus is auto-detected using /proc/cpuinfo
    // Alternatively, you can pass it in the busnum options property
    bus = i2c.openSync(options.busnum, {});

    debug('Reseting PCA9685 MODE1 (without SLEEP) and MODE2');

    setAllPWMSync(0, 0);
    bus.writeByteSync(options.address, registers.MODE2, bits.OUTDRV);
    bus.writeByteSync(options.address, registers.MODE1, bits.ALLCALL);
    sleep(5); // wait for oscillator

    let mode1 = bus.readByteSync(options.address, registers.MODE1);
    mode1 &= ~bits.SLEEP; // wake up(reset sleep)

    bus.writeByteSync(options.address, registers.MODE1, mode1);
    sleep(5); // wait for oscillator
  };

  init(options);

  return {
    softwareReset,
    softwareResetSync,
    setPWM,
    setPWMSync,
    setAllPWM,
    setAllPWMSync,
    setPin,
    setPinSync,
    setPWMFreq,
    setPWMFreqSync,
    getPWMFreq,
    getPWMFreqSync,
  };
};
