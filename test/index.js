'use strict';
import assert from 'assert';
import motorHat from '../lib';

describe('motor-hat', function () {
  it('should have constructor', function () {
    assert(typeof motorHat === 'function', 'motorHat is not of type "function"');
  });

  it('should respect max number of steppers', function () {
    assert.throws(function () {
      motorHat({
        steppers: [1, 2, 3]
      });
    }, Error, 'Error thrown!');
  });

  it('should respect max number of DC motors', function () {
    assert.throws(function () {
      motorHat({
        dc: [1, 2, 3, 4, 5]
      });
    }, Error, 'Error thrown!');
  });

  it('should respect max number of servos', function () {
    assert.throws(function () {
      motorHat({
        servos: [1, 2, 3, 4, 5]
      });
    }, Error, 'Error thrown!');
  });

  it('should respect frequency type', function () {
    assert.throws(function () {
      motorHat({
        frequency: 'string'
      });
    }, Error, 'Error thrown!');
  });

  it('should respect I2C Address type', function () {
    assert.throws(function () {
      motorHat({
        address: 'string'
      });
    }, Error, 'Error thrown!');
  });
});
