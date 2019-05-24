const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .iseLogin()
  .then(() => ise.getEndpoints())
  .then(endpoints => endpoints.forEach(e => console.log(e.MACAddress)))
  .catch(error => console.dir(error));
