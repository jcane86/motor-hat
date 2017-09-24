'use strict';

const should = require('should');
const motorHat = require('./stubindex.js');
const failerMotorHat = require('./stubindexfailer');

describe('motor-hat', () => {
  it('should have constructor', () => {
    motorHat.should.be.type('function');
  });

  it('shouldn\'t need options', () => {
    (function () {
      motorHat().init();
    }).should.not.throw();
  });

  it('shouldn\'t need options (async)', (done) => {
    (function () {
      motorHat().init((err) => {
        should.equal(err, null);
        done();
      });
    }).should.not.throw();
  });

  it('should respect max number of steppers', () => {
    (function () {
      motorHat({
        steppers: [['M5', 'M1']],
      }).init();
    }).should.throw();
  });

  it('should respect max number of DC motors', () => {
    (function () {
      motorHat({
        dcs: ['M5'],
      }).init();
    }).should.throw();
  });

  it('should respect max number of servos', () => {
    (function () {
      motorHat({
        servos: [16],
      }).init();
    }).should.throw();
  });

  it('should respect motor overlappings', () => {
    (function () {
      motorHat({
        steppers: [['M1', 'M2']],
        dcs: ['M1'],
      }).init();
    }).should.throw();

    (function () {
      motorHat({
        dcs: ['M1', 'M1'],
      }).init();
    }).should.throw();

    (function () {
      motorHat({
        steppers: [['M1', 'M2'], ['M2', 'M3']],
      }).init();
    }).should.throw();

    (function () {
      motorHat({
        servos: [1, 1],
      }).init();
    }).should.throw();
  });

  it('should respect correct motor definitions', () => {
    (function () {
      motorHat({
        steppers: [{ W1: 'M1', W2: 'M2' }],
        dcs: ['M3', 'M4'],
        servos: [0],
      }).init();
    }).should.not.throw();
  });

  it('should respect correct motor definitions (async)', (done) => {
    motorHat({
      steppers: [{ W1: 'M1', W2: 'M2' }],
      dcs: ['M3', 'M4'],
      servos: [0],
    }).init((err) => {
      should.equal(err, null);
      done();
    });
  });

  it('should respect I2C Address type', () => {
    (function () {
      motorHat({
        address: 'string',
      }).init();
    }).should.throw();
  });

  describe('Async chained inits fail', () => {
    const inst = failerMotorHat;
    it('should fail on init if pwm inits fail (async)', (done) => {
      inst.fail('pwm')({
        steppers: [{ W1: 'M1', W2: 'M2' }],
        dcs: ['M3', 'M4'],
        servos: [0],
      }).init((err) => {
        should.notEqual(err, null);
        inst.reset();
        done();
      });
    });

    it('should fail on init if stepper inits fail (async)', (done) => {
      inst.fail('stepper')({
        steppers: [{ W1: 'M1', W2: 'M2' }],
        dcs: ['M3', 'M4'],
        servos: [0],
      }).init((err) => {
        should.notEqual(err, null);
        inst.reset();
        done();
      });
    });

    it('should fail on init if dc inits fail (async)', (done) => {
      inst.fail('dc')({
        steppers: [{ W1: 'M1', W2: 'M2' }],
        dcs: ['M3', 'M4'],
        servos: [0],
      }).init((err) => {
        should.notEqual(err, null);
        inst.reset();
        done();
      });
    });

    it('should fail on init if servo inits fail (async)', (done) => {
      inst.fail('servo')({
        steppers: [{ W1: 'M1', W2: 'M2' }],
        dcs: ['M3', 'M4'],
        servos: [0],
      }).init((err) => {
        should.notEqual(err, null);
        inst.reset();
        done();
      });
    });
  });
});
