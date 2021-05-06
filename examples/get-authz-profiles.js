const ise = require('./setup');

ise
  .login()
  .then(() => ise.getAuthorizationProfiles())
  .then((profiles) => console.dir(profiles))
  .catch((error) => console.dir(error));
