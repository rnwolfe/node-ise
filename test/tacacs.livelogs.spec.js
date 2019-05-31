'use strict';
require('./setup');

const LOG_KEYS = ['ise_node', 'id', 'status', 'username'];

describe('TACACS Live Logs:', () => {
  describe('Get live logs:', () => {
    it('should get 20 most recent live logs with expected attributes', async () => {
      const logs = await ise.getTacacsLiveLogs();
      expect(logs).to.be.an('array');
      expect(logs).to.have.a.lengthOf(20);
      logs.every(log =>
        expect(log)
          .to.be.an('object')
          .to.have.include.keys(LOG_KEYS)
      );
    });
    it('should get most recent logs (with filter) with expected attributes', async () => {
      const logs = await ise.getTacacsLiveLogs({ shell_profile: 'Default Shell Profile' });
      expect(logs).to.be.an('array');
      expect(logs).to.have.a.lengthOf.at.least(5);
      logs.every(log =>
        expect(log)
          .to.be.an('object')
          .to.have.include.keys(LOG_KEYS)
          .and.include({ shell_profile: 'Default Shell Profile' })
      );
    });
  });
});
