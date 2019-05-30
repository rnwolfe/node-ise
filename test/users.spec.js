'use strict';
require('./setup');
const fs = require('fs');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

describe('User:', () => {
  describe('Get users:', () => {
    it('should get all users (no pagination)', async () => {
      const users = await ise.getUsers();
      expect(users)
        .to.be.an('array')
        .with.lengthOf.at.least(2);
      expect(users[0])
        .to.be.an('object')
        .that.includes.keys(['userName', 'NoOfDevicesPerUser']);
    });
    it('should get all users (with pagination)', async () => {
      const users = await ise.getUsers({}, { pageSize: 1 });
      expect(users)
        .to.be.an('array')
        .with.a.lengthOf.at.least(2);
    });
    it('should get all users (with filter)', async () => {
      const users = await ise.getUsers({ userName: 'win10' });
      expect(users)
        .to.be.an('array')
        .with.a.lengthOf.at.least(1);
    });
    it('should get a single user', async () => {
      const users = await ise.getUser('host/win10-3.ngn.lab');
      expect(users)
        .to.be.an('object')
        .that.includes.keys(['userName', 'NoOfDevicesPerUser']);
    });
  });
});
