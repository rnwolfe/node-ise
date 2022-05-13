const ise = require('./setup');

ise
  .login()
  .then(() => {
    console.log(`Logged in: ${ise.isLoggedIn}!`);
    console.log(`ISE is running version: ${ise.iseVersion}`);
    console.log(`ISE is running on: ${ise.host}`);
    console.log(`ISE session token: ${ise.sessionId}`);
    console.log(`ISE CSRF token: ${ise.csrfToken || 'N/A'}`);
  })
  .catch(error => console.log(error));
