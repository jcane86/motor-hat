let sinon = require('sinon');
let bus = {
  writeByteSync: sinon.stub(),
  sendByteSync: sinon.stub(),
  readByteSync: sinon.stub().returns(0xBEE)
};
let i2c = {
  openSync: sinon.stub().returns(bus),
  resetAll: function () {
    bus.writeByteSync.reset();
    bus.sendByteSync.reset();
    bus.readByteSync.reset();
    i2c.openSync.reset();
  },
  get bus() {
    return bus;
  },
  set bus(x) {},
  '@noCallThru': true
};
module.exports = i2c;
