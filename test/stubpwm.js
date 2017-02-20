let proxyquire = require('proxyquire');
let pwm = proxyquire('../dist/pwm.js', {'raspi-ver': {rev: 0, '@noCallThru': true}, '@noCallThru': true});
module.exports = pwm;
