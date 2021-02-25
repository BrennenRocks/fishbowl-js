# Fishbowl-js
The JavaScript wrapper for the Fishbowl API

[![npm](https://img.shields.io/npm/v/fishbowl-js.svg?color=orange&style=flat-square)](https://www.npmjs.com/package/fishbowl-js)[![Downloads](https://img.shields.io/npm/dt/fishbowl-js.svg?style=flat-square)](https://npmcharts.com/compare/fishbowl-js?minimal=true)

[![NPM](https://nodei.co/npm/fishbowl-js.png?downloads=true&downloadRank=true)](https://nodei.co/npm/fishbowl-js/)

## Request options
Reference [src/requestTypes.ts](src/requestTypes.ts) to learn option parameters for the different requests

## Fishbowl API
If you have questions regarding the actual Fishbowl API please visit [the Fishbowl API wiki](https://www.fishbowlinventory.com/wiki/Fishbowl_API)

## Donate
Feel free to [donate](https://paypal.me/brennenrocks) to support Fishbowl-js! This project is Open Source and is not affiliated with Fishbowl Inventory.

## Usage
The default options for the constructor are 
```javascript
const fb = new Fishbowl({
    host: '127.0.0.1',
    port: 28192,
    IAID: 54321,
    IAName: 'Fishbowljs',
    IADescription: 'Fishbowljs helper',
    username: 'admin',
    password: 'admin',
    useLogger: true
  });
```

You may pass a callback function to the constructor to know if it connected properly
```javascript
const fb = new Fishbowl({}, (err, res) => {
  if (err) {
    console.log(err);
    return;
  }
});
```

To use async await use the sendRequestPromise({ req, options, json }) function

```javascript
const executeQuery = async () => {
  try {
    const part = await fb.sendRequestPromise({ req: 'ExecuteQueryRq', options: { query: 'select * from part where num = "B201"' } });
    const product = await fb.sendRequestPromise({ req: 'ExecuteQueryRq', options: { query: 'select * from product where num = "B202"' } });
    console.log(`Part: ${part}`);
    console.log(`Product: ${product}`);
  } catch (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
  }
}

executeQuery();
```

All requests by default will send back the data in JSON format.
```javascript
fb.sendRequest({ req: 'ExecuteQueryRq', options: { query: "select * from part where num='B201'" } }, (err, res) => {
  if (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});
```

 If the request allows it and you desire it, the request could send the data back in CSV format. Notice the json flag as the third attribute in the RequestOptions.
 ```javascript
fb.sendRequest({ req: 'ExecuteQueryRq', options: { query: "select * from part where num='B201'" }, json: false }, (err, res) => {
  if (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});
 ```

 All valid API requests are accepted, not only the requests documented on [the Fishbowl API wiki](https://www.fishbowlinventory.com/wiki/Fishbowl_API)
 ```javascript
 fb.sendRequest({req: 'PartGetRq', options: { Number: 'B201', GetImage: false } }, (err, res) => {
  if (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});
 ```

```javascript
const Fishbowl = require('fishbowl-js');

const fb = new Fishbowl({}, (err, res) => {
  if (err) {
    console.log(err);
    return;
  }
});

// If you have already approved this integration, this will be seamless.
// If you have not approved the integration, you will need to approve it and then send the login request again.
fb.sendRequest({ req: 'LoginRq' });

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
    poItemType: 'Purchase',
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
    poItemType: 'Purchase',
    'Tracks-Lot Number': 'false',
    'Tracks-Revision Level': 'false',
    'Tracks-Expiration Date': 'false',
    'Tracks-Serial Number': 'false'
  }
];

fb.sendRequest({ req: 'ImportRq', options: { type: 'ImportPart', row: partImport } }, (err, res) => {
  if (err) {
    console.log(`err: ${err.code} - ${err.message}`);
    return;
  }

  console.log(`Data: ${res}`);
});

fb.sendRequest({ req: 'IssueSORq', options: { soNumber: '50053' } });

const executeQuery = async () => {
  try {
    const part = await fb.sendRequestPromise({ req: 'ExecuteQueryRq', options: { query: "select * from part where num='B201' or num='B202' or num='1API'" }, json: false });
    const product = await fb.sendRequestPromise({ req: 'ExecuteQueryRq', options: { query: "select * from product where num = 'B202'" } });
    console.log(`Part: ${part}`);
    console.log(`Product: ${product}`);
  } catch (err) {
    console.log(`Err: ${err.code} - ${err.message}`);
  }
}

executeQuery();
```
