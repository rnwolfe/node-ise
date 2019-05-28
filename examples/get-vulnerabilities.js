const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .iseLogin()
  .then(() =>
    Promise.all([
      ise.getVulnerabilityData(),
      ise.getTotalVulnerableEndpoints(),
      ise.getVulnerableEndpointOverTime('6months')
    ])
  )
  .then(values => console.dir(values));
