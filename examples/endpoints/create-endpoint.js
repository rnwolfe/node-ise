const ise = require('../setup');

ise
  .login()
  .then(() => ise.createEndpoint('11:11:11:11:11:11'))
  .then((response) => {
    console.log(response)
  })
  .catch((error) => console.log(error));
