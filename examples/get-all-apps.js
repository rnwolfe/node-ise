const ise = require('./setup');

ise
  .login()
  .then(() => ise.getApplications({ categories: 'VPNClient' }))
  .then((apps) => console.dir(apps))
  .then(() => ise.logout())
  .catch((error) => console.dir(error));
