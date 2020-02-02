# compact-message-format

This is a NodeJS library that can be used to serialize/deserialize Flowee (and Bitcoin Classic's) Compact Message Format into/from arrays.

Serializing a CMF message:

```
const CMF = require('compact-message-format');

// Headers used by Flowee
const Header = {
  End:                0,
  ServiceID:          1,
  MessageID:          2,
  SequenceStart:      3,
  LastInSequence:     4,
  Ping:               5,
  Pong:               6,
}

let msg = new CMF.Message(
    { tag: Header.ServiceID, value: 0 },
    { tag: Header.MessageID, value: 0 },
    { tag: Header.End, value: true },
    { tag: 1000, value: "This is an example string" },
);

let asBuffer = msg.toBuffer();

console.log(asBuffer.toString('hex'));
// 0800100004fa8668195468697320697320616e206578616d706c6520737472696e67
```

Deserializing a CMF message:

```
const CMF = require('compact-message-format');

let buffer = Buffer.from('0800100004fa8668195468697320697320616e206578616d706c6520737472696e67', 'hex');

let msg = new CMF.Message().fromBuffer(buffer);
/*
Message [
  { tag: 1, type: 0, value: 0 },
  { tag: 2, type: 0, value: 0 },
  { tag: 0, type: 4, value: true },
  { tag: 1000, type: 2, value: 'This is an example string' } ]

*/
```

## Message Builder/Message Parser

Direct access to the Message Builder and Message Parser interfaces are also available.

For more details on these, please refer to the source code.
