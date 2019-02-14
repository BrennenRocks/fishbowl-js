# Fishbowl-js

```
npm i fishbowl-js
```

## Usage
The default options for the construcor are 
```javascript
const fb = new Fishbowl({
    host = '127.0.0.1',
    port = 28192,
    IAID = 54321,
    IAName = 'Fishbowljs',
    IADescription = 'Fishbowljs helper',
    username = 'admin',
    password = 'admin',
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

fb.sendRequest('PartGetRq', { num: 'B201', getImage: false }, (err, req) => {
  if (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});
```


## Current available calls:
-LoginRq
-PartGetRq

## Request options
-LoginRq: {}
-PartGetRq: { num: string, getImage: boolean }