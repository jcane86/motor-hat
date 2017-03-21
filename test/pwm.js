'use strict';

require('should');
require('should-sinon');
const pwm = require('./stubpwm.js');
const i2c = require('./stubi2c.js');

/* eslint "no-plusplus": "off" */
/* eslint "no-bitwise": "off" */

describe('lib/pwm.js', () => {
  describe('exports', () => {
    afterEach(() => {
      i2c.openSync.resetHistory();
    });

    it('should have constructor', () => {
      pwm.should.be.type('function');
    });

    it('should require options object to initialize', () => {
      (function () {
        pwm();
      }).should.throw();
    });

    it('should require i2c object to initialize', () => {
      (function () {
        pwm({ i2c: undefined });
      }).should.throw();
    });

    it('should initialize', () => {
      (function () {
        try {
          pwm({ i2c });
        } catch (e) {
          throw e;
        }
      }).should.not.throw();
    });
  });

  describe('init()', () => {
    const addr = 0x40;

    it('should recognize the i2c devfile and init the i2c driver', () => {
      i2c.resetAll();
      pwm({ i2c });
      i2c.openSync.should.be.calledOnce();
      i2c.openSync.should.be.calledWith(0, {});
      i2c.resetAll();
      pwm.seti2c(1);
      pwm({ i2c });
      i2c.openSync.should.be.calledOnce();
      i2c.openSync.should.be.calledWith(1, {});
    });

    i2c.resetAll();
    let call = 0;
    it('should set all PWM pins to 0', () => {
      pwm({ i2c, address: addr });
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFA, 0x00);
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFB, 0x00);
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFC, 0x00);
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFD, 0x00);
    });

    it('should enable all call adress', () => {
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x01, 0x04);
    });

    it('should configure all outputs as totem pole', () => {
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x00, 0x01);
    });

    it('should wake up the PWM chip', () => {
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x00, 0xBEE && 0x01);
    });
  });

  describe('softwareReset()', () => {
    it('should send a software reset (SWRST) command to all servolib drivers on the bus', () => {
      pwm({ i2c }).softwareReset();
      i2c.bus.sendByteSync.should.be.calledOnce();
      i2c.bus.sendByteSync.should.be.calledWith(0x00, 0x06);
    });
  });

  describe('setPWMFreq()', () => {
    const addr = 0x40;
    const freq = 100;
    const prescale = Math.ceil((25000000 / 4096 / freq) - 1);

    const instance = pwm({ i2c, address: addr });
    i2c.resetAll();
    let i = 0;
    it('should set sleep mode', () => {
      instance.setPWMFreq(freq);
      i2c.bus.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, (0xBEE & 0x7F) | 0x10);
    });

    it('should write new prescale val', () => {
      i2c.bus.writeByteSync.getCall(i++).should.be.calledWith(addr, 0xFE, prescale);
    });

    it('should set reset the chip', () => {
      i2c.bus.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, 0xBEE);
    });

    it('should set clear reset flag', () => {
      i2c.bus.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, 0xBEE | 0x80);
    });
  });

  describe('getPWMFreq()', () => {
    const addr = 0x40;

    const instance = pwm({ i2c, address: addr });
    i2c.resetAll();

    it('should read prescale val', () => {
      instance.getPWMFreq();
      i2c.bus.readByteSync.should.be.calledWith(addr, 0xFE);
    });
  });

  describe('setPWM()', () => {
    const addr = 0x40;
    const channel = 5;
    const on = 0x10;
    const off = 0xFE;

    const instance = pwm({ i2c, address: addr });

    it('should fail on channels different to 0 to 15', () => {
      (function () {
        instance.setPWM(16, on, off);
      }).should.throw();
      (function () {
        instance.setPin(-1, on, off);
      }).should.throw();
    });

    it('should set all 4 registers for the channel', () => {
      i2c.resetAll();
      instance.setPWM(channel, on, off);
      i2c.bus.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + (4 * channel), on & 0xFF);
      i2c.bus.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + (4 * channel), on >> 8);
      i2c.bus.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + (4 * channel), off & 0xFF);
      i2c.bus.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + (4 * channel), off >> 8);
    });
  });

  describe('setAllPWM()', () => {
    const addr = 0x40;
    const on = 0x10;
    const off = 0xFE;

    const instance = pwm({ i2c, address: addr });

    it('should set all 4 registers for the channel', () => {
      i2c.resetAll();
      instance.setAllPWM(on, off);
      i2c.bus.writeByteSync.getCall(0).should.be.calledWith(addr, 0xFA, on & 0xFF);
      i2c.bus.writeByteSync.getCall(1).should.be.calledWith(addr, 0xFB, on >> 8);
      i2c.bus.writeByteSync.getCall(2).should.be.calledWith(addr, 0xFC, off & 0xFF);
      i2c.bus.writeByteSync.getCall(3).should.be.calledWith(addr, 0xFD, off >> 8);
    });
  });

  describe('setPin()', () => {
    const addr = 0x40;
    const channel = 5;

    const instance = pwm({ i2c, address: addr });
    i2c.resetAll();

    it('should fail on values different to 1 or 0', () => {
      (function () {
        instance.setPin(channel, 2);
      }).should.throw();

      (function () {
        instance.setPin(channel, -1);
      }).should.throw();
    });

    it('should fail on channels different to 0 to 15', () => {
      (function () {
        instance.setPin(16, 0);
      }).should.throw();

      (function () {
        instance.setPin(-1, 1);
      }).should.throw();
    });

    it('should set all 4 registers for the channel to OFF', () => {
      instance.setPin(channel, 0);
      const offset = 4 * channel;
      i2c.bus.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + offset, 0);
      i2c.bus.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + offset, 0);
      i2c.bus.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + offset, 4096 & 0xFF);
      i2c.bus.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + offset, 4096 >> 8);
      i2c.resetAll();
    });

    it('should set all 4 registers for the channel to ON', () => {
      instance.setPin(channel, 1);
      const offset = 4 * channel;
      i2c.bus.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + offset, 4096 & 0xFF);
      i2c.bus.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + offset, 4096 >> 8);
      i2c.bus.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + offset, 0);
      i2c.bus.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + offset, 0);
    });
  });
});
