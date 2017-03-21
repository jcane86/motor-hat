'use strict';

const sinon = require('sinon');

const bus = {
  writeByteSync: sinon.stub(),
  sendByteSync: sinon.stub(),
  readByteSync: sinon.stub().returns(0xBEE),
};
const i2c = {
  openSync: sinon.stub().returns(bus),
  resetAll() {
    bus.writeByteSync.resetHistory();
    bus.sendByteSync.resetHistory();
    bus.readByteSync.resetHistory();
    i2c.openSync.resetHistory();
  },
  get bus() {
    return bus;
  },
  '@noCallThru': true,
};
module.exports = i2c;
