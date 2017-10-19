'use strict';

const async = require('async');
const rpi = require('raspi-ver');
const debug = require('debug')('motor-hat:pwmlib');
const sleep = require('sleep').msleep;

const errHdlr = function errHdlr(err) {
  debug('%s', err);
  throw new Error(err);
};

/* eslint "no-bitwise": "off" */

const isRequired = () => { throw new Error('Async functions require callback'); };

// # ============================================================================
// # Adapted from:
// #    Adafruit PCA9685 16-Channel PWM Servo Driver
// #    https://github.com/adafruit/Adafruit-Motor-HAT-Python-Library
// # ============================================================================

module.exports = function exports(options) {
  const validateFreq = freq => (
    typeof freq !== 'number' && errHdlr('freq should be a number.')
  );
  const validateChannel = channel => (
    (typeof (channel) !== 'number' || channel < 0 || channel > 15)
    && errHdlr('Channel should be a number between 0 and 15.')
  );
  const validateState = state => (
    (typeof (state) !== 'number' || (state !== 0 && state !== 1))
    && errHdlr('State should be 0 or 1.')
  );
  const validateOnOff = (on, off) => (
    (typeof (on) !== 'number' || typeof (off) !== 'number'
      || on < 0 || on > 4096 || off < 0 || off > 4096)
    && errHdlr('on and off should be numbers between 0 and 4096.')
  );

  if (typeof options.i2c !== 'object') {
    errHdlr('options.i2c is required and should be an object');
  }
  options.address = options.address || 0x6F;
  options.busnum = options.busnum || rpi.i2c;
  if (typeof options.busnum !== 'number') {
    errHdlr('options.busnum should be a number');
  }

  const { i2c } = options;
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
    validateFreq(freq);

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
          bus.writeByte.bind(bus, options.address, registers.MODE1, newmode), // go to sleep
          bus.writeByte.bind(bus, options.address, registers.PRESCALE, Math.floor(prescale)),
          bus.writeByte.bind(bus, options.address, registers.MODE1, oldmode),
        ],
        (error) => {
          if (error) { cb(error); }
          setTimeout(() => {
            bus.writeByte(
              options.address, registers.MODE1, oldmode | 0x80,
              cb,
            );
          }, 5);
        },
      );
    });
  };

  const setPWMFreqSync = function setPWMFreqSync(freq) {
    validateFreq(freq);
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
    validateChannel(channel);
    validateOnOff(on, off);

    // Sets a single PWM channel
    const offset = 4 * channel;
    async.series(
      [
        bus.writeByte.bind(bus, options.address, registers.LED0_ON_L + offset, on & 0xFF),
        bus.writeByte.bind(bus, options.address, registers.LED0_ON_H + offset, on >> 8),
        bus.writeByte.bind(bus, options.address, registers.LED0_OFF_L + offset, off & 0xFF),
        bus.writeByte.bind(bus, options.address, registers.LED0_OFF_H + offset, off >> 8),
      ],
      cb,
    );
  };

  const setPWMSync = function setPWMSync(channel, on, off) {
    validateChannel(channel);
    validateOnOff(on, off);

    // Sets a single PWM channel
    const offset = 4 * channel;
    bus.writeByteSync(options.address, registers.LED0_ON_L + offset, on & 0xFF);
    bus.writeByteSync(options.address, registers.LED0_ON_H + offset, on >> 8);
    bus.writeByteSync(options.address, registers.LED0_OFF_L + offset, off & 0xFF);
    bus.writeByteSync(options.address, registers.LED0_OFF_H + offset, off >> 8);
  };

  const setAllPWM = function setAllPWM(on, off, cb = isRequired()) {
    validateOnOff(on, off);
    // Sets a all PWM channels
    async.series(
      [
        bus.writeByte.bind(bus, options.address, registers.ALL_LED_ON_L, on & 0xFF),
        bus.writeByte.bind(bus, options.address, registers.ALL_LED_ON_H, on >> 8),
        bus.writeByte.bind(bus, options.address, registers.ALL_LED_OFF_L, off & 0xFF),
        bus.writeByte.bind(bus, options.address, registers.ALL_LED_OFF_H, off >> 8),
      ],
      cb,
    );
  };

  const setAllPWMSync = function setAllPWMSync(on, off) {
    validateOnOff(on, off);
    // Sets a all PWM channels
    bus.writeByteSync(options.address, registers.ALL_LED_ON_L, on & 0xFF);
    bus.writeByteSync(options.address, registers.ALL_LED_ON_H, on >> 8);
    bus.writeByteSync(options.address, registers.ALL_LED_OFF_L, off & 0xFF);
    bus.writeByteSync(options.address, registers.ALL_LED_OFF_H, off >> 8);
  };

  const setPin = function setPin(channel, state, cb = isRequired()) {
    validateChannel(channel);
    validateState(state);

    if (state === 1) {
      setPWM(channel, 4096, 0, cb);
    } else {
      setPWM(channel, 0, 4096, cb);
    }
  };

  const setPinSync = function setPinSync(channel, state) {
    validateChannel(channel);
    validateState(state);

    if (state === 1) {
      setPWMSync(channel, 4096, 0);
    } else {
      setPWMSync(channel, 0, 4096);
    }
  };

  const init = function init(cb) {
    const self = this;

    debug(`Initializing PWM driver on address ${options.address}`);
    // By default, the correct I2C bus is auto-detected using /proc/cpuinfo
    // Alternatively, you can pass it in the busnum options property
    if (!cb) {
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

      return self;
    }

    bus = i2c;
    // bus.open(0, {}, (err, val) => {
    //   debug('callback');
    // });
    async.series([
      bus.open.bind(bus, options.busnum, {}),
      (cb2) => {
        debug('Reseting PCA9685 MODE1 (without SLEEP) and MODE2'); cb2(null, null);
      },
      setAllPWM.bind(self, 0, 0),
      bus.writeByte.bind(bus, options.address, registers.MODE2, bits.OUTDRV),
      bus.writeByte.bind(bus, options.address, registers.MODE1, bits.ALLCALL),
    ], (err3) => {
      if (err3) return cb(err3);
      setTimeout(() => {
        async.waterfall([
          bus.readByte.bind(bus, options.address, registers.MODE1),
          (byte, cb3) => {
            // wake up(reset sleep));
            bus.writeByte(options.address, registers.MODE1, byte & ~bits.SLEEP, cb3);
          },
        ], (err4) => {
          if (err4) return cb(err4);
          return setTimeout(() => cb(null, self), 5); // wait for oscillator
        });
      }, 5);
      return null;
    });

    return null;
  };

  return {
    init,
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
