require('./setup');
const { expect } = require('chai');
const fs = require('fs');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

describe('Context Visibility: Endpoints:', () => {
  describe('Get endpoints:', () => {
    it('should get all endpoints (no pagination)', async () => {
      const endpoints = await ise.getEndpoints();
      expect(endpoints).to.be.an('array').with.lengthOf.at.least(20);
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
    it('should get endpoints (with pagination)', async () => {
      const endpoints = await ise.getEndpoints({}, { pageSize: 1 });
      expect(endpoints).to.be.an('array').with.a.lengthOf.at.least(1);
    });
    // The endpoint 11:00:00:00:00:01 needs to be manually created in the Identity Group Blacklist.
    it('should get all endpoints (with IdentityGroup filter)', async () => {
      const endpoints = await ise.getEndpoints({ IdentityGroup: 'Blacklist' });
      expect(endpoints).to.be.an('array').with.a.lengthOf.at.least(5);
      expect(endpoints[0])
        .to.be.an('object')
        .and.include({ IdentityGroup: 'Blacklist' });
      expect(endpoints[0].MACAddress).to.match(/00:00:00:00:00:0[1-5]/);
    });
    it('should get all endpoints (with EndPointPolicy filter)', async () => {
      const endpoints = await ise.getEndpoints({
        EndPointPolicy: 'Workstation'
      });
      expect(endpoints).to.be.an('array').with.a.lengthOf.at.least(5);
      expect(endpoints[0])
        .to.be.an('object')
        .and.include({ EndPointPolicy: 'Workstation' });
      expect(endpoints[0].MACAddress).to.match(/00:00:00:00:00:2[1-5]/);
    });
    it("should get a single endpoint's details", async () => {
      const endpoint = await ise.getEndpoint('00:00:00:00:00:01');
      expect(endpoint)
        .to.be.an('object')
        .that.includes.keys([
          'MACAddress',
          'ElapsedDays',
          'EndPointSource',
          'EndPointPolicy',
          'OUI'
        ])
        .and.include({ MACAddress: '00:00:00:00:00:01' });
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
