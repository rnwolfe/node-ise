const ise = require('../setup');

ise
  .login()
  .then(() => ise.endpointsToCsv())
  .then((result) => console.log(result))
  .catch((error) => console.log(error));
