'use strict';
require('should');
require('should-sinon');
let debug = require('debug')('motor-hat:test');
let sinon = require('sinon');
let stepper = require('../dist/stepper.js');
let pwm = {
  setPWM: sinon.spy(),
  setPWMFreq: sinon.spy(),
  setPin: sinon.spy(),
  resetAll: function () {
    pwm.setPWM.reset();
    pwm.setPWMFreq.reset();
    pwm.setPin.reset();
  }
};

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

let checkExpected = function (json, pwm, p, steps) {
  var expected = require(json);
  expected[-1] = {PWMA: -1, PWMB: -1, AIN1: -1, AIN2: -1, BIN1: -1, BIN2: -1};
  let step = 0;
  let pwmcall = 0;
  let pincall = 0;
  while (steps--) {
    if (expected[step].PWMA !== expected[step - 1].PWMA) {
      pwm.setPWM.getCall(pwmcall++).args.should.deepEqual([p.W1.PWM, 0, expected[step].PWMA]);
    }
    if (expected[step].PWMB !== expected[step - 1].PWMB) {
      pwm.setPWM.getCall(pwmcall++).args.should.deepEqual([p.W2.PWM, 0, expected[step].PWMB]);
    }
    if (expected[step].AIN2 !== expected[step - 1].AIN2) {
      debug(pincall);
      debug(pwm.setPin.getCall(pincall).args);
      pwm.setPin.getCall(pincall++).args.should.deepEqual([p.W1.IN2, expected[step].AIN2]);
    }
    if (expected[step].BIN1 !== expected[step - 1].BIN1) {
      debug(pincall);
      debug(pwm.setPin.getCall(pincall).args);
      pwm.setPin.getCall(pincall++).args.should.deepEqual([p.W2.IN1, expected[step].BIN1]);
    }
    if (expected[step].AIN1 !== expected[step - 1].AIN1) {
      debug(pincall);
      debug(pwm.setPin.getCall(pincall).args);
      pwm.setPin.getCall(pincall++).args.should.deepEqual([p.W1.IN1, expected[step].AIN1]);
    }
    if (expected[step].BIN2 !== expected[step - 1].BIN2) {
      debug(pincall);
      debug(pwm.setPin.getCall(pincall).args);
      pwm.setPin.getCall(pincall++).args.should.deepEqual([p.W2.IN2, expected[step].BIN2]);
    }
    step++;
  }
};

describe('lib/stepperlib.js', function () {
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
    beforeEach(function () {
      pwm.resetAll();
    });

    var steps = 4;
    let p = {W1: [8, 10, 9], W2: [13, 11, 12]};
    var po = {};
    po.W1 = {PWM: p.W1[0], IN1: p.W1[1], IN2: p.W1[2]};
    po.W2 = {PWM: p.W2[0], IN1: p.W2[1], IN2: p.W2[2]};

    it('should do 4 double steps fwd', function () {
      let inst = stepper({pwm: pwm, pins: p, pps: 600});
      inst.stepSync('fwd', steps);

      checkExpected('./doublefwd.json', pwm, po, steps);
    });

    it('should do 4 double steps back', function () {
      let inst = stepper({pwm: pwm, pins: p, pps: 600});
      inst.stepSync('back', steps);

      checkExpected('./doubleback.json', pwm, po, steps);
    });
  });

  describe('single stepping', function () {
    beforeEach(function () {
      pwm.resetAll();
    });

    let channel = 0;
    var steps = 4;
    let p = ports[channel];

    it('should do 4 single steps fwd', function () {
      let inst = stepper({pwm: pwm, pins: p, style: 'single', pps: 600});
      inst.stepSync('fwd', steps);

      checkExpected('./singlefwd.json', pwm, p, steps);
    });

    it('should do 4 single steps back', function () {
      let inst = stepper({pwm: pwm, pins: p, style: 'single', pps: 600});
      inst.stepSync('back', steps);

      checkExpected('./singleback.json', pwm, p, steps);
    });
  });

  describe('8 microstepping', function () {
    beforeEach(function () {
      pwm.resetAll();
    });

    let channel = 0;
    var steps = 4 * 8;
    let p = ports[channel];

    it('should do 4 * 8 microsteps fwd', function () {
      let inst = stepper({pwm: pwm, pins: p, style: 'microstep', pps: 600});
      inst.stepSync('fwd', steps);

      checkExpected('./micro8fwd.json', pwm, p, steps);
    });

    it('should do 4 * 8 microsteps back', function () {
      let inst = stepper({pwm: pwm, pins: p, style: 'microstep', pps: 600});
      inst.stepSync('back', steps);

      checkExpected('./micro8back.json', pwm, p, steps);
    });
  });

  describe('16 microstepping', function () {
    beforeEach(function () {
      pwm.resetAll();
    });

    let channel = 0;
    var steps = 4 * 16;
    let p = ports[channel];

    it('should do 4 * 16 microsteps', function () {
      let inst = stepper({pwm: pwm, pins: p, style: 'microstep', microsteps: 16});
      inst.setSpeed({rpm: 6000});
      inst.stepSync('fwd', steps);

      checkExpected('./micro16.json', pwm, p, steps);
    });
  });

  describe('interleaved stepping', function () {
    beforeEach(function () {
      pwm.resetAll();
    });

    let channel = 0;
    var steps = 8;
    let p = ports[channel];

    it('should do 8 interleaved steps fwd', function () {
      let inst = stepper({pwm: pwm, pins: p, style: 'interleaved', pps: 600});

      inst.stepSync('fwd', steps);

      checkExpected('./interleavedfwd.json', pwm, p, steps);
    });

    it('should do 4 * 8 interleaved steps back', function () {
      let inst = stepper({pwm: pwm, pins: p, style: 'interleaved', pps: 600});

      inst.stepSync('back', steps);

      checkExpected('./interleavedback.json', pwm, p, steps);
    });
  });
});
