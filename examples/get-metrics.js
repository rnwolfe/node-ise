const ise = require('./setup');

ise
  .login()
  .then(() =>
    Promise.all([
      ise.getActiveEndpoints(),
      ise.getRejectedEndpoints(),
      ise.getAnomalousEndpoints(),
      ise.getByodEndpoints(),
      ise.getAuthenticatedGuests(),
      ise.getTotalEndpoints()
    ]).then(results => {
      return {
        activeEndpoints: results[0],
        rejectedEndpoints: results[1],
        anomalousEndpoints: results[2],
        byodEndpoints: results[3],
        authenticatedGuest: results[4],
        totalEndpoints: results[5]
      };
    })
  )
  .then(values => console.table(values));
