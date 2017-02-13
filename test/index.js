'use strict';
let assert = require('assert');
let motorHat = require('../lib/index.js');

describe('motor-hat', function () {
  it('should have constructor', function () {
    assert(typeof motorHat === 'function', 'motorHat is not of type "function"');
  });

  it('should respect max number of steppers', function () {
    assert.throws(function () {
      motorHat({
        steppers: [2]
      });
    }, Error, 'Error was not thrown!');
  });

  it('should respect max number of DC motors', function () {
    assert.throws(function () {
      motorHat({
        dc: [4]
      });
    }, Error, 'Error was not thrown!');
  });

  it('should respect max number of servos', function () {
    assert.throws(function () {
      motorHat({
        servos: [4]
      });
    }, Error, 'Error was not thrown!');
  });

  it('should respect motor overlappings', function () {
    assert.throws(function () {
      motorHat({
        steppers: [0],
        dc: [1]
      });
    }, Error, 'Error was not thrown!');

    assert.throws(function () {
      motorHat({
        dc: [1, 1]
      });
    }, Error, 'Error was not thrown!');

    assert.throws(function () {
      motorHat({
        steppers: [1, 1]
      });
    }, Error, 'Error was not thrown!');

    assert.throws(function () {
      motorHat({
        servos: [1, 1]
      });
    }, Error, 'Error was not thrown!');

    // Servos are defined 0 to 4 and always on their own pins from 4++
    // assert.throws(function () {
    //   motorHat({
    //     steppers: [1],
    //     servos: [2]
    //   });
    // }, Error, 'Error was not thrown!');
    //
    // assert.throws(function () {
    //   motorHat({
    //     dc: [1],
    //     servos: [1]
    //   });
    // }, Error, 'Error was not thrown!');
  });

  it('should respect correct motor definitions', function () {
    assert.doesNotThrow(function () {
      motorHat({
        stepper: [0],
        dc: [2],
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
