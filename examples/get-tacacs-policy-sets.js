const ise = require('./setup');

ise
  .login()
  .then(() => ise.getTacacsPolicySets())
  .then(sets => console.dir(sets))
  .catch(error => console.dir(error));
