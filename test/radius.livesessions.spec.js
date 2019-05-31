'use strict';
require('./setup');

const LOG_KEYS = ['liveAuthenId', 'authProtocol', 'status', 'callingStationId', 'server'];

describe('RADIUS Live Sessions:', () => {
  describe('Get live sessions:', () => {
    it('should get most recent live logs with expected attributes', async () => {
      const logs = await ise.getRadiusLiveSessions();
      expect(logs).to.be.an('array');
      expect(logs).to.have.a.lengthOf.at.least(2);
      logs.every(log => expect(log).to.have.include.keys(LOG_KEYS));
    });
    it('should get most recent logs (with filter) with expected attributes', async () => {
      const logs = await ise.getRadiusLiveSessions({ session_state_name: 2 });
      expect(logs).to.be.an('array');
      expect(logs).to.have.a.lengthOf.at.least(1);
      logs.every(log =>
        expect(log)
          .to.be.an('object')
          .to.have.include.keys(LOG_KEYS)
          .and.include({ session_state_name: 'Authenticated' })
      );
    });
  });
});
