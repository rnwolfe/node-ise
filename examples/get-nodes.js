const ise = require('./setup');

ise
  .login()
  .then(() => ise.getNodes())
  .then((nodes) => console.dir(nodes))
  .catch((error) => console.log(error));
