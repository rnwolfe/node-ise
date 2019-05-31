'use strict';
require('./setup');

describe('ISE Chart Data:', () => {
  it('should get device compliance data', async () => {
    const data = await ise.getDeviceComplianceChartData();
    expect(data).to.be.an('object');
  });
  it('should get endpoint group data', async () => {
    const data = await ise.getEndpointGroupChartData();
    expect(data)
      .to.be.an('object')
      .and.to.include.keys(['workstations', 'misc']);
  });
  it('should get endpoint policy data', async () => {
    const data = await ise.getEndpointPolicyChartData();
    expect(data).to.be.an('object');
  });
  it('should get identity group data', async () => {
    const data = await ise.getIdentityGroupChartData();
    expect(data).to.be.an('object');
  });
  it('should get network device data', async () => {
    const data = await ise.getNetworkDeviceChartData();
    expect(data).to.be.an('object');
  });
  it('should get location data', async () => {
    const data = await ise.getLocationChartData();
    expect(data).to.be.an('object');
  });
  it('should get endpoint profiler data', async () => {
    const data = await ise.getEndpointProfilerServerChartData();
    expect(data).to.be.an('object');
  });
  it('should get operating system data', async () => {
    const data = await ise.getOperatingSystemChartData();
    expect(data).to.be.an('object');
  });
  it('should get device type data', async () => {
    const data = await ise.getDeviceTypeChartData();
    expect(data).to.be.an('object');
  });
  it('should get application category data', async () => {
    const data = await ise.getApplicationCategoryChartData();
    expect(data).to.be.an('array');
  });
});
