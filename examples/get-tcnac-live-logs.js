const ise = require('./setup');

ise
  .login()
  .then(() => ise.getTcNacLiveLogs())
  .then((logs) => console.dir(logs))
  .then(() => ise.logout())
  .catch((error) => console.dir(error));
