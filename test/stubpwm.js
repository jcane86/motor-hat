let proxyquire = require('proxyquire');
let pwm = proxyquire('../lib/pwm.js', {'raspi-ver': {rev: 0, '@noCallThru': true}, '@noCallThru': true});
module.exports = pwm;
