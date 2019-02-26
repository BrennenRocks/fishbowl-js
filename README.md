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

// If you have already approved this integration, this will be seemless.
// If you have not approved the integration, you will need to approve it and then send the login request again.
fb.sendRequest('LoginRq', {}, (err, res) => {
  if (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});

const partImport = [
  {
    partNumber: '1API',
    partDescription: 'Fishbowl-js',
    partDetails: '',
    uom: 'ea',
    upc: '',
    partType: 'Inventory',
    active: 'true',
    abcCode: 'N',
    weight: '210',
    weightUom: 'lbs',
    width: '0',
    height: '0',
    length: '0',
    sizeUom: 'ft',
    primaryTracking: '',
    alertNote: '',
    pictureUrl: '',
    'Tracks-Lot Number': 'false',
    'Tracks-Revision Level': 'false',
    'Tracks-Expiration Date': 'false',
    'Tracks-Serial Number': 'false'
  },
  {
    partNumber: '2API',
    partDescription: 'Fishbowl-js2',
    partDetails: '',
    uom: 'ea',
    upc: '',
    partType: 'Inventory',
    active: 'false',
    abcCode: 'N',
    weight: '210',
    weightUom: 'lbs',
    width: '0',
    height: '0',
    length: '0',
    sizeUom: 'ft',
    primaryTracking: '',
    alertNote: '',
    pictureUrl: '',
    'Tracks-Lot Number': 'false',
    'Tracks-Revision Level': 'false',
    'Tracks-Expiration Date': 'false',
    'Tracks-Serial Number': 'false'
  }
];

fb.sendRequest('ImportRq', {type: 'ImportPart', row: partImport}, (err, res) => {
  if (err) {
    console.log(`err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});

fb.sendRequest('ExecuteQueryRq', { query: "select * from part where num='B201' or num='B202' or num='1API'" }, (err, res) => {
  if (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});

fb.sendRequest('IssueSORq', { soNumber: '50053' }, (err, res) => {
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