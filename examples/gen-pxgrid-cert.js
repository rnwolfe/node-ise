const ISE = require('..');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.autoGenPxGridCert('another-app-auto-gen', 'My description', 'Pxgrid123'))
  .then((config) => console.log(config))
  .catch((error) => console.dir(error));
