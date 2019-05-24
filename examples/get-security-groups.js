const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .iseLogin()
  .then(() => ise.getSecurityGroups())
  .then(sgts => console.dir(sgts))
  .catch(error => console.dir(error));
