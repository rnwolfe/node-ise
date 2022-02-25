const ise = require('./setup');

ise
  .login()
  .then(() => ise.getTacacsPolicySetByName('Default'))
  .then(policySet => ise.resolveTacacsPolicySet(policySet.id))
  .then(policy => console.dir(policy))
  .catch(error => console.dir(error));
