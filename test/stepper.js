'use strict';

const should = require('should');
require('should-sinon');
const sinon = require('sinon');
const stepper = require('../lib/stepper.js');

const pwm = {
  setPWMSync: sinon.stub(),
  setPWMFreqSync: sinon.stub(),
  setPinSync: sinon.stub(),
  setPWM: sinon.stub().yieldsAsync(null),
  setPWMFreq: sinon.stub().yieldsAsync(null),
  setPin: sinon.stub().yieldsAsync(null),
  resetAll() {
    pwm.setPWM.resetHistory();
    pwm.setPWMFreq.resetHistory();
    pwm.setPin.resetHistory();
    pwm.setPWMSync.reset();
    pwm.setPWMFreqSync.reset();
    pwm.setPinSync.reset();
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

const checkExpected = function (json, pwmInst, p, steps, sync = true) {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const expected = require(json);
  let count;
  expected[-1] = {
    PWMA: -1, PWMB: -1, AIN1: -1, AIN2: -1, BIN1: -1, BIN2: -1,
  };
  let step = 0;
  let pwmcall = 0;
  let pincall = 0;
  const pwmfun = sync ? pwmInst.setPWMSync : pwmInst.setPWM;
  const pinfun = sync ? pwmInst.setPinSync : pwmInst.setPin;
  for (count = 0; count < steps; count += 1) {
    if (expected[step].PWMA !== expected[step - 1].PWMA) {
      pwmfun.getCall(pwmcall).args.slice(0, 3).should.deepEqual([p.W1.PWM, 0, expected[step].PWMA]);
      pwmcall += 1;
    }
    if (expected[step].PWMB !== expected[step - 1].PWMB) {
      pwmfun.getCall(pwmcall).args.slice(0, 3).should.deepEqual([p.W2.PWM, 0, expected[step].PWMB]);
      pwmcall += 1;
    }
    if (expected[step].AIN2 !== expected[step - 1].AIN2) {
      pinfun.getCall(pincall).args.slice(0, 2).should.deepEqual([p.W1.IN2, expected[step].AIN2]);
      pincall += 1;
    }
    if (expected[step].BIN1 !== expected[step - 1].BIN1) {
      pinfun.getCall(pincall).args.slice(0, 2).should.deepEqual([p.W2.IN1, expected[step].BIN1]);
      pincall += 1;
    }
    if (expected[step].AIN1 !== expected[step - 1].AIN1) {
      pinfun.getCall(pincall).args.slice(0, 2).should.deepEqual([p.W1.IN1, expected[step].AIN1]);
      pincall += 1;
    }
    if (expected[step].BIN2 !== expected[step - 1].BIN2) {
      pinfun.getCall(pincall).args.slice(0, 2).should.deepEqual([p.W2.IN2, expected[step].BIN2]);
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
      stepper().init();
    }).should.throw();
  });

  it('should require W1 and W2 pins to initialize', () => {
    (function () {
      stepper({ pwm }).init();
    }).should.throw();

    (function () {
      stepper({ pwm, pins: { W1: [0, 1, 2] } }).init();
    }).should.throw();

    (function () {
      stepper({ pwm, pins: { W2: [0, 1, 2] } }).init();
    }).should.throw();
  });

  it('should require exactly 6 pins', () => {
    (function () {
      stepper({ pwm, pins: { W1: [0, 1, 2], W2: [3, 4, 5, 6] } }).init();
    }).should.throw();

    (function () {
      stepper({ pwm, pins: { W1: [0, 1], W2: [2, 3, 4] } }).init();
    }).should.throw();
  });

  it('should require pins in [0 to 15]', () => {
    (function () {
      stepper({ pwm, pins: { W1: [16, 1, 2], W2: [3, 4, 5] } }).init();
    }).should.throw();

    (function () {
      stepper({ pwm, pins: { W1: [-1, 3, 4], W2: [5, 6, 7] } }).init();
    }).should.throw();
  });

  it('should require pwm instance to initialize', () => {
    (function () {
      stepper({ pins: ports[0] }).init();
    }).should.throw();
  });

  it('should fail without speed', () => {
    (function () {
      stepper({ pwm, pins: ports[0] }).init().stepSync('fwd', 4);
    }).should.throw();
  });

  it('should fail without speed (async)', () => {
    (function () {
      stepper({ pwm, pins: ports[0] }).init().step('fwd', 4, () => {
      });
    }).should.throw();
  });

  it('should initialize synchronously', () => {
    (function () {
      stepper({ pwm, pins: ports[0] }).init();
    }).should.not.throw();
  });

  it('should initialize asynchronously', (done) => {
    (function () {
      stepper({ pwm, pins: ports[0] }).init((err) => {
        should.equal(err, null);
        done();
      });
    }).should.not.throw();
  });

  it('should require callbacks for asynch methods', () => {
    (function () {
      stepper({ pwm, pins: ports[0] }).init().step('fwd', 50);
    }).should.throw();

    (function () {
      stepper({ pwm, pins: ports[0] }).init().oneStep('fwd');
    }).should.throw();

    (function () {
      stepper({ pwm, pins: ports[0] }).init().setFrequency(1600);
    }).should.throw();
  });

  describe('setSteps()', () => {
    it('should validate steps', () => {
      (function () {
        stepper({ pwm, pins: ports[0] }).init().setSteps('test');
      }).should.throw();

      (function () {
        stepper({ pwm, pins: ports[0] }).init().setSteps(64 * 32);
      }).should.not.throw();
    });

    it('should re-set speed if it was configured in rpm', () => {
      const inst = stepper({
        pwm, pins: ports[0], rpm: 600, steps: 100,
      }).init();

      const oldfreq = inst.options.pulsefreq;
      inst.setSteps(300);
      inst.options.pulsefreq.should.not.equal(oldfreq);
    });
  });

  describe('setSpeed()', () => {
    it('should validate speed', () => {
      (function () {
        stepper({ pwm, pins: ports[0] }).init().setSpeed('test');
      }).should.throw();

      (function () {
        stepper({ pwm, pins: ports[0] }).init().setSpeed({ rpm: 200 });
      }).should.not.throw();
    });

    it('should re-set speed if it was configured in rpm', () => {
      const inst = stepper({
        pwm, pins: ports[0], rpm: 600, steps: 100,
      }).init();

      const oldfreq = inst.options.pulsefreq;
      inst.setSpeed({ rpm: 200 });
      inst.options.pulsefreq.should.not.equal(oldfreq);
    });

    it('should re-set speed if it was configured in pps', () => {
      const inst = stepper({
        pwm, pins: ports[0], pps: 600, steps: 100,
      }).init();

      const oldfreq = inst.options.pulsefreq;
      inst.setSpeed({ pps: 200 });
      inst.options.pulsefreq.should.not.equal(oldfreq);
    });

    it('should re-set speed if it was configured in sps', () => {
      const inst = stepper({
        pwm, pins: ports[0], sps: 600, steps: 100,
      }).init();

      const oldfreq = inst.options.pulsefreq;
      inst.setSpeed({ sps: 200 });
      inst.options.pulsefreq.should.not.equal(oldfreq);
    });
  });

  describe('Asynch stepping clash detection', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const steps = 2;
    const p = { W1: [8, 10, 9], W2: [13, 11, 12] };
    const po = {};
    po.W1 = { PWM: p.W1[0], IN1: p.W1[1], IN2: p.W1[2] };
    po.W2 = { PWM: p.W2[0], IN1: p.W2[1], IN2: p.W2[2] };

    pwm.setPin.resetBehavior();
    pwm.setPin = sinon.stub().callsFake((add, opt, cb) => {
      pwm.setPin.resetBehavior();
      pwm.setPin = sinon.stub().yieldsAsync(null);
      setTimeout(() => cb(null, null), 1000);
    });

    it('should error if previous step not finished', (done) => {
      const inst = stepper({ pwm, pins: p, pps: 600 }).init();
      inst.step('fwd', steps, (err) => {
        should.notEqual(err, null);
        done();
      });
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

    it('should do 4 synch double steps fwd', () => {
      const inst = stepper({ pwm, pins: p, pps: 600 }).init();
      inst.stepSync('fwd', steps);

      checkExpected(seqdoublefwd, pwm, po, steps);
    });

    it('should do 4 synch double steps back', () => {
      const inst = stepper({ pwm, pins: p, pps: 600 }).init();
      inst.stepSync('back', steps);

      checkExpected(seqdoubleback, pwm, po, steps);
    });

    it('should do 4 asynch double steps fwd', (done) => {
      const inst = stepper({ pwm, pins: p, pps: 600 }).init();
      inst.step('fwd', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqdoublefwd, pwm, po, steps, false);
        done();
      });
    });

    it('should do 4 asynch double steps back', (done) => {
      const inst = stepper({ pwm, pins: p, pps: 600 }).init();
      inst.step('back', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqdoubleback, pwm, po, steps, false);
        done();
      });
    });
  });

  describe('single stepping', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const channel = 0;
    const steps = 4;
    const p = ports[channel];

    it('should do 4 single synch steps fwd', () => {
      const inst = stepper({
        pwm, pins: p, style: 'single', pps: 600,
      }).init();
      inst.stepSync('fwd', steps);

      checkExpected(seqsinglefwd, pwm, p, steps);
    });

    it('should do 4 single synch steps back', () => {
      const inst = stepper({
        pwm, pins: p, style: 'single', pps: 600,
      }).init();
      inst.stepSync('back', steps);

      checkExpected(seqsingleback, pwm, p, steps);
    });

    it('should do 4 single asynch steps fwd', (done) => {
      const inst = stepper({
        pwm, pins: p, style: 'single', pps: 600,
      }).init();
      inst.step('fwd', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqsinglefwd, pwm, p, steps, false);
        done();
      });
    });

    it('should do 4 single asynch steps back', (done) => {
      const inst = stepper({
        pwm, pins: p, style: 'single', pps: 600,
      }).init();
      inst.step('back', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqsingleback, pwm, p, steps, false);
        done();
      });
    });
  });

  describe('8 microstepping', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const channel = 0;
    const steps = 4 * 8;
    const p = ports[channel];

    it('should do 4 * 8 synch microsteps fwd', () => {
      const inst = stepper({
        pwm, pins: p, style: 'microstep', pps: 600,
      }).init();
      inst.stepSync('fwd', steps);

      checkExpected(seqmicro8fwd, pwm, p, steps);
    });

    it('should do 4 * 8 synch microsteps back', () => {
      const inst = stepper({
        pwm, pins: p, style: 'microstep', pps: 600,
      }).init();
      inst.stepSync('back', steps);

      checkExpected(seqmicro8back, pwm, p, steps);
    });

    it('should do 4 * 8 asynch microsteps fwd', (done) => {
      const inst = stepper({
        pwm, pins: p, style: 'microstep', pps: 600,
      }).init();
      inst.step('fwd', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqmicro8fwd, pwm, p, steps, false);
        done();
      });
    });

    it('should do 4 * 8 asynch microsteps back', (done) => {
      const inst = stepper({
        pwm, pins: p, style: 'microstep', pps: 600,
      }).init();
      inst.step('back', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqmicro8back, pwm, p, steps, false);
        done();
      });
    });
  });

  describe('16 microstepping', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const channel = 0;
    const steps = 4 * 16;
    const p = ports[channel];

    it('should do 4 * 16 synch microsteps', () => {
      const inst = stepper({
        pwm, pins: p, style: 'microstep', microsteps: 16,
      }).init();
      inst.setSpeed({ rpm: 6000 });
      inst.stepSync('fwd', steps);

      checkExpected(seqmicro16fwd, pwm, p, steps);
    });

    it('should do 4 * 16 asynch microsteps', (done) => {
      const inst = stepper({
        pwm, pins: p, style: 'microstep', microsteps: 16,
      }).init();
      inst.setSpeed({ rpm: 6000 });
      inst.step('fwd', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqmicro16fwd, pwm, p, steps, false);
        done();
      });
    });
  });

  describe('interleaved stepping', () => {
    beforeEach(() => {
      pwm.resetAll();
    });

    const channel = 0;
    const steps = 8;
    const p = ports[channel];

    it('should do 8 synch interleaved steps fwd', () => {
      const inst = stepper({
        pwm, pins: p, style: 'interleaved', pps: 600,
      }).init();
      inst.stepSync('fwd', steps);

      checkExpected(seqinterleavedfwd, pwm, p, steps);
    });

    it('should do 8 synch interleaved steps back', () => {
      const inst = stepper({
        pwm, pins: p, style: 'interleaved', pps: 600,
      }).init();
      inst.stepSync('back', steps);

      checkExpected(seqinterleavedback, pwm, p, steps);
    });

    it('should do 8 asynch interleaved steps fwd', (done) => {
      const inst = stepper({
        pwm, pins: p, style: 'interleaved', pps: 600,
      }).init();
      inst.step('fwd', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqinterleavedfwd, pwm, p, steps, false);
        done();
      });
    });

    it('should do 8 asynch interleaved steps back', (done) => {
      const inst = stepper({
        pwm, pins: p, style: 'interleaved', pps: 600,
      }).init();
      inst.step('back', steps, (err) => {
        should.equal(err, null);
        checkExpected(seqinterleavedback, pwm, p, steps, false);
        done();
      });
    });
  });
});
