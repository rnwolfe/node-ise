const ise = require('./setup');

ise
  .login()
  .then(() => ise.getFailovers())
  .then((failovers) => console.dir(failovers))
  .catch((error) => console.dir(error));
