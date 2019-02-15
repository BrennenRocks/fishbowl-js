# Fishbowl-js

```
npm i fishbowl-js
```

## Usage
The default options for the constructor are 
```javascript
const fb = new Fishbowl({
    host = '127.0.0.1',
    port = 28192,
    IAID = 54321,
    IAName = 'Fishbowljs',
    IADescription = 'Fishbowljs helper',
    username = 'admin',
    password = 'admin'
  });
```

```javascript
const Fishbowl = require('fishbowl-js');

const fb = new Fishbowl({});

fb.sendRequest('LoginRq', {}, (err, res) => {
  if (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});

fb.sendRequest('ExecuteQueryRq', { query: "select * from part where num='B201' or num='B202'" }, (err, res) => {
  if (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});
```

## Request options
Reference [src/requestTypes.ts](src/requestTypes.ts) to learn option parameters for the different requests

## Fishbowl API
If you have questions regarding the actual Fishbowl API please visit [the Fishbowl API wiki](https://www.fishbowlinventory.com/wiki/Fishbowl_API)