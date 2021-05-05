const ISE = require('..');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => ise.getNetworkDevices())
  // .then(() => ise.getNetworkDevices({ 'Device Type': 'Device Type#All Device Types#Switches' }))
  .then((nads) => console.dir(nads))
  .then(() => ise.logout())
  .catch((error) => console.dir(error));
