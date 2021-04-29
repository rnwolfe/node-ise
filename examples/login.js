const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(login => {
    console.log('Logged in! ISE is running version', ise.iseVersion, ise.csrfToken)
  })
  .catch(error => console.log(error));
