const ise = require('../setup');

ise
  .login()
  .then(() => ise.getEndpointIdentityGroups())
  .then(groups => console.dir(groups))
  .catch(error => console.dir(error));
