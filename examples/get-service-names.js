const ise = require('./setup');

ise
  .login()
  .then(() => ise.getServiceNames())
  .then((services) => console.dir(services))
  .catch((error) => console.dir(error));
