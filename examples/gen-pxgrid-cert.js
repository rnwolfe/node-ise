const ise = require('./setup');

ise
  .login()
  .then(() =>
    ise.autoGenPxGridCert('another-app-auto-gen', 'My description', 'Pxgrid123')
  )
  .then((config) => console.log(config))
  .catch((error) => console.dir(error));
