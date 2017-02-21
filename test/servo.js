'use strict';
require('should');
require('should-sinon');
let sinon = require('sinon');
let servo = require('../dist/servo.js');
let pwm = {
  setPWM: sinon.spy(),
  setPWMFreq: sinon.spy()
};

describe('lib/servolib.js', function () {
  it('should have constructor', function () {
    servo.should.be.type('function');
  });

  it('should require options object to initialize', function () {
    (function () {
      servo();
    }).should.throw();
  });

  it('should require pin to initialize', function () {
    (function () {
      servo({pwm: pwm});
    }).should.throw();
  });

  it('should require pins in [0 to 15]', function () {
    (function () {
      servo({pwm: pwm, pin: 16});
    }).should.throw();

    (function () {
      servo({pwm: pwm, pin: -1});
    }).should.throw();
  });

  it('should require pwm instance to initialize', function () {
    (function () {
      servo({pin: 2});
    }).should.throw();
  });

  it('should initialize', function () {
    (function () {
      servo({pwm: pwm, pin: 0});
    }).should.not.throw();
  });

  let inst = servo({pwm: pwm, pin: 0});

  it('should reject bad moveTo params', function () {
    (function () {
      servo({pwm: pwm, pin: 0}).moveTo(-1);
    }).should.throw();

    (function () {
      servo({pwm: pwm, pin: 0}).moveTo(101);
    }).should.throw();
  });

  describe('default servolib calibration', function () {
    let defMinCount = 143.36;
    let defMaxCount = 655.36;
    let defFreq = 50;

    it('should set PWM freq on move', function () {
      inst.moveTo(0);
      pwm.setPWMFreq.should.be.calledWith(defFreq);
    });

    it('should move to 0', function () {
      inst.moveTo(0);
      pwm.setPWM.should.be.calledWith(0, 0, defMinCount);
    });

    it('should move to 100', function () {
      inst.moveTo(100);
      pwm.setPWM.should.be.calledWith(0, 0, defMaxCount);
    });

    it('should move to 50', function () {
      inst.moveTo(50);
      pwm.setPWM.should.be.calledWith(0, 0, (defMaxCount + defMinCount) / 2);
    });
  });

  describe('update servolib calibrations', function () {
    let newFreq = 40;
    let minMs = 1;
    let maxMs = 2;
    let newMinCount = minMs * 40 * 4096 / 1000;
    let newMaxCount = maxMs * 40 * 4096 / 1000;

    it('should recalibrate the max and min points and PWM frequency', function () {
      inst.calibrate(40, minMs, maxMs);
    });

    it('should set PWM freq on move with the new params', function () {
      inst.moveTo(0);
      pwm.setPWMFreq.should.be.calledWith(newFreq);
    });

    it('should move to 0 with the new params', function () {
      inst.moveTo(0);
      pwm.setPWM.should.be.calledWith(0, 0, newMinCount);
    });

    it('should move to 100 with the new params', function () {
      inst.moveTo(100);
      pwm.setPWM.should.be.calledWith(0, 0, newMaxCount);
    });

    it('should move to 50 with the new params', function () {
      inst.moveTo(50);
      pwm.setPWM.should.be.calledWith(0, 0, (newMaxCount + newMinCount) / 2);
    });
  });
});
