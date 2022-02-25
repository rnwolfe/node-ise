const ise = require('./setup');

ise
  .login()
  .then(() => ise.getRadiusLiveLogs())
  .then(logs => console.dir(logs))
  .then(() => ise.getRadiusLiveLogCounters())
  .then(counters => console.dir(counters))
  .then(() => ise.logout())
  .catch(error => console.dir(error));
