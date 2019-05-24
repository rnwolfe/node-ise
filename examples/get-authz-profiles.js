const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .iseLogin()
  .then(() => ise.getAuthorizationProfiles())
  .then(profiles => console.dir(profiles))
  .catch(error => console.dir(error));

