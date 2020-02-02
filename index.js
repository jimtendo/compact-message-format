const SmartBuffer = require('smart-buffer').SmartBuffer;

const CMFValueType = {
  // VarInt Encoded (between 1 and 9 bytes in length). Per definition a
  // positive number.
  PositiveNumber:     0,
  // VarInt Encoded (between 1 and 9 bytes in length). Per definition a
  // negative number.
  NegativeNumber:     1,
  // First an UnsignedNumber for the length, then the actual bytes. Never a
  // closing zero. Utf8 encoded
  String:             2,
  ByteArray:          3, // Identical to string, but without encoding
  BoolTrue:           4, // Not followed with any bytes
  BoolFalse:          5, // Not followed with any bytes
  Double:             6, // 8 Bye Little Endian Double
}

class Message extends Array {
  constructor(...args) { 
    super(...args);
  }
  
  fromBuffer(buffer) {
    let parser = new MessageParser(buffer);
    while (true) {
      let tag = parser.next();
      if (!tag) break; 
      this.push(tag);
    }
    
    return this;
  }
  
  toBuffer(buffer) {
    let builder = new MessageBuilder();
    for (let i = 0; i < this.length; i++) {
      builder.add(this[i].tag, this[i].value);
    }
    return builder.toBuffer();
  }
}

class MessageBuilder {
  constructor() {
    this.buffer = new SmartBuffer();
    return this;
  }
  
  add(tag, value, type = null) {
    if (!type) type = this._inferType(value);
    this._writeTagAndType(tag, type);
    switch(type) {
      case CMFValueType.PositiveNumber:
        this._writeVarInt(value);
        break;
      case CMFValueType.NegativeNumber:
        this._writeVarInt(value *= -1);
        break;
      case CMFValueType.String:
        this._writeVarInt(value.length);
        this.buffer.writeString(value, 'utf8');
        break;
      case CMFValueType.ByteArray:
        this._writeVarInt(value.length);
        this.buffer.writeBuffer(value);
        break;
      case CMFValueType.Double:
        this.buffer.writeDoubleLE(value);
        break;
    }
    
    return this;
  }
  
  toBuffer() {
    return this.buffer.toBuffer();
  }
  
  _writeTagAndType(tag, type) {
    if (tag >= 31) { // Use more than 1 byte
      let byte = type | 0xF8; // Set the tag to all 1s
      this.buffer.writeUInt8(byte);
      this._writeVarInt(tag);
      return;
    }
    let byte = tag;
    byte = byte << 3;
    byte += type;
    this.buffer.writeUInt8(byte);
  }
  
  _writeVarInt(value) {
    let varIntBuf = new SmartBuffer();
    
    let pos = 0;
    while (true) {
      let mask = 0;
      if (pos != 0) {
        mask = 0x80;
      }
      varIntBuf.writeUInt8(value & 0x7F | mask)
      if (value <= 0x7F) {
        break;
      }
      value = (value >> 7) - 1;
      pos++;
    }

    // Reverse the order
    this.buffer.writeBuffer(varIntBuf.toBuffer().reverse());
  }
  
  _inferType(value) {
    if (Number.isInteger(value))
      return (value < 0) ? CMFValueType.NegativeNumber : CMFValueType.PositiveNumber;
    else if (typeof value === 'number')
      return CMFValueType.Double;
    else if (typeof value === 'string')
      return CMFValueType.String;
    else if (typeof value === 'boolean')
      return (value) ? CMFValueType.BoolTrue : CMFValueType.BoolFalse;
    else if (value instanceof Buffer)
      return CMFValueType.ByteArray;
  }
}

class MessageParser {
  constructor(data) {
    this.buffer = SmartBuffer.fromBuffer(data);
  }
  
  next() {
    if (this.buffer.remaining()) {
      let token = {
        tag: null,
        type: null,
        value: null
      };
      
      let byte = this.buffer.readUInt8();
      token.type = (byte & 0x07);
      token.tag = byte >> 3;
      
      if (token.tag == 31) {
        token.tag = this._readVarInt();
      }
      
      if (token.type === CMFValueType.PositiveNumber || token.type === CMFValueType.NegativeNumber) {
        token.value = this._readVarInt();
      }
      
      else if (token.type === CMFValueType.String) {
        let length = this._readVarInt();
        token.value = this.buffer.readString(length);
      }
      
      else if (token.type === CMFValueType.ByteArray) {
        let length = this._readVarInt();
        token.value = this.buffer.readBuffer(length);
      }
      
      else if (token.type === CMFValueType.BoolTrue) {
        token.value = true;
      }
      
      else if (token.type === CMFValueType.BoolFalse) {
        token.value = false;
      }
      
      else if (token.type === CMFValueType.Double) {
        token.value = this.buffer.readDoubleLE();
      }
      
      else {
        token.value = "UNSUPPORTED";
      }
      
      return token;
    }
    
    return null;
  }
  
  _readVarInt() {
    let result = 0;
    let pos = 0;
    while (pos < 8) {
      let byte = this.buffer.readUInt8();
      result = (result << 7) | (byte & 0x7F)
      if ((byte & 0x80) != 0) {
        result += 1;
      } else {
        return result;
      }
    }
  }
}

module.exports = { Message, MessageBuilder, MessageParser, CMFValueType };
