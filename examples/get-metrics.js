const ise = require('./setup');

ise
  .login()
  .then(() =>
    Promise.all([
      ise.getActiveEndpoints(),
      ise.getRejectedEndpoints(),
      ise.getAnomalousEndpoints(),
      ise.getByodEndpoints(),
      ise.getAuthenticatedGuest()
    ])
  )
  .then((values) => console.dir(values));
