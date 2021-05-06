const ise = require('./setup');

ise
  .login()
  .then(() => {
    console.log(
      'Logged in! ISE is running version',
      ise.iseVersion,
      ise.csrfToken
    );
  })
  .catch((error) => console.log(error));
