'use strict';

require('should');
require('should-sinon');
const sinon = require('sinon');
const servo = require('../lib/servo.js');

const pwm = {
  setPWM: sinon.stub().yieldsAsync(null),
  setPWMFreq: sinon.stub().yieldsAsync(null),
  setPWMSync: sinon.spy(),
  setPWMFreqSync: sinon.spy(),
};

describe('lib/servolib.js', () => {
  it('should have constructor', () => {
    servo.should.be.type('function');
  });

  it('should require options object to initialize', () => {
    (function () {
      servo();
    }).should.throw();
  });

  it('should require pin to initialize', () => {
    (function () {
      servo({ pwm });
    }).should.throw();
  });

  it('should require pins in [0 to 15]', () => {
    (function () {
      servo({ pwm, pin: 16 });
    }).should.throw();

    (function () {
      servo({ pwm, pin: -1 });
    }).should.throw();
  });

  it('should require pwm instance to initialize', () => {
    (function () {
      servo({ pin: 2 });
    }).should.throw();
  });

  it('should initialize', () => {
    (function () {
      servo({ pwm, pin: 0 });
    }).should.not.throw();
  });

  const inst = servo({ pwm, pin: 0 });

  it('should reject bad moveTo params', () => {
    (function () {
      servo({ pwm, pin: 0 }).moveTo(-1);
    }).should.throw();

    (function () {
      servo({ pwm, pin: 0 }).moveTo(101);
    }).should.throw();
  });

  describe('default servolib calibration', () => {
    const defMinCount = 143.36;
    const defMaxCount = 655.36;
    const defFreq = 50;

    it('should set PWM freq on move', () => {
      inst.moveTo(0);
      pwm.setPWMFreqSync.should.be.calledWith(defFreq);
    });

    it('should move to 0', () => {
      inst.moveTo(0);
      pwm.setPWMSync.should.be.calledWith(0, 0, defMinCount);
    });

    it('should move to 100', () => {
      inst.moveTo(100);
      pwm.setPWMSync.should.be.calledWith(0, 0, defMaxCount);
    });

    it('should move to 50', () => {
      inst.moveTo(50);
      pwm.setPWMSync.should.be.calledWith(0, 0, (defMaxCount + defMinCount) / 2);
    });
  });

  describe('update servolib calibrations', () => {
    const newFreq = 40;
    const minMs = 1;
    const maxMs = 2;
    const newMinCount = (minMs * 40 * 4096) / 1000;
    const newMaxCount = (maxMs * 40 * 4096) / 1000;

    it('should recalibrate the max and min points and PWM frequency', () => {
      inst.calibrate(40, minMs, maxMs);
    });

    it('should set PWM freq on move with the new params', () => {
      inst.moveTo(0);
      pwm.setPWMFreqSync.should.be.calledWith(newFreq);
    });

    it('should move to 0 with the new params', () => {
      inst.moveTo(0);
      pwm.setPWMSync.should.be.calledWith(0, 0, newMinCount);
    });

    it('should move to 100 with the new params', () => {
      inst.moveTo(100);
      pwm.setPWMSync.should.be.calledWith(0, 0, newMaxCount);
    });

    it('should move to 50 with the new params', () => {
      inst.moveTo(50);
      pwm.setPWMSync.should.be.calledWith(0, 0, (newMaxCount + newMinCount) / 2);
    });
  });
});
