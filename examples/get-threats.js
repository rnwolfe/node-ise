const ise = require('./setup');

ise
  .login()
  .then(() =>
    Promise.all([
      ise.getTopCompromisedEndpoints(),
      ise.getTopThreats(),
      ise.getCompromisedEndpointsOverTime()
    ])
  )
  .then((values) => console.dir(values));
