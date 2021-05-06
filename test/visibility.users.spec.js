require('./setup');
// if (!LIVE_TEST) require('./mocks/endpoints.nock');

const USER_KEYS = ['userName', 'NoOfDevicesPerUser'];

describe('Context Visibility: User:', () => {
  describe('Get users:', () => {
    it('should get all users (no pagination)', async () => {
      const users = await ise.getUsers();
      expect(users).to.be.an('array').with.lengthOf.at.least(5);
      expect(users[0]).to.be.an('object').that.includes.keys(USER_KEYS);
    });
    it('should get all users (with pagination)', async () => {
      const users = await ise.getUsers({}, { pageSize: 1 });
      expect(users).to.be.an('array').with.a.lengthOf.at.least(1);
    });
    it('should get all users (with filter)', async () => {
      const users = await ise.getUsers({ userName: 'Test' });
      expect(users).to.be.an('array').with.a.lengthOf.at.least(5);
    });
    it('should get a single user', async () => {
      const users = await ise.getUser('Test-User1');
      expect(users).to.be.an('object').that.includes.keys(USER_KEYS);
    });
  });
});
