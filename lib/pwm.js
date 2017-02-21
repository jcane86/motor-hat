'use strict';
let rpi = require('raspi-ver');
let debug = require('debug')('motor-hat:pwmlib');
let parambulator = require('parambulator');
let errHdlr = function (err) {
  if (err) {
    debug('%s', err);
    throw new Error(err);
  }
};

// # ============================================================================
// # Adapted from:
// #    Adafruit PCA9685 16-Channel PWM Servo Driver
// #    https://github.com/adafruit/Adafruit-Motor-HAT-Python-Library
// # ============================================================================

module.exports = function (options) {
  let freqspec = parambulator({
    freq: {
      required$: true,
      type$: 'number'
    }
  });
  let onoffspec = parambulator({
    on: {
      required$: true,
      type$: 'number',
      min$: 0,
      max$: 4096
    },
    off: {
      required$: true,
      type$: 'number',
      min$: 0,
      max$: 4096
    }
  });
  let statespec = parambulator({
    state: {
      enum$: [0, 1],
      required$: true
    }
  });
  let channelspec = parambulator({
    channel: {
      type$: 'number',
      min$: 0,
      max$: 15,
      required$: true
    }
  });
  let optspec = parambulator({
    i2c: 'object$, required$, notempty$',
    address: {
      default$: 0x6F
    },
    busnum: {
      type$: 'number',
      default$: rpi.i2c
    }
  });

  optspec.validate(options, errHdlr);

  let i2c = options.i2c;
  let sleep = require('sleep').msleep;
  let bus;

  let registers = {
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
    ALL_LED_OFF_H: 0xFD
  };

  let bits = {
    RESTART: 0x80,
    SLEEP: 0x10,
    ALLCALL: 0x01,
    INVRT: 0x10,
    OUTDRV: 0x04
  };

  let softwareReset = function () {
    // Sends a software reset (SWRST) command to all the servolib drivers on the bus
    bus.sendByteSync(0x00, 0x06);
  };

  let setPWMFreq = function (freq) {
    freqspec.validate({freq: freq}, errHdlr);
    // Sets the PWM frequency"
    var prescaleval = 25000000.0; // 25MHz
    prescaleval /= 4096.0; // 12 - bit
    prescaleval /= freq;
    prescaleval -= 1.0;

    debug('Setting PWM frequency to %d Hz', freq);
    debug('Estimated pre-scale: %d', prescaleval);

    var prescale = Math.ceil(prescaleval);
    debug('Final pre-scale: %d', prescale);

    var oldmode = bus.readByteSync(options.address, registers.MODE1);
    var newmode = (oldmode & 0x7F) | 0x10; // sleep
    bus.writeByteSync(options.address, registers.MODE1, newmode); // go to sleep
    bus.writeByteSync(options.address, registers.PRESCALE, Math.floor(prescale));
    bus.writeByteSync(options.address, registers.MODE1, oldmode);
    sleep(5);
    bus.writeByteSync(options.address, registers.MODE1, oldmode | 0x80);
  };

  let getPWMFreq = function () {
    var prescale = bus.readByteSync(options.address, registers.PRESCALE);

    return (25000000 / ((prescale + 1) * 4096));
  };

  let setPWM = function (channel, on, off) {
    channelspec.validate({channel: channel}, errHdlr);
    onoffspec.validate({on: on, off: off}, errHdlr);

    // Sets a single PWM channel
    var offset = 4 * channel;
    bus.writeByteSync(options.address, registers.LED0_ON_L + offset, on & 0xFF);
    bus.writeByteSync(options.address, registers.LED0_ON_H + offset, on >> 8);
    bus.writeByteSync(options.address, registers.LED0_OFF_L + offset, off & 0xFF);
    bus.writeByteSync(options.address, registers.LED0_OFF_H + offset, off >> 8);
  };

  let setAllPWM = function (on, off) {
    onoffspec.validate({on: on, off: off}, errHdlr);
    // Sets a all PWM channels
    bus.writeByteSync(options.address, registers.ALL_LED_ON_L, on & 0xFF);
    bus.writeByteSync(options.address, registers.ALL_LED_ON_H, on >> 8);
    bus.writeByteSync(options.address, registers.ALL_LED_OFF_L, off & 0xFF);
    bus.writeByteSync(options.address, registers.ALL_LED_OFF_H, off >> 8);
  };

  let setPin = function (channel, state) {
    channelspec.validate({channel: channel}, errHdlr);
    statespec.validate({state: state}, errHdlr);

    if (state === 1) {
      setPWM(channel, 4096, 0);
    } else {
      setPWM(channel, 0, 4096);
    }
  };

  let init = function () {
    debug('Initializing PWM driver on address ' + options.address);
    // By default, the correct I2C bus is auto-detected using /proc/cpuinfo
    // Alternatively, you can pass it in the busnum options property
    bus = i2c.openSync(options.busnum, {});

    debug('Reseting PCA9685 MODE1 (without SLEEP) and MODE2');

    setAllPWM(0, 0);
    bus.writeByteSync(options.address, registers.MODE2, bits.OUTDRV);
    bus.writeByteSync(options.address, registers.MODE1, bits.ALLCALL);
    sleep(5); // wait for oscillator

    var mode1 = bus.readByteSync(options.address, registers.MODE1);
    mode1 &= ~bits.SLEEP; // wake up(reset sleep)

    bus.writeByteSync(options.address, registers.MODE1, mode1);
    sleep(5); // wait for oscillator
  };

  init(options);

  return {
    softwareReset: softwareReset,
    setPWM: setPWM,
    setAllPWM: setAllPWM,
    setPin: setPin,
    setPWMFreq: setPWMFreq,
    getPWMFreq: getPWMFreq
  };
};
