'use strict';
require('./setup');
if (!LIVE_TEST) require('./mocks/auth.nock');

// Create a temporary ISE instance as to not interface with global testing instance.
const tempIse = new ISE(ise.host, ise.username, ise.password);
describe('ISE Authentication:', () => {
  describe('Login:', () => {
    it('should login successfully', async () => {
      const login = await tempIse.login();
      login.should.contain.keys(['sessionId', 'csrfToken']);
    });
    it('should logout successfully', async () => {
      const logout = await tempIse.logout();
      logout.should.be.true;
    });
    it('should fail to login', async () => {
      const bad = new ISE(ise.host, 'badtest', 'badtest');
      bad
        .login()
        .should.eventually.be.rejectedWith(
          Error,
          /Authentication failed. Bad username or password./
        );
    });
  });
});
