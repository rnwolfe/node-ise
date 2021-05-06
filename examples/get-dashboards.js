const ise = require('./setup');

ise
  .login()
  .then(() => Promise.all([ise.getGenericDashboard()]))
  .then((values) => console.dir(values));
