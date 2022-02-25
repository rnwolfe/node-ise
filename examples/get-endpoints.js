const ise = require('./setup');

ise
  .login()
  .then(() => ise.getEndpoints({ IdentityGroup: 'BlackBerry' }))
  .then(endpoints => endpoints.forEach(e => console.log(e.MACAddress)))
  .catch(error => console.dir(error));
