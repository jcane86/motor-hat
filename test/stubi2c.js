let sinon = require('sinon');
let bus = {
  writeByteSync: sinon.stub(),
  sendByteSync: sinon.stub(),
  readByteSync: sinon.stub().returns(0xBEE)
};
let i2c = {
  openSync: sinon.stub().returns(bus),
  '@noCallThru': true
};
module.exports = i2c;
