const ise = require('./setup');

ise
  .login()
  .then(() => ise.getRadiusPolicySetByName('Default'))
  .then((policySet) => ise.resolveRadiusPolicySet(policySet.id))
  .then((policy) => console.dir(policy))
  .catch((error) => console.dir(error));
