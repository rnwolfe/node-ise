const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.getNodes())
  .then(nodes => console.dir(nodes))
  .catch(error => console.log(error));
