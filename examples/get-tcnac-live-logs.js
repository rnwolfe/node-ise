const ISE = require('..');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.getTcNacLiveLogs())
  .then((logs) => console.dir(logs))
  .then(() => ise.logout())
  .catch((error) => console.dir(error));
