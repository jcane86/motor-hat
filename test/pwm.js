'use strict';
let sinon = require('sinon');
require('should');
require('should-sinon');
let pwm = require('./stubpwm.js');
let i2c = require('./stubi2c.js');

describe('lib/pwm.js', function () {
  describe('exports', function () {
    let i2c = {};
    beforeEach(function () {
      i2c = {
        openSync: sinon.stub().returns({
          writeByteSync: sinon.stub(),
          readByteSync: sinon.stub()
        })
      };
    });

    afterEach(function () {
      i2c.openSync.reset();
    });

    it('should have constructor', function () {
      pwm.should.be.type('function');
    });

    it('should require options object to initialize', function () {
      (function () {
        pwm();
      }).should.throw();
    });

    it('should require i2c object to initialize', function () {
      (function () {
        pwm({i2c: undefined});
      }).should.throw();
    });

    it('should initialize', function () {
      (function () {
        try {
          pwm({i2c: i2c});
        } catch (e) {
          console.log(e);
          throw e;
        }
      }).should.not.throw();
    });
  });

  describe('init()', function () {
    let addr = 0x40;

    it('should recognize the i2c devfile and init the i2c driver', function () {
      i2c.resetAll();
      pwm({i2c: i2c});
      i2c.openSync.should.be.calledOnce();
      i2c.openSync.should.be.calledWith(0, {});
      i2c.resetAll();
      pwm.seti2c(1);
      pwm({i2c: i2c});
      i2c.openSync.should.be.calledOnce();
      i2c.openSync.should.be.calledWith(1, {});
    });

    i2c.resetAll();
    let call = 0;
    it('should set all PWM pins to 0', function () {
      pwm({i2c: i2c, address: addr});
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFA, 0x00);
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFB, 0x00);
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFC, 0x00);
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0xFD, 0x00);
    });

    it('should enable all call adress', function () {
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x01, 0x04);
    });

    it('should configure all outputs as totem pole', function () {
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x00, 0x01);
    });

    it('should wake up the PWM chip', function () {
      i2c.bus.writeByteSync.getCall(call++).should.be.calledWith(addr, 0x00, 0xBEE && 0x01);
    });
  });

  describe('softwareReset()', function () {
    it('should send a software reset (SWRST) command to all servolib drivers on the bus', function () {
      pwm({i2c: i2c}).softwareReset();
      i2c.bus.sendByteSync.should.be.calledOnce();
      i2c.bus.sendByteSync.should.be.calledWith(0x00, 0x06);
    });
  });

  describe('setPWMFreq()', function () {
    let addr = 0x40;
    let freq = 100;
    let prescale = Math.ceil((25000000 / 4096 / freq) - 1);

    let instance = pwm({i2c: i2c, address: addr});
    i2c.resetAll();
    let i = 0;
    it('should set sleep mode', function () {
      instance.setPWMFreq(freq);
      i2c.bus.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, (0xBEE & 0x7F) | 0x10);
    });

    it('should write new prescale val', function () {
      i2c.bus.writeByteSync.getCall(i++).should.be.calledWith(addr, 0xFE, prescale);
    });

    it('should set reset the chip', function () {
      i2c.bus.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, 0xBEE);
    });

    it('should set clear reset flag', function () {
      i2c.bus.writeByteSync.getCall(i++).should.be.calledWith(addr, 0x00, 0xBEE | 0x80);
    });
  });

  describe('getPWMFreq()', function () {
    let addr = 0x40;

    let instance = pwm({i2c: i2c, address: addr});
    i2c.resetAll();

    it('should read prescale val', function () {
      instance.getPWMFreq();
      i2c.bus.readByteSync.should.be.calledWith(addr, 0xFE);
    });
  });

  describe('setPWM()', function () {
    let addr = 0x40;
    let channel = 5;
    let on = 0x10;
    let off = 0xFE;

    let instance = pwm({i2c: i2c, address: addr});

    it('should fail on channels different to 0 to 15', function () {
      (function () {
        instance.setPWM(16, on, off);
      }).should.throw();
      (function () {
        instance.setPin(-1, on, off);
      }).should.throw();
    });

    it('should set all 4 registers for the channel', function () {
      i2c.resetAll();
      instance.setPWM(channel, on, off);
      i2c.bus.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + (4 * channel), on & 0xFF);
      i2c.bus.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + (4 * channel), on >> 8);
      i2c.bus.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + (4 * channel), off & 0xFF);
      i2c.bus.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + (4 * channel), off >> 8);
    });
  });

  describe('setAllPWM()', function () {
    let addr = 0x40;
    let on = 0x10;
    let off = 0xFE;

    let instance = pwm({i2c: i2c, address: addr});

    it('should set all 4 registers for the channel', function () {
      i2c.resetAll();
      instance.setAllPWM(on, off);
      i2c.bus.writeByteSync.getCall(0).should.be.calledWith(addr, 0xFA, on & 0xFF);
      i2c.bus.writeByteSync.getCall(1).should.be.calledWith(addr, 0xFB, on >> 8);
      i2c.bus.writeByteSync.getCall(2).should.be.calledWith(addr, 0xFC, off & 0xFF);
      i2c.bus.writeByteSync.getCall(3).should.be.calledWith(addr, 0xFD, off >> 8);
    });
  });

  describe('setPin()', function () {
    let addr = 0x40;
    let channel = 5;

    let instance = pwm({i2c: i2c, address: addr});
    i2c.resetAll();

    it('should fail on values different to 1 or 0', function () {
      (function () {
        instance.setPin(channel, 2);
      }).should.throw();

      (function () {
        instance.setPin(channel, -1);
      }).should.throw();
    });

    it('should fail on channels different to 0 to 15', function () {
      (function () {
        instance.setPin(16, 0);
      }).should.throw();

      (function () {
        instance.setPin(-1, 1);
      }).should.throw();
    });

    it('should set all 4 registers for the channel to OFF', function () {
      instance.setPin(channel, 0);
      i2c.bus.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + (4 * channel), 0);
      i2c.bus.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + (4 * channel), 0);
      i2c.bus.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + (4 * channel), 4096 & 0xFF);
      i2c.bus.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + (4 * channel), 4096 >> 8);
      i2c.resetAll();
    });

    it('should set all 4 registers for the channel to ON', function () {
      instance.setPin(channel, 1);
      i2c.bus.writeByteSync.getCall(0).should.be.calledWith(addr, 0x06 + (4 * channel), 4096 & 0xFF);
      i2c.bus.writeByteSync.getCall(1).should.be.calledWith(addr, 0x07 + (4 * channel), 4096 >> 8);
      i2c.bus.writeByteSync.getCall(2).should.be.calledWith(addr, 0x08 + (4 * channel), 0);
      i2c.bus.writeByteSync.getCall(3).should.be.calledWith(addr, 0x09 + (4 * channel), 0);
    });
  });
});
