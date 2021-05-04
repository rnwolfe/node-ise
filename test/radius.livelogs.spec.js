'use strict';
require('./setup');

const LOG_KEYS = ['liveAuthenId', 'authProtocol', 'status', 'callingStationId'];

const COUNTER_KEYS = [
  'misConfiguredSuppCount',
  'misConfiguredNasCount',
  'eapTimeoutCount',
  'radiusDropCount',
  'totalRAuthCount',
  'retryCount',
  'percentMisConfiguredSuppCount',
  'percentMisConfiguredNasCount',
  'percentEapTimeoutCount',
  'percentRadiusDropCount',
  'percentTotalRAuthCount',
  'percentRetryCount'
];
// Need a way to push auth entries to ISE to ensure these tests are consistent between instances.
// Difficult to expect certain data when testing environments are not controlled.
describe('RADIUS Live Logs:', () => {
  describe('Get live logs:', () => {
    it('should get 20 most recent live logs with expected attributes', async () => {
      const logs = await ise.getRadiusLiveLogs();
      expect(logs).to.be.an('array');
      // Removing specifics lengths until testing w/ a RADIUS client can be automated.
      // expect(logs).to.have.a.lengthOf(20);
      // These pass if given array is empty.
      logs.every(log => expect(log).to.have.include.keys(LOG_KEYS));
    });
    it('should get most recent logs (with filter) with expected attributes', async () => {
      const logs = await ise.getRadiusLiveLogs({ status: 'false' });
      expect(logs).to.be.an('array');
      // Removing specifics lengths until testing w/ a RADIUS client can be automated.
      // expect(logs).to.have.a.lengthOf.at.least(5);
      logs.every(log =>
        // This passes if the given array is empty.
        expect(log)
          .to.be.an('object')
          .to.have.include.keys(LOG_KEYS)
          .and.include({ status: 'false' })
      );
    });
  });
  describe('Get counters:', () => {
    it('should get live log counters', async () => {
      const counters = await ise.getRadiusLiveLogCounters();
      expect(counters)
        .to.be.an('object')
        .and.to.include.keys(COUNTER_KEYS);
    });
  });
});
