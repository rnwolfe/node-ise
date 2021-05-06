const ise = require('./setup');

ise
  .login()
  .then(() => ise.getRadiusLiveSessions({ session_state_name: 2 }))
  .then((logs) => console.dir(logs))
  .then(() => ise.logout())
  .catch((error) => console.dir(error));
