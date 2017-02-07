'use strict';
import assert from 'assert';
import motorHat from '../lib';

describe('motor-hat', function () {
  it('should have constructor', function () {
    assert(typeof motorHat === 'function', 'motorHat is not of type "function"');
  });

  it('should respect max number of motors', function () {
    assert.throws(function () {
      motorHat({
        steppers: [1, 2, 3, 4, 5]
      });
    }, Error, 'Error thrown!');
  });
});
