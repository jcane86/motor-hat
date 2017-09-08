'use strict';

const sinon = require('sinon');
const should = require('should');
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
      dc().init();
    }).should.throw();
  });

  it('should require 3 pins to initialize', () => {
    (function () {
      dc({ pwm: {} }).init();
    }).should.throw();

    (function () {
      dc({ pwm: {}, pins: [0, 1] }).init();
    }).should.throw();

    (function () {
      dc({ pwm: {}, pins: [0, 1, 2, 4] }).init();
    }).should.throw();
  });

  it('should require pins in [0 to 15]', () => {
    (function () {
      dc({ pwm: {}, pins: [16, 1, 2] }).init();
    }).should.throw();

    (function () {
      dc({ pwm: {}, pins: [-1, 3, 4] }).init();
    }).should.throw();
  });

  it('should require pwm instance to initialize', () => {
    (function () {
      dc({ pins: ports.M1 }).init();
    }).should.throw();
  });

  it('should initialize synchronously', () => {
    (function () {
      dc({ pwm, pins: ports.M1 }).init();
    }).should.not.throw();

    (function () {
      dc({ pwm, pins: [8, 10, 9] }).init();
    }).should.not.throw();
  });

  it('should initialize asynchronously with obj', (done) => {
    (function () {
      dc({ pwm, pins: ports.M1 }).init((err) => {
        should.equal(err, null);
        done();
      });
    }).should.not.throw();
  });

  it('should initialize asynchronously with arr', (done) => {
    (function () {
      dc({ pwm, pins: [8, 10, 9] }).init((err) => {
        should.equal(err, null);
        done();
      });
    }).should.not.throw();
  });

  it('should respect default frequency on synch init', () => {
    const stub = sinon.stub(pwm, 'setPWMFreqSync').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).init();
    stub.should.be.calledWith(1600);
    stub.restore();
  });

  it('should respect default frequency on asynch init', (done) => {
    const stub = sinon.stub(pwm, 'setPWMFreq').yieldsAsync(null);
    dc({ pwm, pins: ports.M1 }).init((err) => {
      should.equal(err, null);
      stub.should.be.calledWith(1600);
      stub.restore();
      done();
    });
  });

  it('should respect default speed on synch init', () => {
    const stub = sinon.stub(pwm, 'setPWMSync').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).init();
    stub.should.be.calledWith(8, 0, 4080);
    stub.restore();
  });

  it('should respect default speed on asynch init', (done) => {
    const stub = sinon.stub(pwm, 'setPWM').yieldsAsync(null);
    dc({ pwm, pins: ports.M1 }).init((err) => {
      should.equal(err, null);
      stub.should.be.calledWith(8, 0, 4080);
      stub.restore();
      done();
    });
  });

  it('should change speed synchronously', () => {
    const stub = sinon.stub(pwm, 'setPWMSync').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).init().setSpeedSync(50);
    stub.should.be.calledWith(8, 0, 2040);
    stub.restore();
  });

  it('should change speed asynchronously', (done) => {
    const stub = sinon.stub(pwm, 'setPWM').yieldsAsync(null);
    dc({ pwm, pins: ports.M1 }).init((err, res) => {
      should.equal(err, null);
      res.setSpeed(50, (error) => {
        should.equal(error, null);
        stub.should.be.calledWith(8, 0, 2040);
        stub.restore();
        done();
      });
    });
  });

  it('should run forwards synchronously', () => {
    const stub = sinon.stub(pwm, 'setPinSync').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).init().runSync('fwd');
    stub.should.be.calledWith(10, 1);
    stub.should.be.calledWith(9, 0);
    stub.restore();
  });

  it('should run forwards asynchronously', (done) => {
    const stub = sinon.stub(pwm, 'setPin').yieldsAsync(null);
    dc({ pwm, pins: ports.M1 }).init((err, res) => {
      should.equal(err, null);
      res.run('fwd', (error) => {
        should.equal(error, null);
        stub.should.be.calledWith(10, 1);
        stub.should.be.calledWith(9, 0);
        stub.restore();
        done();
      });
    });
  });

  it('should run back synchronously', () => {
    const stub = sinon.stub(pwm, 'setPinSync').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).init().runSync('back');
    stub.should.be.calledWith(10, 0);
    stub.should.be.calledWith(9, 1);
    stub.restore();
  });

  it('should run back asynchronously', (done) => {
    const stub = sinon.stub(pwm, 'setPin').yieldsAsync(null);
    dc({ pwm, pins: ports.M1 }).init((err, res) => {
      should.equal(err, null);
      res.run('back', (error) => {
        should.equal(error, null);
        stub.should.be.calledWith(10, 0);
        stub.should.be.calledWith(9, 1);
        stub.restore();
        done();
      });
    });
  });

  it('should stop synchronously', () => {
    const stub = sinon.stub(pwm, 'setPinSync').callsFake(() => {});
    dc({ pwm, pins: ports.M1 }).init().stopSync();
    stub.should.be.calledWith(10, 0);
    stub.should.be.calledWith(9, 0);
    stub.restore();
  });

  it('should stop asynchronously', (done) => {
    const stub = sinon.stub(pwm, 'setPin').yieldsAsync(null);
    dc({ pwm, pins: ports.M1 }).init((err, res) => {
      should.equal(err, null);
      res.stop((error) => {
        should.equal(error, null);
        stub.should.be.calledWith(10, 0);
        stub.should.be.calledWith(9, 0);
        stub.restore();
        done();
      });
    });
  });
});
