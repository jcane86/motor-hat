'use strict';
let assert = require('assert');
let motorHat = require('./stubindex.js');

describe('motor-hat', function () {
  it('should have constructor', function () {
    assert(typeof motorHat === 'function', 'motorHat is not of type "function"');
  });

  it('should respect max number of steppers', function () {
    assert.throws(function () {
      motorHat({
        steppers: [['M5', 'M1']]
      });
    }, Error, 'Error was not thrown!');
  });

  it('should respect max number of DC motors', function () {
    assert.throws(function () {
      motorHat({
        dcs: ['M5']
      });
    }, Error, 'Error was not thrown!');
  });

  it('should respect max number of servos', function () {
    assert.throws(function () {
      motorHat({
        servos: [16]
      });
    }, Error, 'Error was not thrown!');
  });

  it('should respect motor overlappings', function () {
    assert.throws(function () {
      motorHat({
        steppers: [['M1', 'M2']],
        dcs: ['M1']
      });
    }, Error, 'Error was not thrown!');

    assert.throws(function () {
      motorHat({
        dcs: ['M1', 'M1']
      });
    }, Error, 'Error was not thrown!');

    assert.throws(function () {
      motorHat({
        steppers: [['M1', 'M2'], ['M2', 'M3']]
      });
    }, Error, 'Error was not thrown!');

    assert.throws(function () {
      motorHat({
        servos: [1, 1]
      });
    }, Error, 'Error was not thrown!');
  });

  it('should respect correct motor definitions', function () {
    assert.doesNotThrow(function () {
      motorHat({
        steppers: [{W1: 'M1', W2: 'M2'}],
        dcs: ['M3', 'M4'],
        servos: [0]
      });
    });
  });

  it('should respect frequency type', function () {
    assert.throws(function () {
      motorHat({
        frequency: 'string'
      });
    }, Error, 'Error was not thrown!');
  });

  it('should respect I2C Address type', function () {
    assert.throws(function () {
      motorHat({
        address: 'string'
      });
    }, Error, 'Error was not thrown!');
  });

  it('should have setters and getters for freq and addr', function () {
    assert.equal(motorHat().setFrequency(10).getFrequency(), 10, 'Different freq set and gotten.');

    assert.equal(motorHat().setAddress(0x10).getAddress(), 0x10, 'Different addr set and gotten.');
  });
});
