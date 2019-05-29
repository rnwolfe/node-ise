const ISE = require('..');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

let policySet = {};
ise
  .login()
  .then(() => ise.getTacacsPolicySetByName('Switches'))
  .then(policySet => ise.resolveTacacsPolicySet(policySet.id))
  .then(policy => console.dir(policy))
  .catch(error => console.dir(error));
