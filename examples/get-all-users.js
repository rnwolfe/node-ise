const ise = require('./setup');

ise
  .login()
  .then(() => ise.getUsers())
  .then((users) => console.dir(users))
  .then(() => ise.getUser('host/win10-3.ngn.lab'))
  .then((user) => console.dir(user))
  .then(() => ise.logout())
  .then(() => console.log('Successfully logged out!'))
  .catch((error) => console.dir(error));
