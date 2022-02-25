const ise = require('../setup');

ise
  .login()
  .then(() => ise.createEndpoint('11:11:11:11:11:11'))
  .then(response => {
    console.log(response);
  })
  .then(response => {
    console.log(response);
    return true;
  })
  .catch(error => console.log(error));
