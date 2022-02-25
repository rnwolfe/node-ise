const ise = require('./setup');

ise
  .login()
  .then(() => ise.getTacacsLiveLogs())
  .then(logs => console.dir(logs))
  .then(() => ise.logout())
  .catch(error => console.dir(error));
