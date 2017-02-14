'use strict';
let assert = require('assert');
let sinon = require('sinon');
let servo = require('../lib/servo.js');
let pwm = {
  setPWM: sinon.spy(),
  setPWMFreq: sinon.spy()
};

describe('lib/servo.js', function () {
  it('should have constructor', function () {
    assert(typeof servo === 'function', 'servo is not of type "function"');
  });

  it('should require options object to initialize', function () {
    assert.throws(function () {
      servo();
    }, Error, 'no errors thrown!');
  });

  it('should require channel to initialize', function () {
    assert.throws(function () {
      servo({pwm: pwm});
    }, Error, 'no errors thrown!');
  });

  it('should require channels in [0,1,14,15]', function () {
    assert.throws(function () {
      servo({pwm: pwm, channel: 2});
    }, Error, 'no errors thrown!');
  });

  it('should require pwm instance to initialize', function () {
    assert.throws(function () {
      servo({channel: 2});
    }, Error, 'no errors thrown!');
  });

  it('should initialize', function () {
    assert.doesNotThrow(function () {
      servo({pwm: pwm, channel: 0});
    }, Error, 'it threw an error!');
  });

  let inst = servo({pwm: pwm, channel: 0});

  it('should reject bad moveTo params', function () {
    assert.throws(function () {
      servo({pwm: pwm, channel: 0}).moveTo(-1);
    }, Error, 'no errors thrown!');

    assert.throws(function () {
      servo({pwm: pwm, channel: 0}).moveTo(101);
    }, Error, 'no errors thrown!');
  });

  describe('default servo calibration', function () {
    let defMinCount = 143.36;
    let defMaxCount = 655.36;
    let defFreq = 50;

    it('should set PWM freq on move', function () {
      inst.moveTo(0);
      assert(pwm.setPWMFreq.calledWith(defFreq), 'pwm.setPWMFreq should have been called with default freq :' + defFreq);
    });

    it('should move to 0', function () {
      inst.moveTo(0);
      assert(pwm.setPWM.calledWith(0, 0, defMinCount), 'pwm.setPWM should have been called with default minCount:' + defMinCount);
    });

    it('should move to 100', function () {
      inst.moveTo(100);
      assert(pwm.setPWM.calledWith(0, 0, defMaxCount), 'pwm.setPWM should have been called with default maxCount:' + defMaxCount);
    });

    it('should move to 50', function () {
      inst.moveTo(50);
      assert(pwm.setPWM.calledWith(0, 0, (defMaxCount + defMinCount) / 2), 'pwm.setPWM should have been called with 50%');
    });
  });

  describe('update servo calibrations', function () {
    let newFreq = 40;
    let newMinCount = 1 * 40 * 4096 / 1000;
    let newMaxCount = 2 * 40 * 4096 / 1000;

    it('should recalibrate the max and min points and PWM frequency', function () {
      inst.calibrate(40, 1, 2);
    });

    it('should set PWM freq on move with the new params', function () {
      inst.moveTo(0);
      assert(pwm.setPWMFreq.calledWith(newFreq), 'pwm.setPWMFreq should have been called with default freq :' + newFreq);
    });

    it('should move to 0 with the new params', function () {
      inst.moveTo(0);
      assert(pwm.setPWM.calledWith(0, 0, newMinCount), 'pwm.setPWM should have been called with default minCount:' + newMinCount);
    });

    it('should move to 100 with the new params', function () {
      inst.moveTo(100);
      assert(pwm.setPWM.calledWith(0, 0, newMaxCount), 'pwm.setPWM should have been called with default maxCount:' + newMaxCount);
    });

    it('should move to 50 with the new params', function () {
      inst.moveTo(50);
      assert(pwm.setPWM.calledWith(0, 0, (newMaxCount + newMinCount) / 2), 'pwm.setPWM should have been called with 50%');
    });
  });
});
