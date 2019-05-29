const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .iseLogin()
  .then(() => ise.getUsers())
  .then(users => console.dir(users))
  .then(() => ise.logout())
  .then(() => console.log('Successfully logged out!'))
  .catch(error => console.dir(error));
