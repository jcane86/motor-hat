'use strict';
module.exports = function (options) {
  options = options || {};

  let debug = options.debug || false;
  let address = options.address;
  let i2c = require('i2c-bus');

  /**
   * Gets the version number of the Raspberry Pi board
   * Revision list available at:
   * http://elinux.org/RPi_HardwareHistory#Board_Revision_History
   * @returns {number}
   */
  let getPiRevision = function () {
    var lineReader = require('readline').createInterface({
      input: require('fs').createReadStream('/proc/cpuinfo')
    });

    lineReader.on('line', function (line) {
      // Match a line of the form 'Revision : 0002' while ignoring extra info in front of the revsion (like 1000 when
      // the Pi was over - volted
      var match = line.match(/Revision\s+:\s+.*(\w{4})$/);
      if (match && match[1] in ['0000', '0002', '0003']) {
        // Return revision 1 if revision ends with 0000, 0002 or 0003.
        return 1;
      } else if (match) {
        // Assume revision 2 if revision ends with any other 4 chars.
        return 2;
      }
      // Couldn't find the revision, assume revision 0 like older code for compatibility.
      return 0;
    });
  };

  let getPiI2CBusNumber = function () {
    // Gets the I2C bus number /dev/i2c#
    return getPiRevision() > 1 ? 1 : 0;
  };

  // By default, the correct I2C bus is auto-detected using /proc/cpuinfo
  // Alternatively, you can hard-code the bus version below:
  // let busnum = 0; # Force I2C0 (early 256MB Pi's)
  // let busnum = 1; # Force I2C1 (512MB Pi's)
  let busnum = (options.busnum === undefined) ? getPiI2CBusNumber() : options.busnum;
  let bus = i2c.open(busnum, {}, function (err) {
    if (err) {
      throw Error('Error opening I2C bus: ' + err);
    }
  });

  let reverseByteOrder = function (data) {
    // Reverses the byte order of an int (16-bit) or long (32-bit) value
    // Courtesy Kay http://stackoverflow.com/a/7946195
    var s = data.toString(16);          // translate to hexadecimal notation
    s = s.replace(/^(.(..)*)$/, '0$1'); // add a leading zero if needed
    var a = s.match(/../g);             // split number in groups of two
    return a.reverse();                 // reverse the groups
  };

  let errMsg = function () {
    throw Error('Error accessing {0}: Check your I2C address').format(address.toString(16));
  };

  let write8 = function (reg, value) {
    // Writes an 8-bit value to the specified register/address
    bus.writeByte(address, reg, value, function (err) {
      if (err) {
        return errMsg();
      }
      if (debug) {
        console.log('I2C: Wrote {0} to register {1}'.format(value.toString(16), reg.toString(16)));
      }
    });
  };

  let write16 = function (reg, value) {
    // Writes a 16-bit value to the specified register/address pair
    bus.writeWord(address, reg, value, function (err) {
      if (err) {
        return errMsg();
      }
      if (debug) {
        console.log('I2C: Wrote {0} to register pair {1},{1}'.format(value.toString(16), reg.toString(16), (reg + 1).toString(16)));
      }
    });
  };

  let writeRaw8 = function (value) {
    // Writes an 8-bit value on the bus
    bus.sendByte(address, value, function (err) {
      if (err) {
        return errMsg();
      }
      if (debug) {
        console.log('I2C: Wrote {0}'.format(value.toString(16)));
      }
    });
  };

  let writeList = function (reg, list) {
    // Writes an array of bytes using I2C format
    if (debug) {
      console.log('I2C: Writing list to register {0}:'.format(reg.toString(16)));
      console.log(list);
    }
    bus.writeI2cBlock(address, reg, list.length, list, function (err) {
      if (err) {
        return errMsg();
      }
    });
  };

  let readList = function (reg, length) {
    // Read a list of bytes from the I2C device
    const buffer = new Buffer(length);

    bus.readI2cBlock(address, reg, length, buffer, function (err, len, data) {
      if (err) {
        return errMsg();
      }
      if (debug) {
        console.log('I2C: Device {0} returned the following from reg {1}'.format(address.toString(16), reg.toString(16)));
        console.log(data);
      }
      return data;
    });
  };

  let readU8 = function (reg) {
    // Read an unsigned byte from the I2C device
    bus.readByte(address, reg, function (err, byte) {
      if (err) {
        return errMsg();
      }
      if (debug) {
        console.log('I2C: Device {0} returned {1} from reg {2}'.format(
          address.toString(16),
          (byte & 0xFF).toString(16),
          reg.toString(16))
        );
        return byte;
      }
    });
  };

  let readS8 = function (reg) {
    // Reads a signed byte from the I2C device
    bus.readByte(address, reg, function (err, byte) {
      if (err) {
        return errMsg();
      }
      if (byte > 127) {
        byte -= 256;
      }
      if (debug) {
        console.log('I2C: Device {0} returned {1} from reg {2}'.format(
          address.toString(16),
          (byte & 0xFF).toString(16),
          reg.toString(16))
        );
        return byte;
      }
    });
  };

  let readU16 = function (reg, littleEndian) {
    if (littleEndian === undefined) {
      littleEndian = true;
    }
    // Reads an unsigned 16-bit value from the I2C device
    bus.readWord(address, reg, function (err, word) {
      if (err) {
        return errMsg();
      }
      // Swap bytes if using big endian because readWord assumes little
      // endian on ARM (little endian) systems.
      if (!littleEndian) {
        word = ((word << 8) & 0xFF00) + (word >> 8);
      }
      if (debug) {
        console.log('I2C: Device {0} returned {1} from reg {2}'.format(
          address.toString(16),
          (word & 0xFFFF).toString(16),
          reg.toString(16)));
      }
      return word;
    });
  };

  let readS16 = function (reg, littleEndian) {
    if (littleEndian === undefined) {
      littleEndian = true;
    }
    // Reads a signed 16-bit value from the I2C device
    let result = readU16(reg, littleEndian);
    if (result > 32767) {
      result -= 65536;
    }
    return result;
  };

  return {
    // Public interface
    write8: write8,
    write16: write16,
    writeRaw8: writeRaw8,
    writeList: writeList,
    readU8: readU8,
    readS8: readS8,
    readU16: readU16,
    readS16: readS16,
    readList: readList,
    reverseByteOrder: reverseByteOrder
  };
};
