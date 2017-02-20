let proxyquire = require('proxyquire');
var i2c = 0;
let obj = {
  'raspi-ver': {
    get i2c() {
      return i2c;
    },
    set i2c(x) {},
    '@noCallThru': true
  },
  '@noCallThru': true
};
let pwm = proxyquire('../dist/pwm.js', obj);
pwm.seti2c = function (val) {
  i2c = val;
};
module.exports = pwm;
