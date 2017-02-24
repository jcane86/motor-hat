'use strict';

require('should');
require('should-sinon');
const sinon = require('sinon');
const stepper = require('../lib/stepper.js');

const pwm = {
  setPWM: sinon.spy(),
  setPWMFreq: sinon.spy(),
  setPin: sinon.spy(),
  resetAll() {
    pwm.setPWM.reset();
    pwm.setPWMFreq.reset();
    pwm.setPin.reset();
  },
};

const seqdoublefwd = './stepsequences/doublefwd.json';
const seqdoubleback = './stepsequences/doubleback.json';
const seqsinglefwd = './stepsequences/singlefwd.json';
const seqsingleback = './stepsequences/singleback.json';
const seqmicro8fwd = './stepsequences/micro8fwd.json';
const seqmicro8back = './stepsequences/micro8back.json';
const seqmicro16fwd = './stepsequences/micro16fwd.json';
// let seqmicro16back = './stepsequences/micro16back.json';
const seqinterleavedfwd = './stepsequences/interleavedfwd.json';
const seqinterleavedback = './stepsequences/interleavedback.json';

const ports = [{
  // channel 0 ports
  W1: {
    PWM: 8,
    IN1: 10,
    IN2: 9,
  },
  W2: {
    PWM: 13,
    IN2: 12,
    IN1: 11,
  },
}, {
  // channel 1 ports
  W1: {
    PWM: 2,
    IN2: 3,
    IN1: 4,
  },
  W2: {
    PWM: 7,
    IN2: 6,
    IN1: 5,
  },
}];

const checkExpected = function (json, pwmInst, p, steps) {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const expected = require(json);
  let count;
  expected[-1] = { PWMA: -1, PWMB: -1, AIN1: -1, AIN2: -1, BIN1: -1, BIN2: -1 };
  let step = 0;
  let pwmcall = 0;
  let pincall = 0;
  for (count = 0; count < steps; count += 1) {
    if (expected[step].PWMA !== expected[step - 1].PWMA) {
      pwmInst.setPWM.getCall(pwmcall).args.should.deepEqual([p.W1.PWM, 0, expected[step].PWMA]);
      pwmcall += 1;
    }
    if (expected[step].PWMB !== expected[step - 1].PWMB) {
      pwmInst.setPWM.getCall(pwmcall).args.should.deepEqual([p.W2.PWM, 0, expected[step].PWMB]);
      pwmcall += 1;
    }
    if (expected[step].AIN2 !== expected[step - 1].AIN2) {
      pwmInst.setPin.getCall(pincall).args.should.deepEqual([p.W1.IN2, expected[step].AIN2]);
      pincall += 1;
    }
    if (expected[step].BIN1 !== expected[step - 1].BIN1) {
      pwmInst.setPin.getCall(pincall).args.should.deepEqual([p.W2.IN1, expected[step].BIN1]);
      pincall += 1;
    }
    if (expected[step].AIN1 !== expected[step - 1].AIN1) {
      pwmInst.setPin.getCall(pincall).args.should.deepEqual([p.W1.IN1, expected[step].AIN1]);
      pincall += 1;
    }
    if (expected[step].BIN2 !== expected[step - 1].BIN2) {
      pwmInst.setPin.getCall(pincall).args.should.deepEqual([p.W2.IN2, expected[step].BIN2]);
      pincall += 1;
    }
    step += 1;
  }
};

describe('lib/stepper.js', () => {
  it('should have constructor', () => {
    stepper.should.be.type('function');
  });

  it('should require options object to initialize', () => {
    (function () {
      stepper();
    }).should.throw();
  });

  it('should require W1 and W2 pins to initialize', () => {
    (function () {
      stepper({ pwm: {} });
    }).should.throw();

    (function () {
      stepper({ pwm: {}, pins: { W1: [0, 1, 2] } });
    }).should.throw();

    (function () {
      stepper({ pwm: {}, pins: { W2: [0, 1, 2] } });
    }).should.throw();
  });

  it('should require exactly 6 pins', () => {
    (function () {
      stepper({ pwm: {}, pins: { W1: [0, 1, 2], W2: [3, 4, 5, 6] } });
    }).should.throw();

    (function () {
      stepper({ pwm: {}, pins: { W1: [0, 1], W2: [2, 3, 4] } });
    }).should.throw();
  });

  it('should require pins in [0 to 15]', () => {
    (function () {
      stepper({ pwm: {}, pins: { W1: [16, 1, 2], W2: [3, 4, 5] } });
    }).should.throw();

    (function () {
      stepper({ pwm: {}, pins: { W1: [-1, 3, 4], W2: [5, 6, 7] } });
    }).should.throw();
  });

  it('should require pwm instance to initialize', () => {
    (function () {
      stepper({ pins: ports[0] });
    }).should.throw();
  });

  it('should fail without speed', () => {
    (function () {
      stepper({ pwm: { setPWMFreq() {} }, pins: ports[0] }).stepSync('fwd', 4);
    }).should.throw();
  });

  it('should initialize', () => {
    (function () {
      stepper({ pwm: { setPWMFreq() {} }, pins: ports[0] });
    }).should.not.throw();
  });

  describe('setSteps()', () => {
    it('should validate steps', () => {
      (function () {
        stepper({ pwm: { setPWMFreq() {} }, pins: ports[0] }).setSteps('test');
      }).should.throw();

      (function () {
        stepper({ pwm: { setPWMFreq() {} }, pins: ports[0] }).setSteps(64 * 32);
      }).should.not.throw();
    });

    it('should re-set speed if it was configured in rpm', () => {
      const inst = stepper({ pwm: { setPWMFreq() {} }, pins: ports[0], rpm: 600, steps: 100 });

      const oldfreq = inst.options.pulsefreq;
      inst.setSteps(300);
      inst.options.pulsefreq.should.not.equal(oldfreq);
    });
  });

  describe('setSpeed()', () => {
    it('should validate speed', () => {
      (function () {
        stepper({ pwm: { setPWMFreq() {} }, pins: ports[0] }).setSpeed('test');
      }).should.throw();

      (function () {
        stepper({ pwm: { setPWMFreq() {} }, pins: ports[0] }).setSpeed({ rpm: 200 });
      }).should.not.throw();
    });

    it('should re-set speed if it was configured in rpm', () => {
      const inst = stepper({ pwm: { setPWMFreq() {} }, pins: ports[0], rpm: 600, steps: 100 });

      const oldfreq = inst.options.pulsefreq;
      inst.setSpeed({ rpm: 200 });
      inst.options.pulsefreq.should.not.equal(oldfreq);
    });

    it('should re-set speed if it was configured in pps', () => {
      const inst = stepper({ pwm: { setPWMFreq() {} }, pins: ports[0], pps: 600, steps: 100 });

      const oldfreq = inst.options.pulsefreq;
      inst.setSpeed({ pps: 200 });
      inst.options.pulsefreq.should.not.equal(oldfreq);
    });

    it('should re-set speed if it was configured in sps', () => {
      const inst = stepper({ pwm: { setPWMFreq() {} }, pins: ports[0], sps: 600, steps: 100 });

      const oldfreq = inst.options.pulsefreq;
      inst.setSpeed({ sps: 200 });
      inst.options.pulsefreq.should.not.equal(oldfreq);
    });
  });

  describe('double stepping (by default)', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const steps = 4;
    const p = { W1: [8, 10, 9], W2: [13, 11, 12] };
    const po = {};
    po.W1 = { PWM: p.W1[0], IN1: p.W1[1], IN2: p.W1[2] };
    po.W2 = { PWM: p.W2[0], IN1: p.W2[1], IN2: p.W2[2] };

    it('should do 4 double steps fwd', () => {
      const inst = stepper({ pwm, pins: p, pps: 600 });
      inst.stepSync('fwd', steps);

      checkExpected(seqdoublefwd, pwm, po, steps);
    });

    it('should do 4 double steps back', () => {
      const inst = stepper({ pwm, pins: p, pps: 600 });
      inst.stepSync('back', steps);

      checkExpected(seqdoubleback, pwm, po, steps);
    });
  });

  describe('single stepping', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const channel = 0;
    const steps = 4;
    const p = ports[channel];

    it('should do 4 single steps fwd', () => {
      const inst = stepper({ pwm, pins: p, style: 'single', pps: 600 });
      inst.stepSync('fwd', steps);

      checkExpected(seqsinglefwd, pwm, p, steps);
    });

    it('should do 4 single steps back', () => {
      const inst = stepper({ pwm, pins: p, style: 'single', pps: 600 });
      inst.stepSync('back', steps);

      checkExpected(seqsingleback, pwm, p, steps);
    });
  });

  describe('8 microstepping', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const channel = 0;
    const steps = 4 * 8;
    const p = ports[channel];

    it('should do 4 * 8 microsteps fwd', () => {
      const inst = stepper({ pwm, pins: p, style: 'microstep', pps: 600 });
      inst.stepSync('fwd', steps);

      checkExpected(seqmicro8fwd, pwm, p, steps);
    });

    it('should do 4 * 8 microsteps back', () => {
      const inst = stepper({ pwm, pins: p, style: 'microstep', pps: 600 });
      inst.stepSync('back', steps);

      checkExpected(seqmicro8back, pwm, p, steps);
    });
  });

  describe('16 microstepping', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const channel = 0;
    const steps = 4 * 16;
    const p = ports[channel];

    it('should do 4 * 16 microsteps', () => {
      const inst = stepper({ pwm, pins: p, style: 'microstep', microsteps: 16 });
      inst.setSpeed({ rpm: 6000 });
      inst.stepSync('fwd', steps);

      checkExpected(seqmicro16fwd, pwm, p, steps);
    });
  });

  describe('interleaved stepping', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const channel = 0;
    const steps = 8;
    const p = ports[channel];

    it('should do 8 interleaved steps fwd', () => {
      const inst = stepper({ pwm, pins: p, style: 'interleaved', pps: 600 });
      inst.stepSync('fwd', steps);

      checkExpected(seqinterleavedfwd, pwm, p, steps);
    });

    it('should do 4 * 8 interleaved steps back', () => {
      const inst = stepper({ pwm, pins: p, style: 'interleaved', pps: 600 });
      inst.stepSync('back', steps);

      checkExpected(seqinterleavedback, pwm, p, steps);
    });
  });
});
