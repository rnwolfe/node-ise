const ise = require('./setup');

ise
  .login()
  .then(() => ise.getRadiusPolicySets())
  .then(sets => console.dir(sets))
  .catch(error => console.dir(error));
