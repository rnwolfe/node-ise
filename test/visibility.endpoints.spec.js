'use strict';
require('./setup');
const fs = require('fs');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

describe('Endpoints:', () => {
  describe('Get endpoints:', () => {
    it('should get all endpoints (no pagination)', async () => {
      const endpoints = await ise.getEndpoints();
      expect(endpoints)
        .to.be.an('array')
        .with.lengthOf.at.least(2);
      expect(endpoints[0])
        .to.be.an('object')
        .that.includes.keys([
          'MACAddress',
          'ElapsedDays',
          'EndPointSource',
          'EndPointPolicy',
          'OUI'
        ]);
    });
    it('should get all endpoints (with pagination)', async () => {
      const endpoints = await ise.getEndpoints({}, { pageSize: 1 });
      expect(endpoints)
        .to.be.an('array')
        .with.a.lengthOf.at.least(2);
    });
    it('should get all endpoints (with filter)', async () => {
      const endpoints = await ise.getEndpoints({ IdentityGroup: 'BlackBerry' });
      expect(endpoints)
        .to.be.an('array')
        .with.a.lengthOf.at.least(1);
    });
    it("should get a single endpoint's details", async () => {
      const endpoint = await ise.getEndpoint('11:00:00:00:00:01');
      expect(endpoint)
        .to.be.an('object')
        .that.includes.keys([
          'MACAddress',
          'ElapsedDays',
          'EndPointSource',
          'EndPointPolicy',
          'OUI'
        ]);
    });
  });
  describe('Export endpoints to CSV', () => {
    it('should export endpoints to a csv file', async () => {
      const file = await ise.endpointsToCsv();
      expect(fs.existsSync(file)).to.be.true;
      expect(fs.readFileSync(file).byteLength)
        .to.be.a('number')
        .that.is.at.least(200);
      fs.unlinkSync(file);
    });
  });
});
