'use strict';
let rpi = require('raspi-ver');
// # ============================================================================
// # Adapted from:
// #    Adafruit PCA9685 16-Channel PWM Servo Driver
// #    https://github.com/adafruit/Adafruit-Motor-HAT-Python-Library
// # ============================================================================

module.exports = function (options) {
  if (undefined === options.i2c) {
    throw Error('We need to be passed the i2c service!');
  }
  let i2c = options.i2c;
  let sleep = require('sleep').msleep;
  let debug = options.debug || false;
  let address = options.address || 0x6F;
  let busnum;
  let bus;

  let getPiI2CBusNumber = function () {
    // Gets the I2C bus number /dev/i2c#
    return rpi.i2c;
  };

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
    // Sends a software reset (SWRST) command to all the servo drivers on the bus
    bus.sendByteSync(0x00, 0x06);
  };

  let setPWMFreq = function (freq) {
    // Sets the PWM frequency"
    var prescaleval = 25000000.0; // 25MHz
    prescaleval /= 4096.0; // 12 - bit
    prescaleval /= freq;
    prescaleval -= 1.0;

    if (debug) {
      console.log('Setting PWM frequency to {0} Hz'.format(freq));
      console.log('Estimated pre-scale: {0}'.format(prescaleval));
    }

    var prescale = Math.ceil(prescaleval);
    if (debug) {
      console.log('Final pre-scale: {0}'.format(prescale));
    }

    var oldmode = bus.readByteSync(address, registers.MODE1);
    var newmode = (oldmode & 0x7F) | 0x10; // sleep
    bus.writeByteSync(address, registers.MODE1, newmode); // go to sleep
    bus.writeByteSync(address, registers.PRESCALE, Math.floor(prescale));
    bus.writeByteSync(address, registers.MODE1, oldmode);
    sleep(5);
    bus.writeByteSync(address, registers.MODE1, oldmode | 0x80);
  };

  let setPWM = function (channel, on, off) {
    if ((channel < 0) || (channel > 15)) {
      throw Error('PWM pin must be between 0 and 15 inclusive');
    }
    // Sets a single PWM channel
    var offset = 4 * channel;
    bus.writeByteSync(address, registers.LED0_ON_L + offset, on & 0xFF);
    bus.writeByteSync(address, registers.LED0_ON_H + offset, on >> 8);
    bus.writeByteSync(address, registers.LED0_OFF_L + offset, off & 0xFF);
    bus.writeByteSync(address, registers.LED0_OFF_H + offset, off >> 8);
  };

  let setAllPWM = function (on, off) {
    // Sets a all PWM channels
    bus.writeByteSync(address, registers.ALL_LED_ON_L, on & 0xFF);
    bus.writeByteSync(address, registers.ALL_LED_ON_H, on >> 8);
    bus.writeByteSync(address, registers.ALL_LED_OFF_L, off & 0xFF);
    bus.writeByteSync(address, registers.ALL_LED_OFF_H, off >> 8);
  };

  let setPin = function (channel, state) {
    if ((channel < 0) || (channel > 15)) {
      throw Error('PWM pin must be between 0 and 15 inclusive');
    }
    if ((state !== 0) && (state !== 1)) {
      throw Error('Pin state must be 0 or 1!');
    }
    if (state === 1) {
      setPWM(channel, 4096, 0);
    } else {
      setPWM(channel, 0, 4096);
    }
  };

  let init = function () {
    if (debug) {
      console.log('Initializing PWM driver on address ' + address);
    }
    // By default, the correct I2C bus is auto-detected using /proc/cpuinfo
    // Alternatively, you can hard-code the bus version below:
    // let busnum = 0; # Force I2C0 (early 256MB Pi's)
    // let busnum = 1; # Force I2C1 (512MB Pi's)
    busnum = (options.busnum === undefined) ? getPiI2CBusNumber() : options.busnum;

    bus = i2c.openSync(busnum, {});

    if (debug) {
      console.log('Reseting PCA9685 MODE1 (without SLEEP) and MODE2');
    }

    setAllPWM(0, 0);
    bus.writeByteSync(address, registers.MODE2, bits.OUTDRV);
    bus.writeByteSync(address, registers.MODE1, bits.ALLCALL);
    sleep(5); // wait for oscillator

    var mode1 = bus.readByteSync(address, registers.MODE1);
    mode1 &= ~bits.SLEEP; // wake up(reset sleep)

    bus.writeByteSync(address, registers.MODE1, mode1);
    sleep(5); // wait for oscillator
  };

  init(options);

  return {
    softwareReset: softwareReset,
    setPWM: setPWM,
    setAllPWM: setAllPWM,
    setPin: setPin,
    setPWMFreq: setPWMFreq
  };
};
