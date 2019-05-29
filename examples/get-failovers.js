const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.getFailovers())
  .then(failovers => console.dir(failovers))
  .catch(error => console.dir(error));
