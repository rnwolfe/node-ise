const ISE = require('..');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.getRadiusPolicySets())
  .then(sets => console.dir(sets))
  .catch(error => console.dir(error));
