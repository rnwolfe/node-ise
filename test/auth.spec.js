'use strict';
require('./setup');

describe('ISE Authentication:', () => {
  describe('Login:', () => {
    it('should login successfully', done => {
      ise
        .login()
        .should.eventually.contain.keys(['sessionId', 'csrfToken'])
        .notify(done);
    });
    it('should logout successfully', done => {
      ise.logout().should.eventually.be.true.notify(done);
    });
  });
});
