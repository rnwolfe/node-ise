const ise = require('./setup');

ise
  .login()
  .then(() =>
    Promise.all([
      ise.getVulnerabilityData(),
      ise.getTotalVulnerableEndpoints(),
      ise.getVulnerableEndpointsOverTime('6months')
    ])
  )
  .then((values) => console.dir(values));
