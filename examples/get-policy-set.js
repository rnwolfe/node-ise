const ISE = require('../');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

let policySet = {};
ise
  .iseLogin()
  .then(() => ise.getRadiusPolicySetByName('HRN1 Fabric Policy'))
  .then(policySet =>
    Promise.all([
      ise.getAuthenticationPolicy(policySet.id),
      ise.getAuthorizationPolicy(policySet.id)
    ])
  )
  .then(promises => {
    const authcPolicy = promises[0];
    const authzPolicy = promises[1];
    console.log('AUTHC POLICY');
    console.dir(authcPolicy);
    console.log('AUTHZ POLICY');
    console.dir(authzPolicy);
  })
  .catch(error => console.dir(error));
