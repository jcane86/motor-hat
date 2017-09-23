'use strict';

const sinon = require('sinon');
const debug = require('debug')('test');

// const bus = {
//   writeByteSync: sinon.stub(),
//   sendByteSync: sinon.stub(),
//   readByteSync: sinon.stub().returns(0xBEE),
//   writeByte: sinon.stub().yieldsAsync(null),
//   sendByte: sinon.stub().yieldsAsync(null),
//   readByte: sinon.stub().yieldsAsync(null, 0xBEE),
// };
const i2c = {
  writeByteSync: sinon.stub(),
  sendByteSync: sinon.stub(),
  readByteSync: sinon.stub().returns(0xBEE),
  writeByte: sinon.stub().yieldsAsync(null),
  sendByte: sinon.stub().yieldsAsync(null),
  readByte: sinon.stub().yieldsAsync(null, 0xBEE),
  resetAll() {
    i2c.writeByteSync.resetHistory();
    i2c.sendByteSync.resetHistory();
    i2c.readByteSync.resetHistory();
    i2c.writeByte.resetHistory();
    i2c.sendByte.resetHistory();
    i2c.readByte.resetHistory();
    i2c.openSync.resetHistory();
    i2c.open.resetHistory();
  },
  // get bus() {
  //   return i2c;
  // },
  '@noCallThru': true,
};
i2c.open = sinon.stub().callsFake((add, opt, cb) => {
  debug('i2cOpen');
  process.nextTick(() => {
    cb(null, null);
  });
});
i2c.openSync = sinon.stub().returns(i2c);

module.exports = i2c;
