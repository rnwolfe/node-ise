const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .iseLogin()
  .then(() =>
    Promise.all([
      ise.getTopCompromisedEndpoints(),
      ise.getTopThreats(),
      ise.getCompromisedEndpointsOverTime()
    ])
  )
  .then(values => console.dir(values));
