require('./setup');
const { expect } = require('chai');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

describe('Endpoint actions:', () => {
  describe('Create endpoint:', () => {
    // Each test will create an endpoint, and it will be cleaned up
    // after each test for re-use on the next.
    const endpointMac = '10:00:00:00:00:01';
    afterEach(async () => ise.deleteEndpoint(endpointMac));

    it('should create an endpoint', async () => {
      const newEndpoint = await ise.createEndpoint(endpointMac);
      expect(newEndpoint).to.be.true;
      const endpoint = await ise.getEndpoint(endpointMac);
      expect(endpoint)
        .to.be.an('object')
        .and.include({ MACAddress: endpointMac });
    });
    it('should create an endpoint with a static endpoint profile', async () => {
      const endpointPolicy = 'Cisco-Device';
      const newEndpoint = await ise.createEndpoint(endpointMac, {
        policyName: endpointPolicy
      });
      expect(newEndpoint).to.be.true;
      const endpoint = await ise.getEndpoint(endpointMac);
      expect(endpoint)
        .to.be.an('object')
        .and.include({ MACAddress: endpointMac })
        .and.include({ EndPointPolicy: endpointPolicy });
    });
    it('should create an endpoint with a static identity group', async () => {
      const endpointGroup = 'Blacklist';
      const newEndpoint = await ise.createEndpoint(endpointMac, {
        identityGroup: endpointGroup
      });
      expect(newEndpoint).to.be.true;
      const endpoint = await ise.getEndpoint(endpointMac);
      expect(endpoint)
        .to.be.an('object')
        .and.include({ MACAddress: endpointMac })
        .and.include({ IdentityGroup: endpointGroup });
    });
  });
  describe('Delete endpoint:', () => {
    it('should delete an endpoint', async () => {
      const endpointMac = '10:00:00:00:00:01';
      const newEndpoint = await ise.createEndpoint(endpointMac);
      expect(newEndpoint).to.be.true;
      const deleteMac = await ise.deleteEndpoint(endpointMac);
      expect(deleteMac).to.be.true;
    });
  });
});
