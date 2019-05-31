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

describe('RADIUS Live Logs:', () => {
  describe('Get live logs:', () => {
    it('should get 20 most recent live logs with expected attributes', async () => {
      const logs = await ise.getRadiusLiveLogs();
      expect(logs).to.be.an('array');
      expect(logs).to.have.a.lengthOf(20);
      logs.every(log => expect(log).to.have.include.keys(LOG_KEYS));
    });
    it('should get most recent PEAP logs (with filter) with expected attributes', async () => {
      const logs = await ise.getRadiusLiveLogs({ authProtocol: 'PEAP (EAP-MSCHAPv2)' });
      expect(logs).to.be.an('array');
      expect(logs).to.have.a.lengthOf.at.least(5);
      logs.every(log =>
        expect(log)
          .to.be.an('object')
          .to.have.include.keys(LOG_KEYS)
          .and.include({ authProtocol: 'PEAP (EAP-MSCHAPv2)' })
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
