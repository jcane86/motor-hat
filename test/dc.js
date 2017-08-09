'use strict';

const sinon = require('sinon');
require('should');
require('should-sinon');
const dc = require('../lib/dc.js');
const i2c = require('./stubi2c.js');
const pwm = require('./stubpwm.js')({ i2c });

const ports = {
  M1: {
    PWM: 8,
    IN1: 10,
    IN2: 9,
  },
};

describe('lib/dclib.js', () => {
  it('should have constructor', () => {
    dc.should.be.type('function');
  });

  it('should require options object to initialize', () => {
    (function () {
      dc();
    }).should.throw();
  });

  it('should require 3 pins to initialize', () => {
    (function () {
      dc({ pwm: {} });
    }).should.throw();

    (function () {
      dc({ pwm: {}, pins: [0, 1] });
    }).should.throw();

    (function () {
      dc({ pwm: {}, pins: [0, 1, 2, 4] });
    }).should.throw();
  });

  it('should require pins in [0 to 15]', () => {
    (function () {
      dc({ pwm: {}, pins: [16, 1, 2] });
    }).should.throw();

    (function () {
      dc({ pwm: {}, pins: [-1, 3, 4] });
    }).should.throw();
  });

  it('should require pwm instance to initialize', () => {
    (function () {
      dc({ pins: ports.M1 });
    }).should.throw();
  });

  it('should initialize', () => {
    (function () {
      dc({ pwm, pins: ports.M1 });
    }).should.not.throw();

    (function () {
      dc({ pwm, pins: [8, 10, 9] });
    }).should.not.throw();
  });

  it('should respect default frequency', () => {
    const stub = sinon.stub(pwm, 'setPWMFreq').callsFake(() => {});
    dc({ pwm, pins: ports.M1 });
    stub.should.be.calledWith(1600);
    stub.restore();
  });

  it('should respect default speed', () => {
    const stub = sinon.stub(pwm, 'setPWM').callsFake(() => {});
    dc({ pwm, pins: ports.M1 });
    stub.should.be.calledWith(8, 0, 4080);
    stub.restore();
  });

  it('should change speed', () => {
    const stub = sinon.stub(pwm, 'setPWM').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).setSpeed(50);
    stub.should.be.calledWith(8, 0, 2040);
    stub.restore();
  });

  it('should run forwards', () => {
    const stub = sinon.stub(pwm, 'setPin').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).run('fwd');
    stub.should.be.calledWith(10, 1);
    stub.should.be.calledWith(9, 0);
    stub.restore();
  });

  it('should run back', () => {
    const stub = sinon.stub(pwm, 'setPin').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).run('back');
    stub.should.be.calledWith(10, 0);
    stub.should.be.calledWith(9, 1);
    stub.restore();
  });

  it('should stop', () => {
    const stub = sinon.stub(pwm, 'setPin').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).stop();
    stub.should.be.calledWith(10, 0);
    stub.should.be.calledWith(9, 0);
    stub.restore();
  });
});
