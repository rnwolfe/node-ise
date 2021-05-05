require('./setup');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

describe('Applications:', () => {
  describe('Get applications:', () => {
    it('should get all applications (no pagination)', async () => {
      const apps = await ise.getApplications();
      expect(apps)
        .to.be.an('array')
        .with.lengthOf.at.least(0);
      // expect(apps[0])
      //   .to.be.an('object')
    });
    it('should get all applications (with pagination)', async () => {
      const apps = await ise.getApplications({}, { pageSize: 1 });
      expect(apps)
        .to.be.an('array')
        .with.a.lengthOf.at.least(0);
    });
    it('should get all applications (with filter)', async () => {
      const apps = await ise.getApplications({ type: 'VPNClient' });
      expect(apps)
        .to.be.an('array')
        .with.a.lengthOf.at.least(0);
    });
    // it('should get a single user', async () => {
    //   const app = await ise.getApplication('appname');
    //   expect(app)
    //     .to.be.an('object')
    // });
  });
});
