'use strict';
require('./setup');

if (!LIVE_TEST) require('./mocks/dashboards.nock');

describe('ISE Metrics Data:', () => {
  it('should get active endpoints data', async () => {
    const data = await ise.getActiveEndpoints();
    expect(data).to.be.a('string');
  });
  it('should get rejected endpoint data', async () => {
    const data = await ise.getRejectedEndpoints();
    expect(data).to.be.a('string');
  });
  it('should get anomalous endpoint data', async () => {
    const data = await ise.getAnomalousEndpoints();
    expect(data).to.be.a('string');
  });
  it('should get byod endpoint data', async () => {
    const data = await ise.getByodEndpoints();
    expect(data).to.be.a('string');
  });
  it('should get authenticated guest data', async () => {
    const data = await ise.getAuthenticatedGuest();
    expect(data).to.be.a('string');
  });
});