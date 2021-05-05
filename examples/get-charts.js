const ISE = require('..');

const ise = new ISE(process.env.ISE_HOST, process.env.ISE_USER, process.env.ISE_PASS);

ise
  .login()
  .then(() => Promise.all([
    ise.getDeviceComplianceChartData(),
    ise.getEndpointGroupChartData(),
    ise.getEndpointPolicyChartData(),
    ise.getIdentityGroupChartData(),
    ise.getNetworkDeviceChartData(),
    ise.getLocationChartData(),
    ise.getEndpointProfilerServerChartData(),
    ise.getOperatingSystemChartData(),
    ise.getDeviceTypeChartData(),
  ]))
  .then((values) => console.dir(values));
