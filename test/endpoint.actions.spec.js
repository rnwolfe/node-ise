require('./setup');
const { expect } = require('chai');
const fs = require('fs');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

describe('Endpoint actions:', () => {
  describe('Create endpoint:', () => {
    it('should create an endpoint', async () => {
      const endpointMac = '10:00:00:00:00:01';
      const newEndpoint = await ise.createEndpoint(endpointMac);
      expect(newEndpoint).to.be.true;
      const endpoint = await ise.getEndpoint(endpointMac);
      expect(endpoint)
        .to.be.an('object')
        .and.include({ MACAddress: endpointMac });
    });
    // Staged for after implementation
    // it('should create an endpoint with a static endpoint profile', async () => {
    //   const endpointMac = '10:00:00:00:00:02';
    //   const endpointPolicy = 'Cisco-Device';
    //   const newEndpoint = await ise.createEndpoint(endpointMac, {
    //     policyName: endpointPolicy
    //   });
    //   const endpoint = await ise.getEndpoint(endpointMac);
    //   expect(endpoint)
    //     .to.be.an('object')
    //     .and.include({ MACAddress: endpointMac })
    //     .and.include({ EndPointPolicy: endpointPolicy });
    // });
    // it('should create an endpoint with a static identity group', async () => {
    //   const endpointMac = '10:00:00:00:00:03';
    //   const endpointGroup = 'Blacklist';
    //   const newEndpoint = await ise.createEndpoint(endpointMac, {
    //     identityGroup: endpointGroup
    //   });
    //   const endpoint = await ise.getEndpoint(endpointMac);
    //   expect(endpoint)
    //     .to.be.an('object')
    //     .and.include({ MACAddress: endpointMac })
    //     .and.include({ IdentityGroup: endpointGroup });
    // });
  });
  describe('Delete endpoint:', () => {
    it('should delete an endpoint', async () => {
      const endpointMac = '10:00:00:00:00:01';
      const deleteMac = await ise.deleteEndpoint(endpointMac);
      expect(deleteMac).to.be.true;
    });
  });
});
