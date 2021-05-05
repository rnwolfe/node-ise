const ISE = require('..');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.getRadiusPolicySetByName('Default'))
  .then((policySet) => ise.resolveRadiusPolicySet(policySet.id))
  .then((policy) => console.dir(policy))
  .catch((error) => console.dir(error));
