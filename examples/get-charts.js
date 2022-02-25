const ise = require('./setup');

ise
  .login()
  .then(() =>
    Promise.all([
      ise.getDeviceComplianceChartData(),
      ise.getEndpointGroupChartData(),
      ise.getEndpointPolicyChartData(),
      ise.getIdentityGroupChartData(),
      ise.getNetworkDeviceChartData(),
      ise.getLocationChartData(),
      ise.getEndpointProfilerServerChartData(),
      ise.getOperatingSystemChartData(),
      ise.getDeviceTypeChartData()
    ])
  )
  .then(values => console.dir(values));
