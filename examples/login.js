const ISE = require('../');

const ise = new ISE('10.1.100.23');

ise
  .iseLogin('rwolfe', 'Ir0n1234!@#$')
  .then(() => console.log('logged in!'))
  .catch(error => console.dir(error));
