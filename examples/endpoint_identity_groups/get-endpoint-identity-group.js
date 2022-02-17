const ise = require('../setup');

ise
  .login()
  .then(() => ise.getEndpointIdentityGroup('Blacklist'))
  .then((group) => console.dir(group.id))
  .catch((error) => console.dir(error));
