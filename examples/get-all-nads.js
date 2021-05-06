const ise = require('./setup');

ise
  .login()
  .then(() => ise.getNetworkDevices())
  // .then(() => ise.getNetworkDevices({ 'Device Type': 'Device Type#All Device Types#Switches' }))
  .then((nads) => console.dir(nads))
  .then(() => ise.logout())
  .catch((error) => console.dir(error));
