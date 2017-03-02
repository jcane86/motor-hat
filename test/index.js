'use strict';
require('should');
let motorHat = require('./stubindex.js');

describe('motor-hat', function () {
  it('should have constructor', function () {
    motorHat.should.be.type('function');
  });

  it('shouldn\'t need options', function () {
    (function () {
      motorHat();
    }).should.not.throw();
  });

  it('should respect max number of steppers', function () {
    (function () {
      motorHat({
        steppers: [['M5', 'M1']]
      });
    }).should.throw();
  });

  it('should respect max number of DC motors', function () {
    (function () {
      motorHat({
        dcs: ['M5']
      });
    }).should.throw();
  });

  it('should respect max number of servos', function () {
    (function () {
      motorHat({
        servos: [16]
      });
    }).should.throw();
  });

  it('should respect motor overlappings', function () {
    (function () {
      motorHat({
        steppers: [['M1', 'M2']],
        dcs: ['M1']
      });
    }).should.throw();

    (function () {
      motorHat({
        dcs: ['M1', 'M1']
      });
    }).should.throw();

    (function () {
      motorHat({
        steppers: [['M1', 'M2'], ['M2', 'M3']]
      });
    }).should.throw();

    (function () {
      motorHat({
        servos: [1, 1]
      });
    }).should.throw();
  });

  it('should respect correct motor definitions', function () {
    (function () {
      motorHat({
        steppers: [{W1: 'M1', W2: 'M2'}],
        dcs: ['M3', 'M4'],
        servos: [0]
      });
    }).should.not.throw();
  });

  it('should respect I2C Address type', function () {
    (function () {
      motorHat({
        address: 'string'
      });
    }).should.throw();
  });
});
