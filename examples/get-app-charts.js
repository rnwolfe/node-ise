const ise = require('./setup');

ise
  .login()
  .then(() => ise.getApplicationCategoryChartData())
  .then(apps => console.dir(apps))
  .then(() => ise.logout())
  .catch(error => console.dir(error));
