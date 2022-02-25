const ise = require('./setup');

ise
  .login()
  .then(() =>
    Promise.all([
      ise.getTopCompromisedEndpoints(),
      ise.getTopThreats(),
      ise.getCompromisedEndpointsOverTime(),
      ise.getTotalVulnerableEndpoints()
    ])
  )
  .then(values => console.dir(values, { depth: 4 }));
