const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() =>
    Promise.all([
      ise.getVulnerabilityData(),
      ise.getTotalVulnerableEndpoints(),
      ise.getVulnerableEndpointsOverTime('6months')
    ])
  )
  .then(values => console.dir(values));
