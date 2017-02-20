'use strict';
require('should');
require('should-sinon');
let sinon = require('sinon');
let stepper = require('../dist/stepper.js');

let ports = [{
  // channel 0 ports
  W1: {
    PWM: 8,
    IN1: 10,
    IN2: 9
  },
  W2: {
    PWM: 13,
    IN2: 12,
    IN1: 11
  }
}, {
  // channel 1 ports
  W1: {
    PWM: 2,
    IN2: 3,
    IN1: 4
  },
  W2: {
    PWM: 7,
    IN2: 6,
    IN1: 5
  }
}];

describe('lib/stepper.js', function () {
  it('should have constructor', function () {
    stepper.should.be.type('function');
  });

  it('should require options object to initialize', function () {
    (function () {
      stepper();
    }).should.throw();
  });

  it('should require W1 and W2 pins to initialize', function () {
    (function () {
      stepper({pwm: {}});
    }).should.throw();

    (function () {
      stepper({pwm: {}, pins: {W1: [0, 1, 2]}});
    }).should.throw();

    (function () {
      stepper({pwm: {}, pins: {W2: [0, 1, 2]}});
    }).should.throw();
  });

  it('should require exactly 6 pins', function () {
    (function () {
      stepper({pwm: {}, pins: {W1: [0, 1, 2], W2: [3, 4, 5, 6]}});
    }).should.throw();

    (function () {
      stepper({pwm: {}, pins: {W1: [0, 1], W2: [2, 3, 4]}});
    }).should.throw();
  });

  it('should require pins in [0 to 15]', function () {
    (function () {
      stepper({pwm: {}, pins: {W1: [16, 1, 2], W2: [3, 4, 5]}});
    }).should.throw();

    (function () {
      stepper({pwm: {}, pins: {W1: [-1, 3, 4], W2: [5, 6, 7]}});
    }).should.throw();
  });

  it('should require pwm instance to initialize', function () {
    (function () {
      stepper({pins: ports[0]});
    }).should.throw();
  });

  it('should fail without speed', function () {
    (function () {
      stepper({pwm: {setPWMFreq: function () {}}, pins: ports[0]}).stepSync('fwd', 4);
    }).should.throw();
  });

  it('should initialize', function () {
    (function () {
      stepper({pwm: {setPWMFreq: function () {}}, pins: ports[0]});
    }).should.not.throw();
  });

  describe('double stepping (by default)', function () {
    let checkDoubleStep = function (pwm, i, channel, dir) {
      let p = ports[channel];
      let step2coils = [
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 1],
        [1, 0, 0, 1]
      ];

      for (let j = 0; j < i; j++) {
        var pwmCall = j * 2;
        var pinCall = j * 4;

        let step = j % 4;
        if (dir === 'back') {
          step = (-(j + 1) + 4) % 4;
        }

        pwm.setPWM.getCall(pwmCall).args.should.deepEqual([p.W1.PWM, 0, 255 * 16]);
        pwm.setPWM.getCall(pwmCall + 1).args.should.deepEqual([p.W2.PWM, 0, 255 * 16]);
        pwm.setPin.getCall(pinCall).args.should.deepEqual([p.W1.IN2, step2coils[step][0]]);
        pwm.setPin.getCall(pinCall + 1).args.should.deepEqual([p.W2.IN1, step2coils[step][1]]);
        pwm.setPin.getCall(pinCall + 2).args.should.deepEqual([p.W1.IN1, step2coils[step][2]]);
        pwm.setPin.getCall(pinCall + 3).args.should.deepEqual([p.W2.IN2, step2coils[step][3]]);
      }
      return true;
    };

    it('should do 4 double steps fwd', function () {
      let pwm = {
        setPWM: sinon.spy(),
        setPWMFreq: sinon.spy(),
        setPin: sinon.spy()
      };
      let inst = stepper({pwm: pwm, pins: {W1: [8, 10, 9], W2: [13, 11, 12]}, pps: 600});
      inst.stepSync('fwd', 4);
      checkDoubleStep(pwm, 4, 0, 'fwd');
    });

    it('should do 4 double steps back', function () {
      let pwm = {
        setPWM: sinon.spy(),
        setPWMFreq: sinon.spy(),
        setPin: sinon.spy()
      };
      let inst = stepper({pwm: pwm, pins: ports[0], pps: 600});
      inst.stepSync('back', 4);
      checkDoubleStep(pwm, 4, 0, 'back');
    });
  });

  describe('single stepping', function () {
    let pwm = {
      setPWM: sinon.spy(),
      setPWMFreq: sinon.spy(),
      setPin: sinon.spy()
    };
    beforeEach(function () {
      pwm.setPWM.reset();
      pwm.setPWMFreq.reset();
      pwm.setPin.reset();
    });

    let checkSingleStep = function (pwm, i, channel, dir) {
      let p = ports[channel];
      let step2coils = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ];

      for (let j = 1; j < i; j++) {
        var pwmCall = (j - 1) * 2;
        var pinCall = (j - 1) * 4;

        let step = j % 4;
        if (dir === 'back') {
          step = (-(j) + 4) % 4;
        }
        pwm.setPWM.getCall(pwmCall).args.should.deepEqual([p.W1.PWM, 0, 255 * 16]);
        pwm.setPWM.getCall(pwmCall + 1).args.should.deepEqual([p.W2.PWM, 0, 255 * 16]);
        pwm.setPin.getCall(pinCall).args.should.deepEqual([p.W1.IN2, step2coils[step][0]]);
        pwm.setPin.getCall(pinCall + 1).args.should.deepEqual([p.W2.IN1, step2coils[step][1]]);
        pwm.setPin.getCall(pinCall + 2).args.should.deepEqual([p.W1.IN1, step2coils[step][2]]);
        pwm.setPin.getCall(pinCall + 3).args.should.deepEqual([p.W2.IN2, step2coils[step][3]]);
      }
      return true;
    };

    it('should do 4 single steps fwd', function () {
      let inst = stepper({pwm: pwm, pins: ports[0], style: 'single', pps: 600});
      inst.stepSync('fwd', 4);
      checkSingleStep(pwm, 4, 0, 'fwd');
    });

    it('should do 4 single steps back', function () {
      let inst = stepper({pwm: pwm, pins: ports[0], style: 'single', pps: 600});
      inst.stepSync('back', 4);
      checkSingleStep(pwm, 4, 0, 'back');
    });
  });

  describe('8 microstepping', function () {
    let pwm = {
      setPWM: sinon.spy(),
      setPWMFreq: sinon.spy(),
      setPin: sinon.spy()
    };
    beforeEach(function () {
      pwm.setPWM.reset();
      pwm.setPWMFreq.reset();
      pwm.setPin.reset();
    });

    let check8MicroStep = function (pwm, i, channel, dir) {
      let p = ports[channel];
      let step2coils = [
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 1],
        [1, 0, 0, 1]
      ];

      let expectedPWM = [
        255, 250, 236, 212, 180, 142, 98, 50,
        0, 50, 98, 142, 180, 212, 236, 250
      ];

      for (let j = 1; j < i; j++) {
        var pwmCall = (j - 1) * 2;
        var pinCall = (j - 1) * 4;

        let step = Math.floor((j / 8) % 4);
        let pwmstepA = j % 16;
        let pwmstepB = (j + 8) % 16;
        if (dir === 'back') {
          step = Math.floor(((-j / 8) + 4) % 4);
          pwmstepA = ((-(j) % 16) + 16) % 16;
          pwmstepB = (((-j + 8) % 16) + 16) % 16;
        }
        pwm.setPWM.getCall(pwmCall).args.should.deepEqual([p.W1.PWM, 0, expectedPWM[pwmstepA] * 16]);
        pwm.setPWM.getCall(pwmCall + 1).args.should.deepEqual([p.W2.PWM, 0, expectedPWM[pwmstepB] * 16]);
        pwm.setPin.getCall(pinCall).args.should.deepEqual([p.W1.IN2, step2coils[step][0]]);
        pwm.setPin.getCall(pinCall + 1).args.should.deepEqual([p.W2.IN1, step2coils[step][1]]);
        pwm.setPin.getCall(pinCall + 2).args.should.deepEqual([p.W1.IN1, step2coils[step][2]]);
        pwm.setPin.getCall(pinCall + 3).args.should.deepEqual([p.W2.IN2, step2coils[step][3]]);
      }
      return true;
    };

    it('should do 4 * 8 microsteps fwd', function () {
      let inst = stepper({pwm: pwm, pins: ports[0], style: 'microstep', pps: 600});
      for (let j = 1; j < 4; j++) {
        inst.stepSync('fwd', 8);
        check8MicroStep(pwm, 8, 0, 'fwd').should.be.true();
      }
    });

    it('should do 4 * 8 microsteps back', function () {
      let inst = stepper({pwm: pwm, pins: ports[0], style: 'microstep', pps: 600});
      for (let j = 1; j < 4; j++) {
        inst.stepSync('back', 8);
        check8MicroStep(pwm, 8, 0, 'back').should.be.true();
      }
    });
  });

  describe('16 microstepping', function () {
    let pwm = {
      setPWM: sinon.spy(),
      setPWMFreq: sinon.spy(),
      setPin: sinon.spy()
    };
    let inst = stepper({pwm: pwm, pins: ports[0], style: 'microstep', microsteps: 16});
    let check16MicroStep = function (i, channel) {
      let p = ports[channel];
      let step2coils = [
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 1],
        [1, 0, 0, 1]
      ];

      let expectedPWM = [
        255, 253, 250, 244, 236, 225, 212, 197, 180, 162, 141, 120, 98, 74, 50, 25,
        0, 25, 50, 74, 98, 120, 141, 162, 180, 197, 212, 225, 236, 244, 250, 253
      ];

      for (let j = 1; j < i; j++) {
        var pwmCall = (j - 1) * 2;
        var pinCall = (j - 1) * 4;

        pwm.setPWM.getCall(pwmCall).args.should.deepEqual([p.W1.PWM, 0, expectedPWM[j % 32] * 16]);
        pwm.setPWM.getCall(pwmCall + 1).args.should.deepEqual([p.W2.PWM, 0, expectedPWM[(j + 16) % 32] * 16]);
        pwm.setPin.getCall(pinCall).args.should.deepEqual([p.W1.IN2, step2coils[Math.floor(j / 16) % 4][0]]);
        pwm.setPin.getCall(pinCall + 1).args.should.deepEqual([p.W2.IN1, step2coils[Math.floor(j / 16) % 4][1]]);
        pwm.setPin.getCall(pinCall + 2).args.should.deepEqual([p.W1.IN1, step2coils[Math.floor(j / 16) % 4][2]]);
        pwm.setPin.getCall(pinCall + 3).args.should.deepEqual([p.W2.IN2, step2coils[Math.floor(j / 16) % 4][3]]);
      }
      return true;
    };
    inst.setSpeed({pps: 6000});

    it('should do 4 * 16 microsteps', function () {
      for (let j = 1; j < 4; j++) {
        inst.stepSync('fwd', 16);
        check16MicroStep(16, 0).should.be.true();
      }
    });
  });

  describe('interleaved stepping', function () {
    let pwm = {
      setPWM: sinon.spy(),
      setPWMFreq: sinon.spy(),
      setPin: sinon.spy()
    };
    beforeEach(function () {
      pwm.setPWM.reset();
      pwm.setPWMFreq.reset();
      pwm.setPin.reset();
    });
    let checkInterleavedStep = function (pwm, i, channel, dir) {
      let p = ports[channel];
      let step2coils = [
        [1, 0, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 1],
        [0, 0, 0, 1],
        [1, 0, 0, 1]
      ];

      for (let j = 1; j < i; j++) {
        var pwmCall = (j - 1) * 2;
        var pinCall = (j - 1) * 4;
        var k = (dir === 'fwd') ? j : ((-j % 8) + 8);
        pwm.setPWM.getCall(pwmCall).args.should.deepEqual([p.W1.PWM, 0, 255 * 16]);
        pwm.setPWM.getCall(pwmCall + 1).args.should.deepEqual([p.W2.PWM, 0, 255 * 16]);
        pwm.setPin.getCall(pinCall).args.should.deepEqual([p.W1.IN2, step2coils[k % 8][0]]);
        pwm.setPin.getCall(pinCall + 1).args.should.deepEqual([p.W2.IN1, step2coils[k % 8][1]]);
        pwm.setPin.getCall(pinCall + 2).args.should.deepEqual([p.W1.IN1, step2coils[k % 8][2]]);
        pwm.setPin.getCall(pinCall + 3).args.should.deepEqual([p.W2.IN2, step2coils[k % 8][3]]);
      }
      return true;
    };

    it('should do 4 * 8 interleaved steps fwd', function () {
      let inst = stepper({pwm: pwm, pins: ports[0], style: 'interleaved', pps: 600});
      for (let j = 1; j < 4; j++) {
        inst.stepSync('fwd', 8);
        checkInterleavedStep(pwm, 8, 0, 'fwd').should.be.true();
      }
    });

    it('should do 4 * 8 interleaved steps back', function () {
      let inst = stepper({pwm: pwm, pins: ports[0], style: 'interleaved', rpm: 6000});
      for (let j = 1; j < 4; j++) {
        inst.stepSync('back', 8);
        checkInterleavedStep(pwm, 8, 0, 'back').should.be.true();
      }
    });
  });
});
