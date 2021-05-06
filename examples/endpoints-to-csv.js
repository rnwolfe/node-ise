const ise = require('./setup');

ise
  .login()
  .then(() => ise.endpointsToCsv())
  .then((result) => console.log(result))
  .then(() => ise.logout())
  .catch((error) => console.log(error));
