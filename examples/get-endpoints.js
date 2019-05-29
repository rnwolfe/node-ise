const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.getEndpoints({ IdentityGroup: 'BlackBerry' }))
  .then(endpoints => endpoints.forEach(e => console.log(e.MACAddress)))
  .catch(error => console.dir(error));
