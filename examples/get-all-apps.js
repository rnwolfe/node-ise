const ISE = require('..');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.getApplications({ categories: 'VPNClient' }))
  .then((apps) => console.dir(apps))
  .then(() => ise.logout())
  .catch((error) => console.dir(error));
