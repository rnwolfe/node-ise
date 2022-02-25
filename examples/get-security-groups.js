const ise = require('./setup');

ise
  .login()
  .then(() => ise.getSecurityGroups())
  .then(sgts => console.dir(sgts))
  .catch(error => console.dir(error));
