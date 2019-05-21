const ISE = require('./');

const ise = new ISE('10.12.100.14', 'C920690E2C3786B075C4CB4E131D32ED');

ise
  .endpointsToCsv()
  .then(data => {
    if (data) {
      console.log('Success!');
    }
  })
  .catch(error => console.log(error));
