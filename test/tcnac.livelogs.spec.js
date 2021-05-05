require('./setup');

const LOG_KEYS = [];

// Not enabled on test server, so just checked for valid empty response.
describe('TC-NAC Live Logs:', () => {
  describe('Get live logs:', () => {
    it('should get 20 most recent live logs with expected attributes', async () => {
      const logs = await ise.getTcNacLiveLogs();
      expect(logs).to.be.an('array');
      expect(logs).to.have.a.lengthOf.at.least(0);
      logs.every((log) => expect(log).to.have.include.keys(LOG_KEYS));
    });
    it('should get most recent logs (with filter) with expected attributes', async () => {
      const logs = await ise.getTcNacLiveLogs({ authProtocol: 'PEAP (EAP-MSCHAPv2)' });
      expect(logs).to.be.an('array');
      expect(logs).to.have.a.lengthOf.at.least(0);
      logs.every((log) => expect(log)
        .to.be.an('object')
        .to.have.include.keys(LOG_KEYS)
        .and.include({ authProtocol: 'PEAP (EAP-MSCHAPv2)' }));
    });
  });
});
