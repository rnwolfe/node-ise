const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.endpointsToCsv({}, (detail = true)))
  .catch(error => console.log(error));
